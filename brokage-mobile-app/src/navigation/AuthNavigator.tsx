import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { VerifyOtpScreen } from '../screens/auth/VerifyOtpScreen';
import { colors } from '../theme/colors';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const authHeader = {
  headerStyle: { backgroundColor: colors.topBar },
  headerTintColor: colors.primary,
  headerShadowVisible: false,
  headerTitleStyle: {
    fontWeight: '600' as const,
    fontSize: 17,
  },
  contentStyle: { backgroundColor: colors.background },
} as const;

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          ...authHeader,
          headerShown: true,
          title: 'Create account',
          headerBackTitle: 'Log in',
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          ...authHeader,
          headerShown: true,
          title: 'Reset password',
          headerBackTitle: 'Log in',
        }}
      />
      <Stack.Screen
        name="VerifyOtp"
        component={VerifyOtpScreen}
        options={{
          ...authHeader,
          headerShown: true,
          title: 'Verify',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}
