import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppAlert } from '../../components/appAlert';
import { AuthDecor } from '../../components/auth/AuthDecor';
import { BrokageLogo } from '../../components/BrokageLogo';
import { GradientButton } from '../../components/GradientButton';
import { TextField } from '../../components/TextField';
import { ScreenScroll } from '../../components/ScreenScroll';
import { errorMessage, mockLogin } from '../../api/client';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { saveCredentials } from '../../stores/credentialsStore';
import { authScreenStyles } from '../../theme/authScreenStyles';
import { colors } from '../../theme/colors';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const alert = useAppAlert();
  const navigation = useNavigation<Nav>();
  const setUser = useAuthStore(s => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () => mockLogin(email.trim(), password),
    onSuccess: async user => {
      await saveCredentials(user.id, password);
      await setUser(user);
    },
    onError: error => {
      alert({
        title: 'Login failed',
        message: errorMessage(error, 'Check your connection and try again.'),
      });
    },
  });

  return (
    <ScreenScroll>
      <View style={styles.decorWrap}>
        <AuthDecor />
        <View style={styles.main}>
          <View style={styles.brand}>
            <View style={authScreenStyles.logoMark}>
              <BrokageLogo width={28} height={34} />
            </View>
            <Text style={styles.appName}>Brokage</Text>
            <Text style={styles.tagline}>
              Return to the comfort of your curated home.
            </Text>
          </View>

          <View style={[authScreenStyles.card, styles.cardFields]}>
            <TextField
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <View style={styles.passwordBlock}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.linkSmall}>Forgot?</Text>
                </Pressable>
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                style={styles.passwordInput}
              />
            </View>

            <GradientButton
              label="Login to Account"
              loading={login.isPending}
              onPress={() => login.mutate()}
              style={styles.cta}
            />

            {/*
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              style={styles.socialBtn}
              onPress={() =>
                alert({
                  title: 'Google',
                  message:
                    'Sign in with Google will be available in a future update.',
                })
              }>
              <Text style={styles.socialLabel}>Google</Text>
            </Pressable>
            <Pressable
              style={styles.socialBtn}
              onPress={() =>
                alert({
                  title: 'Apple',
                  message:
                    'Sign in with Apple will be available in a future update.',
                })
              }>
              <Text style={styles.socialLabel}>Apple</Text>
            </Pressable>
          </View>
          */}
          </View>

          <View style={styles.footer}>
            <View style={styles.registerRow}>
              <Text style={styles.muted}>{"Don't have an account yet? "}</Text>
              <Pressable onPress={() => navigation.navigate('Register')}>
                <Text style={styles.link}>Create an account</Text>
              </Pressable>
            </View>
            <View style={styles.legalRow}>
              <Text style={styles.legal}>PRIVACY POLICY</Text>
              <Text style={styles.legal}>TERMS OF SERVICE</Text>
              <Text style={styles.legal}>SUPPORT</Text>
            </View>
          </View>
        </View>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  decorWrap: { position: 'relative', flexGrow: 1 },
  main: { paddingTop: spacing.lg, gap: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.sm },
  appName: {
    ...typography.headline,
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.md,
    color: colors.textPrimary,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cardFields: { gap: spacing.lg },
  passwordBlock: { width: '100%', gap: spacing.sm },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  linkSmall: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  cta: { marginTop: spacing.sm },
  footer: { gap: spacing.xl, alignItems: 'center' },
  registerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  muted: { ...typography.bodySmall, color: colors.textSecondary },
  link: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary,
  },
  legalRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legal: {
    ...typography.overline,
    color: colors.textMuted,
  },
  passwordInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderRadius: layout.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: layout.minTouchTarget,
    color: colors.textPrimary,
  },
});
