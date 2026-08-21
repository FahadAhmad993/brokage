import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer } from '@react-navigation/native';
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
} from '@tanstack/react-query';
import React, { useEffect, useMemo } from 'react';
import { StatusBar } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { connectChatSocket, disconnectChatSocket } from '../api/client';
import { subscribeChatRealtimeSync } from '../chat/chatRealtimeSync';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppAlertProvider } from '../components/appAlert';
import { logger } from '../lib/logger';
import { linking } from '../navigation/linking';
import { RootNavigator } from '../navigation/RootNavigator';
import { useAuthStore } from '../stores/authStore';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useMyListingsStore } from '../stores/myListingsStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { navigationTheme } from '../theme/navigationTheme';

export function AppProviders() {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
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

  const hydrateAuth = useAuthStore(s => s.hydrate);
  const userId = useAuthStore(s => s.user?.id);
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

  return (
    <QueryClientProvider client={queryClient}>
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
              barStyle="light-content"
              backgroundColor="transparent"
              translucent
            />
            <NavigationContainer
              theme={navigationTheme}
              linking={linking}
              onUnhandledAction={action => {
                logger.warn('Unhandled navigation action', action);
              }}>
              <RootNavigator />
            </NavigationContainer>
          </AppAlertProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
