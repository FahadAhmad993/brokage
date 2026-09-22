import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppAlert, useAppToast } from '../../components/appAlert';
import { AuthDecor } from '../../components/auth/AuthDecor';
import { GradientButton } from '../../components/GradientButton';
import { ScreenScroll } from '../../components/ScreenScroll';
import { errorMessage, resendAuthOtp, verifyAuthOtp } from '../../api/client';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { saveCredentials } from '../../stores/credentialsStore';
import { getAuthScreenStyles } from '../../theme/authScreenStyles';
import { colors } from '../../theme/colors';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'VerifyOtp'>;
type Route = RouteProp<AuthStackParamList, 'VerifyOtp'>;

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyOtpScreen() {
  const styles = useThemedStyles(buildStyles);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { email, purpose, password } = route.params;
  const alert = useAppAlert();
  const toast = useAppToast();
  const setUser = useAuthStore(s => s.setUser);

  const [code, setCode] = useState('');
  // Starts already counting down — a code was just sent by the screen
  // that navigated here (Login/Register), so "Resend" staying disabled
  // for the first 60 seconds is correct from the very first render, not
  // just after a manual resend.
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const verify = useMutation({
    mutationFn: () => verifyAuthOtp(email, code.trim(), purpose),
    onSuccess: async user => {
      await saveCredentials(user.id, password);
      await setUser(user);
    },
    onError: error => {
      alert({
        title: 'Could not verify',
        message: errorMessage(error, 'That code didn\'t work. Please try again.'),
      });
    },
  });

  const resend = useMutation({
    mutationFn: () => resendAuthOtp(email, purpose),
    onSuccess: () => {
      toast({ title: 'Code sent', message: `We sent a new code to ${email}.`, kind: 'success' });
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setCode('');
      inputRef.current?.focus();
    },
    onError: error => {
      alert({
        title: 'Could not resend',
        message: errorMessage(error, 'Please wait a moment and try again.'),
      });
    },
  });

  const canVerify = code.trim().length === CODE_LENGTH && !verify.isPending;
  const canResend = secondsLeft <= 0 && !resend.isPending;

  return (
    <ScreenScroll>
      <View style={styles.decorWrap}>
        <AuthDecor />
        <View style={styles.main}>
          <View style={styles.brand}>
            <Text style={styles.title}>
              {purpose === 'signup' ? 'Verify your email' : "Confirm it's you"}
            </Text>
            <Text style={styles.tagline}>
              We sent a {CODE_LENGTH}-digit code to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
          </View>

          <View style={[getAuthScreenStyles().card, styles.cardFields]}>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={t => setCode(t.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH))}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              autoFocus
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              style={styles.codeInput}
              accessibilityLabel="Verification code"
            />

            <GradientButton
              label="Verify"
              loading={verify.isPending}
              disabled={!canVerify}
              onPress={() => verify.mutate()}
              style={styles.cta}
            />

            <View style={styles.resendRow}>
              {canResend ? (
                <Pressable
                  onPress={() => resend.mutate()}
                  disabled={resend.isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Resend code">
                  <Text style={styles.resendLink}>
                    {resend.isPending ? 'Sending…' : 'Resend code'}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.resendMuted}>
                  Resend code in {secondsLeft}s
                </Text>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.link}>Use a different email</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenScroll>
  );
}

const buildStyles = () =>
  StyleSheet.create({
    decorWrap: { position: 'relative', flexGrow: 1 },
    main: { paddingTop: spacing.lg, gap: spacing.xl },
    brand: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
    title: {
      ...typography.headline,
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    tagline: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    emailText: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    cardFields: { gap: spacing.lg, alignItems: 'center' },
    codeInput: {
      ...typography.headline,
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: 12,
      textAlign: 'center',
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      borderRadius: layout.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      width: '100%',
    },
    cta: { width: '100%' },
    resendRow: { alignItems: 'center', paddingVertical: spacing.xs },
    resendLink: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: colors.primary,
    },
    resendMuted: {
      ...typography.bodySmall,
      color: colors.textMuted,
    },
    footer: { alignItems: 'center' },
    link: {
      ...typography.bodySmall,
      fontWeight: '700',
      color: colors.primary,
    },
  });
