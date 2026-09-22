import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAppHydration } from '../hooks/useAppHydration';
import { useAuthStore } from '../stores/authStore';
import { APP_NAME } from '../config/appConfig';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { AuthNavigator } from './AuthNavigator';
import { MainStackNavigator } from './MainStackNavigator';
import { AccountDisabledScreen } from '../screens/auth/AccountDisabledScreen';
import { useForcedLogoutStore } from '../stores/forcedLogoutStore';
import type { RootStackParamList } from './types';
import { useThemedStyles } from '../hooks/useThemedStyles';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const styles = useThemedStyles(buildStyles);
  const user = useAuthStore(s => s.user);
  const ready = useAppHydration();
  const forcedLogoutReason = useForcedLogoutStore(s => s.reason);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <Text style={styles.bootMark}>{APP_NAME}</Text>
        <ActivityIndicator
          style={styles.bootSpinner}
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  if (!user && forcedLogoutReason) {
    return <AccountDisabledScreen />;
  }

  return (
    <Stack.Navigator
      key={user ? 'app' : 'auth'}
      screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainStackNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}

const buildStyles = () => StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 20,
  },
  bootMark: {
    ...typography.displayMedium,
    color: colors.brandWordmark,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  bootSpinner: { marginTop: 4 },
});
