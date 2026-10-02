import { CommonActions, StackActions } from '@react-navigation/native';
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

/** Community search bar → the Display broker-cards results grid (lives on the parent MainStack, same reasoning as ChatThread above). */
export function navigateToDisplaySearchResults(
  navigation: NavigationProp<ParamListBase>,
  params: MainStackParamList['DisplaySearchResults'],
): void {
  navigation.dispatch(
    CommonActions.navigate({
      name: 'DisplaySearchResults',
      params,
    }),
  );
}

/** A broker's own "My Display" or someone else's — same MainStack hoist reasoning. */
export function navigateToMyDisplay(navigation: NavigationProp<ParamListBase>): void {
  navigation.dispatch(CommonActions.navigate({ name: 'MyDisplay' }));
}

export function navigateToUserDisplay(
  navigation: NavigationProp<ParamListBase>,
  params: MainStackParamList['UserDisplay'],
): void {
  navigation.dispatch(
    CommonActions.navigate({
      name: 'UserDisplay',
      params,
    }),
  );
}

/**
 * From a broker search result: opens their Display, but pushes their
 * Profile onto the stack first (not shown) so the back button follows
 * "Display → their Profile → back to search", matching how opening a
 * Display from a Profile page already behaves everywhere else in the
 * app, instead of jumping straight back to the search results.
 */
export function navigateToUserDisplayFromSearch(
  navigation: NavigationProp<ParamListBase>,
  params: MainStackParamList['UserDisplay'],
): void {
  navigation.dispatch(
    StackActions.push('UserProfile', { userId: params.userId, displayName: params.displayName }),
  );
  navigation.dispatch(StackActions.push('UserDisplay', params));
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

/** Personal contacts list / add-contact form (hoisted on MainStack like Settings). */
export function navigateToContacts(navigation: NavigationProp<ParamListBase>): void {
  navigation.dispatch(CommonActions.navigate({ name: 'Contacts' }));
}
