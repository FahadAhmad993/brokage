import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppAlert } from '../../components/appAlert';
import { AuthDecor } from '../../components/auth/AuthDecor';
import { GradientButton } from '../../components/GradientButton';
import { TextField } from '../../components/TextField';
import { ScreenScroll } from '../../components/ScreenScroll';
import { mockRequestPasswordReset } from '../../api/client';
import type { AuthStackParamList } from '../../navigation/types';
import { authScreenStyles } from '../../theme/authScreenStyles';
import { screenStyles } from '../../theme/screenStyles';
import { spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const alert = useAppAlert();
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');

  const reset = useMutation({
    mutationFn: () => mockRequestPasswordReset(email.trim()),
    onSuccess: () => {
      alert({
        title: 'Check your email',
        message:
          'If an account exists for that address, you will receive reset instructions.',
        buttons: [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
      });
    },
  });

  return (
    <ScreenScroll>
      <View style={styles.decorWrap}>
        <AuthDecor />
        <View style={styles.inner}>
          <View style={authScreenStyles.header}>
            <Text style={screenStyles.sectionOverline}>Account recovery</Text>
            <Text style={authScreenStyles.title}>Reset password</Text>
            <Text style={authScreenStyles.sub}>
              Enter your email and we will send next steps.
            </Text>
          </View>

          <View style={authScreenStyles.card}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <GradientButton
              label="Send reset link"
              loading={reset.isPending}
              onPress={() => reset.mutate()}
            />
          </View>
        </View>
      </View>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  decorWrap: { position: 'relative', flexGrow: 1 },
  inner: { paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xl },
});
