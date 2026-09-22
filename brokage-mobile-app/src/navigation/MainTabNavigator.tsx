import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import { displayThreadUnread, sameId } from '../chat/threadUnread';
import { fetchThreads } from '../api/client';
import { useActiveChatThreadStore } from '../stores/activeChatThreadStore';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../theme/colors';
import { ChatsStackNavigatorWithMode } from './ChatsStackNavigator';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import type { MainTabParamList } from './types';

const Tab = createNativeBottomTabNavigator<MainTabParamList>();

/**
 * Tab icon descriptors. The native bar (UITabBarController on iOS,
 * BottomNavigationView on Android) renders native UIImage / Drawable,
 * NOT React views — so Lucide / react-native-svg can't be used here.
 *
 * - iOS: SF Symbol name, rendered by the system at the standard 25pt
 *   tab-bar icon size. The `satisfies SFSymbol` keeps these names
 *   compile-time-checked against `sf-symbols-typescript`'s catalog so
 *   typos don't silently render an empty image at runtime.
 * - Android: drawable resource name (vector XML under
 *   `android/app/src/main/res/drawable/tab_*.xml`). The library hands
 *   this to BottomNavigationView's icon slot; Material tints it with
 *   the active/inactive tint colors automatically.
 *
 * Sizing is system-controlled — do NOT wrap these in custom sizing
 * logic or override icon width/height. iOS uses 25pt and Android uses
 * 24dp by design; mixing in custom values is what produces inconsistent
 * tab-bar heights across devices.
 */
type IconSource = { sfSymbol: SFSymbol } | ImageSourcePropType;

const groupChatsIcon: IconSource = Platform.select({
  ios: { sfSymbol: 'person.3.fill' satisfies SFSymbol },
  default: { uri: 'tab_group_chats' },
});

const chatsIcon: IconSource = Platform.select({
  ios: { sfSymbol: 'message.fill' satisfies SFSymbol },
  default: { uri: 'tab_chats' },
});

const profileIcon: IconSource = Platform.select({
  ios: { sfSymbol: 'person.crop.circle.fill' satisfies SFSymbol },
  default: { uri: 'tab_profile' },
});

const formatBadge = (n: number): string | undefined =>
  n > 0 ? (n > 99 ? '99+' : String(n)) : undefined;

export function MainTabNavigator() {
  const user = useAuthStore(s => s.user);
  const activeThreadId = useActiveChatThreadStore(s => s.activeThreadId);
  /**
   * Source of truth for unread badges. `subscribeChatRealtimeSync`
   * (AppProviders) writes every server `thread:update` push into this
   * cache, so badges re-render without polling.
   */
  const { data: threads = [] } = useQuery({
    queryKey: ['threads', user?.id],
    queryFn: () => fetchThreads(user!),
    enabled: !!user,
  });

  /**
   * Partition unread by thread type so the two tab badges are mutually
   * exclusive: Group Chat owns group unread, Chats owns direct unread.
   * The actively-viewed thread is masked (defence-in-depth — the
   * server's `thread:join` mark-read should already have zeroed it).
   */
  const { directUnread, groupUnread } = threads.reduce(
    (acc, t) => {
      if (activeThreadId && sameId(t.id, activeThreadId)) {
        return acc;
      }
      const n = displayThreadUnread(t.unreadCount);
      if (n === 0) {
        return acc;
      }
      if (t.type === 'group') {
        acc.groupUnread += n;
      } else {
        acc.directUnread += n;
      }
      return acc;
    },
    { directUnread: 0, groupUnread: 0 },
  );

  /**
   * All navigator-level props below come straight from the library's
   * TabView API surface (see node_modules/react-native-bottom-tabs/...
   * /TabView.d.ts). We deliberately do NOT set:
   *
   *   - Any per-screen `tabBarStyle` for hiding the bar — there is no
   *     such API. ChatThread hides the bar by being pushed above this
   *     navigator from MainStackNavigator (sibling, not child).
   *   - Custom height / paddingBottom — bar height is system-defined
   *     (iOS: ~49pt + safe area; Android: 80dp). Overriding either is
   *     what produced cross-OEM inconsistency on the old JS bar.
   *   - Custom press feedback — the OS provides UIControl highlight on
   *     iOS and Material ripple on Android. `rippleColor` only tints
   *     the Android ripple to brand.
   */
  return (
    <Tab.Navigator
      initialRouteName="GroupChatsTab"
      // Labels: show by default — this is the recommended pattern in both
      // Apple HIG and Material 3 guidance (icon + label improves discoverability
      // and accessibility). The native widget will use each screen's `title`
      // as the visible label.
      labeled
      hapticFeedbackEnabled
      tabBarActiveTintColor={colors.primary}
      tabBarInactiveTintColor={colors.textMuted}
      tabBarStyle={{ backgroundColor: colors.bottomBar }}
      // Android-only: M3 BottomNavigationView shows a pill behind the
      // selected icon. Tint it to the app's primary-soft surface so it
      // reads as part of our palette instead of the default M3 purple.
      activeIndicatorColor={colors.primarySoft}
      // Android-only: tap ripple tint.
      rippleColor={colors.washPrimary}>
      <Tab.Screen
        name="GroupChatsTab"
        options={{
          title: 'Group Chat',
          tabBarIcon: () => groupChatsIcon,
          tabBarBadge: formatBadge(groupUnread),
          // Android-only — iOS badge color is system-controlled (Apple
          // uses systemRed by design and does not expose an override).
          tabBarBadgeBackgroundColor: colors.primary,
          tabBarBadgeTextColor: colors.onPrimary,
        }}>
        {() => <ChatsStackNavigatorWithMode mode="group" />}
      </Tab.Screen>
      <Tab.Screen
        name="ChatsTab"
        options={{
          title: 'Views',
          tabBarIcon: () => chatsIcon,
          tabBarBadge: formatBadge(directUnread),
          tabBarBadgeBackgroundColor: colors.primary,
          tabBarBadgeTextColor: colors.onPrimary,
        }}>
        {() => <ChatsStackNavigatorWithMode mode="all" />}
      </Tab.Screen>
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: 'Profile',
          tabBarIcon: () => profileIcon,
        }}
      />
    </Tab.Navigator>
  );
}
