import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ChatsListScreen } from '../screens/chat/ChatsListScreen';
import { colors } from '../theme/colors';
import type { ChatsStackParamList } from './types';

const Stack = createNativeStackNavigator<ChatsStackParamList>();

/**
 * Inner stack for a single chats tab. Only hosts ChatList — ChatThread
 * is owned by the parent `MainStackNavigator` so opening a conversation
 * hides the native bottom tab bar (the bar can't be hidden in-place).
 */
export function ChatsStackNavigator() {
  return <ChatsStackNavigatorWithMode mode="all" />;
}

export function ChatsStackNavigatorWithMode({
  mode,
}: {
  mode: 'all' | 'group';
}) {
  const isGroupMode = mode === 'group';
  const listTitle = isGroupMode ? 'Group Chat' : 'Chats';
  const listSubtitle = isGroupMode
    ? 'Community space discussions with members.'
    : 'Community space and private notes with hosts about listings.';

  return (
    <Stack.Navigator
      initialRouteName="ChatList"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        // No `freezeOnBlur` here — when MainStack pushes ChatThread, the
        // whole Tabs screen is already detached by react-native-screens.
        // Stacking a JS-side freeze on top causes the FlatList inside
        // ChatList to render into a stale tree that doesn't repaint when
        // the screen reattaches (the "black list on return" bug). The
        // perf cost of *not* freezing this single-screen stack is
        // negligible — there's only one screen in it.
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen
        name="ChatList"
        component={ChatsListScreen}
        initialParams={{
          mode,
          title: listTitle,
          subtitle: listSubtitle,
        }}
        options={{ title: listTitle, headerShown: false }}
      />
    </Stack.Navigator>
  );
}
