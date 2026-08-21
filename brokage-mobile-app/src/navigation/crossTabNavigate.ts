import { CommonActions } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { HomeStackParamList, MainStackParamList } from './types';

/**
 * Cross-tab navigation is unreliable on some Android builds when using
 * `navigation.navigate('OtherTab', …)` from a nested stack. Dispatching
 * `CommonActions.navigate` targets the parent router explicitly.
 *
 * ChatThread now lives on the *parent* MainStack (sibling of the tab
 * navigator) rather than inside ChatsTab. This is the only way to hide
 * the native bottom-tab bar for a conversation — there's no per-screen
 * hide API on the native tab navigator.
 */
export function navigateToChatsThread(
  navigation: NavigationProp<ParamListBase>,
  params: MainStackParamList['ChatThread'],
): void {
  navigation.dispatch(
    CommonActions.navigate({
      name: 'ChatThread',
      params,
    }),
  );
}

export function navigateToHomeStackScreen<
  S extends keyof HomeStackParamList,
>(
  navigation: NavigationProp<ParamListBase>,
  screen: S,
  params?: HomeStackParamList[S],
): void {
  navigation.dispatch(
    CommonActions.navigate({
      name: 'HomeTab',
      params: params !== undefined ? { screen, params } : { screen },
    }),
  );
}

export function navigateToProfileHome(
  navigation: NavigationProp<ParamListBase>,
): void {
  navigation.dispatch(
    CommonActions.navigate({
      name: 'ProfileTab',
      params: { screen: 'ProfileHome' },
    }),
  );
}

/**
 * Profile sub-screens (EditProfile, ChangePassword, Settings) live on
 * the parent MainStack now — so the bottom tab bar disappears while
 * they're open and the soft keyboard can't push it up. Dispatching by
 * route name targets MainStack regardless of how deep the caller is.
 */
export function navigateToEditProfile(
  navigation: NavigationProp<ParamListBase>,
): void {
  navigation.dispatch(CommonActions.navigate({ name: 'EditProfile' }));
}

export function navigateToChangePassword(
  navigation: NavigationProp<ParamListBase>,
): void {
  navigation.dispatch(CommonActions.navigate({ name: 'ChangePassword' }));
}

export function navigateToSettings(
  navigation: NavigationProp<ParamListBase>,
): void {
  navigation.dispatch(CommonActions.navigate({ name: 'Settings' }));
}
