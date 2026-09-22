import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer } from '@react-navigation/native';
import {
  QueryClient,
  onlineManager,
  type Query,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import React, { useEffect, useMemo } from 'react';
import { StatusBar } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { connectChatSocket, disconnectChatSocket, sendChatMessage } from '../api/client';
import { subscribeChatRealtimeSync } from '../chat/chatRealtimeSync';
import {
  removeOutboxMessage,
  startOutboxAutoFlush,
  stopOutboxAutoFlush,
  type OutboxMessage,
} from '../chat/offlineOutbox';
import { mergeIncomingIntoMessagesInfinite } from '../chat/messagePages';
import type { MessagesPageResult } from '../chat/messagePages';
import type { InfiniteData } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppAlertProvider } from '../components/appAlert';
import { logger } from '../lib/logger';
import { linking } from '../navigation/linking';
import { RootNavigator } from '../navigation/RootNavigator';
import { useAuthStore } from '../stores/authStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useMyListingsStore } from '../stores/myListingsStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { getNavigationTheme } from '../theme/navigationTheme';
import { colors } from '../theme/colors';

/**
 * Only these query "families" are worth writing to disk. Skipping the rest
 * (e.g. one-off search results, image-upload signatures) keeps the persisted
 * blob small and avoids stale non-chat data resurrecting on cold start.
 * `threads`, `messages`, and `communityPosts` are exactly what WhatsApp-style
 * "open the app offline and still see your last conversation" needs.
 */
const PERSISTED_QUERY_KEY_PREFIXES = ['threads', 'messages', 'community-posts'];

function shouldPersistQuery(query: Query): boolean {
  const key = query.queryKey[0];
  return typeof key === 'string' && PERSISTED_QUERY_KEY_PREFIXES.includes(key);
}

export function AppProviders() {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 24 * 60 * 60 * 1000, // keep persisted chat data around for a full day offline
            retry: 2,
            refetchOnWindowFocus: false,
            networkMode: 'online',
          },
          mutations: {
            retry: 0,
          },
        },
      }),
    [],
  );

  /** AsyncStorage-backed cache persister — this is what makes the inbox and
   *  community feed show their last-known content immediately on a cold
   *  start with no connection, the same way WhatsApp opens straight into
   *  your last synced chats instead of a blank screen. */
  const persister = useMemo(
    () =>
      createAsyncStoragePersister({
        storage: AsyncStorage,
        key: 'brokage-query-cache',
        throttleTime: 1000,
      }),
    [],
  );

  const hydrateAuth = useAuthStore(s => s.hydrate);
  const user = useAuthStore(s => s.user);
  const userId = user?.id;
  const hydratePrefs = usePreferencesStore(s => s.hydrate);
  const hydrateFavorites = useFavoritesStore(s => s.hydrate);
  const hydrateMyListings = useMyListingsStore(s => s.hydrate);

  useEffect(() => {
    Promise.all([
      hydrateAuth(),
      hydratePrefs(),
      hydrateFavorites(),
      hydrateMyListings(),
    ]).catch(err => {
      logger.error('Hydration failed', err);
    });
  }, [hydrateAuth, hydrateFavorites, hydrateMyListings, hydratePrefs]);

  /** TanStack Query `networkMode: 'online'` — align with cellular/Wi‑Fi (RN has no `window.ononline`). */
  useEffect(() => {
    onlineManager.setEventListener(setOnline => {
      void NetInfo.fetch().then(state =>
        setOnline(Boolean(state.isConnected)),
      );
      return NetInfo.addEventListener(state =>
        setOnline(Boolean(state.isConnected)),
      );
    });
  }, []);

  useEffect(() => {
    if (!userId) {
      void disconnectChatSocket();
      return;
    }
    void connectChatSocket();
    return () => {
      // Tear down on user change / unmount so a fresh login authenticates with the new token.
      void disconnectChatSocket();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    return subscribeChatRealtimeSync(queryClient, userId);
  }, [queryClient, userId]);

  /**
   * App-wide offline outbox: the moment `NetInfo` reports the device back
   * online, flush every thread's pending queue (oldest message first). This
   * is what makes "typed while on the subway with no signal" messages send
   * themselves automatically the moment the connection returns — the same
   * single-tick → double-tick transition WhatsApp shows, with no user
   * action needed and no message ever silently lost.
   */
  useEffect(() => {
    if (!user) {
      stopOutboxAutoFlush();
      return;
    }
    startOutboxAutoFlush(
      (item: OutboxMessage) =>
        sendChatMessage(
          item.threadId,
          user,
          item.body,
          item.clientId,
          item.locationContext,
          item.imageUrl,
          undefined,
          item.replyToCommunityMessage,
        ),
      {
        onSent: (item, message) => {
          queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
            ['messages', item.threadId, user.id],
            prev => mergeIncomingIntoMessagesInfinite(prev, { ...message, status: 'sent' }),
          );
        },
        onFailed: (item, err) => {
          logger.warn('offlineOutbox: message permanently failed', item.clientId, err);
          queryClient.setQueryData<InfiniteData<MessagesPageResult> | undefined>(
            ['messages', item.threadId, user.id],
            prev =>
              prev && {
                ...prev,
                pages: prev.pages.map(page => ({
                  ...page,
                  items: page.items.map(m =>
                    m.clientId === item.clientId ? { ...m, status: 'failed' as const } : m,
                  ),
                })),
              },
          );
          void removeOutboxMessage(item.threadId, item.clientId);
        },
      },
    );
    return () => stopOutboxAutoFlush();
  }, [queryClient, user]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}>
      <SafeAreaProvider>
        {/* `KeyboardProvider` installs native keyboard listeners that drive
           the library's `KeyboardAvoidingView`, `KeyboardStickyView`,
           `KeyboardAwareScrollView`, and reanimated keyboard progress.
           Required for any consumer of `react-native-keyboard-controller`
           further down the tree.

           `statusBarTranslucent` + `navigationBarTranslucent` are MANDATORY
           when running in Android edge-to-edge mode (which we enable via
           `edgeToEdgeEnabled=true` in gradle.properties). Without them
           the native module computes focused-input positions against a
           non-translucent bar layout, so the keyboard offset is short by
           the gesture-bar inset and the focused TextInput stays hidden
           behind the keyboard. iOS ignores both flags (no-op). */}
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <AppAlertProvider>
            {/* Status bar is transparent on both platforms now that Android
               edge-to-edge is enabled (`edgeToEdgeEnabled=true` in
               gradle.properties). The app canvas extends behind the bar
               and SafeAreaView edges=['top'] reserves the inset. Light
               foreground = white status icons over our dark surface. */}
            <StatusBar
              barStyle={colors.isDark ? 'light-content' : 'dark-content'}
              backgroundColor="transparent"
              translucent
            />
            <NavigationContainer
              theme={getNavigationTheme()}
              linking={linking}
              onUnhandledAction={action => {
                logger.warn('Unhandled navigation action', action);
              }}>
              <RootNavigator />
            </NavigationContainer>
          </AppAlertProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
