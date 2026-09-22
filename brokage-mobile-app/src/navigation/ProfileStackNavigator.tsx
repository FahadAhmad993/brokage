import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { colors } from '../theme/colors';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/**
 * Profile tab now hosts only the landing menu. EditProfile,
 * ChangePassword, and Settings live on the parent MainStack so they hide
 * the native bottom tab bar when open — without that, the bar rides up
 * with the soft keyboard on Android `adjustResize`.
 */
export function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="ProfileHome"
      screenOptions={{
        headerStyle: { backgroundColor: colors.topBar },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ title: 'Profile', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
