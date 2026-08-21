import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppAlert } from '../../components/appAlert';
import { AuthDecor } from '../../components/auth/AuthDecor';
import { GradientButton } from '../../components/GradientButton';
import { TextField } from '../../components/TextField';
import { ScreenScroll } from '../../components/ScreenScroll';
import { errorMessage, mockRegister } from '../../api/client';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { saveCredentials } from '../../stores/credentialsStore';
import { authScreenStyles } from '../../theme/authScreenStyles';
import { colors } from '../../theme/colors';
import { screenStyles } from '../../theme/screenStyles';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const alert = useAppAlert();
  const navigation = useNavigation<Nav>();
  const setUser = useAuthStore(s => s.setUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const register = useMutation({
    mutationFn: () => mockRegister(email.trim(), password, name),
    onSuccess: async user => {
      await saveCredentials(user.id, password);
      await setUser(user);
    },
    onError: error => {
      alert({
        title: 'Sign up failed',
        message: errorMessage(error, 'Try again in a moment.'),
      });
    },
  });

  return (
    <ScreenScroll>
      <View style={styles.decorWrap}>
        <AuthDecor />
        <View style={styles.inner}>
          <View style={authScreenStyles.header}>
            <Text style={screenStyles.sectionOverline}>New account</Text>
            <Text style={authScreenStyles.title}>Create your account</Text>
            <Text style={authScreenStyles.sub}>
              You will join Brokage Commons automatically for community chat.
            </Text>
          </View>

          <View style={authScreenStyles.card}>
            <TextField label="Full name" value={name} onChangeText={setName} />
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <GradientButton
              label="Create account"
              loading={register.isPending}
              onPress={() => register.mutate()}
            />
          </View>

          <Pressable
            style={styles.footerLink}
            onPress={() => navigation.navigate('Login')}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in">
            <Text style={styles.footerLinkText}>
              Already have an account? Sign in
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  decorWrap: { position: 'relative', flexGrow: 1 },
  inner: { paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
  footerLink: { alignItems: 'center', paddingVertical: spacing.md, minHeight: 44, justifyContent: 'center' },
  footerLinkText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
});
