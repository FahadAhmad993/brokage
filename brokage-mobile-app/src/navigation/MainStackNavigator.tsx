import { HeaderBackButton } from '@react-navigation/elements';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatThreadScreen } from '../screens/chat/ChatThreadScreen';
import { BlockedUsersScreen } from '../screens/profile/BlockedUsersScreen';
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { SettingsScreen } from '../screens/profile/SettingsScreen';
import { UserProfileScreen } from '../screens/profile/UserProfileScreen';
import { colors } from '../theme/colors';
import { MainTabNavigator } from './MainTabNavigator';
import type { MainStackParamList } from './types';
import { CreateCommunityPostScreen } from '../screens/community/CreateCommunityPostScreen';
import { CommunityPostDetailsScreen } from '../screens/community/CommunityPostDetailsScreen';
const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * Header back affordance for ChatThread. The stack always has `Tabs`
 * underneath so `goBack` is safe, but we explicit-check before calling it
 * so a deep-link landing directly on a thread (no history) doesn't blow
 * up with "GO_BACK was not handled".
 */
function ChatThreadHeaderLeft({
  nav,
  props,
}: {
  nav: NativeStackNavigationProp<MainStackParamList>;
  props: React.ComponentProps<typeof HeaderBackButton>;
}) {
  return (
    <HeaderBackButton
      {...props}
      onPress={() => {
        if (nav.canGoBack()) {
          nav.goBack();
        } else {
          // Deep-link landed on ChatThread with no history; fall back to
          // the tab nav so the user isn't stranded.
          nav.replace('Tabs', {
            screen: 'GroupChatsTab',
            params: { screen: 'ChatList' },
          });
        }
      }}
    />
  );
}

/**
 * Tabs screen component. Wraps the native bottom-tab navigator with an
 * Android-only backdrop strip that paints the gesture-pill area
 * (`insets.bottom`) in the tab-bar's surface color.
 *
 * Why: with `edgeToEdgeEnabled=true`, the app draws behind the system
 * gesture bar. The `BottomNavigationView` from `react-native-bottom-tabs`
 * doesn't extend its background into that area, so the underlying wrapper
 * shows through. If the wrapper is the canvas color (`colors.background`)
 * the gesture strip reads as a darker band beneath the tab bar.
 *
 * Setting the wrapper itself to `colors.surface` fixes the band but
 * makes tab transitions flicker — each screen inside the tabs paints
 * its own `colors.background`, so the brief mount/unmount of a screen
 * during tab switch reveals the surface color underneath.
 *
 * The two-layer fix: keep the wrapper canvas-colored (matches all
 * screens, no flicker) AND add an absolutely-positioned strip exactly
 * the height of the gesture inset, painted in surface color. The strip
 * sits behind the tab bar (lower z in the View tree) so it only shows
 * in the gesture area beneath the bar.
 */
function TabsHost() {
  const insets = useSafeAreaInsets();
  return (
    <View style={tabsHostStyles.host}>
      {Platform.OS === 'android' && insets.bottom > 0 ? (
        <View
          pointerEvents="none"
          style={[
            tabsHostStyles.gestureBackdrop,
            { height: insets.bottom, backgroundColor: colors.surface },
          ]}
        />
      ) : null}
      <MainTabNavigator />
    </View>
  );
}

const tabsHostStyles = StyleSheet.create({
  host: { flex: 1, backgroundColor: colors.background },
  gestureBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});



/**
 * Wraps the bottom-tab navigator and hosts ChatThread as a *sibling* of
 * Tabs (pushed on top). The native bottom-tab bar from
 * `react-native-bottom-tabs` (UITabBarController / BottomNavigationView)
 * does not expose a `tabBarHideOnKeyboard` or per-route
 * `tabBarStyle: { display: 'none' }` hook, so a screen that should hide
 * the bar has to live above the tab nav in the navigation tree — not
 * inside it. This mirrors how Telegram / Bluesky / WhatsApp lay out
 * their chat threads.
 *
 * Side-effect of this structure: the composer in ChatThread no longer
 * has to fight a visible tab bar when the keyboard opens, and the
 * `KeyboardAvoidingView` (from `react-native-keyboard-controller`) can
 * lift the input straight against the keyboard top with no offset math.
 */
export function MainStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Tabs"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen
        name="Tabs"
        component={TabsHost}
        options={{ headerShown: false }}
      />
      <Stack.Screen
  name="CreateCommunityPost"
  component={CreateCommunityPostScreen}
/>
<Stack.Screen
  name="CommunityPostDetails"
  component={CommunityPostDetailsScreen}
/>
      <Stack.Screen
        name="ChatThread"
        component={ChatThreadScreen}
        options={({ route, navigation }) => {
          const nav =
            navigation as NativeStackNavigationProp<MainStackParamList>;
          return {
            title: route.params.title,
            headerShown: true,
            headerShadowVisible: false,
            headerTitleAlign: 'center',
            // Always hide the platform back arrow — ChatThreadScreen
            // renders its own custom title and we want a single source
            // of truth for the left affordance.
            headerBackVisible: false,
            // eslint-disable-next-line react/no-unstable-nested-components
            headerLeft: props => (
              <ChatThreadHeaderLeft nav={nav} props={props} />
            ),
          };
        }}
      />
      {/* Profile sub-screens hoisted from ProfileStack so the bottom tab
         bar disappears while a form is open — see ProfileStackNavigator
         and types.MainStackParamList for the rationale. */}
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerTitle: '' }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ headerTitle: '' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerTitle: '' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerTitle: '' }}
      />
      <Stack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={{ headerTitle: '' }}
      />
    </Stack.Navigator>
  );
}
