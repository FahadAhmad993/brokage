import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenScroll } from '../../components/ScreenScroll';
import { useAppAlert, useAppToast } from '../../components/appAlert';
import { GradientButton } from '../../components/GradientButton';
import { API_MODE } from '../../config/appConfig';
import { changePassword as changePasswordApi, errorMessage } from '../../api/client';
import type { MainStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { updateStoredPassword } from '../../stores/credentialsStore';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { screenStyles } from '../../theme/screenStyles';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { fieldStyles } from '../property/addProperty/fieldStyles';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ChangePassword'>;

const MIN_LEN = 8;

export function ChangePasswordScreen() {
  const navigation = useNavigation<Nav>();
  const alert = useAppAlert();
  const toast = useAppToast();
  const user = useAuthStore(s => s.user);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!user) {
      return;
    }
    if (next.length < MIN_LEN) {
      alert({
        title: 'Password too short',
        message: `Use at least ${MIN_LEN} characters.`,
      });
      return;
    }
    if (next !== confirm) {
      alert({
        title: 'Mismatch',
        message: 'New password and confirmation must match.',
      });
      return;
    }
    setBusy(true);
    try {
      if (API_MODE === 'live') {
        await changePasswordApi(current, next);
      } else {
        const result = await updateStoredPassword(user.id, current, next);
        if (result === 'bad_current') {
          alert({
            title: 'Current password incorrect',
            message:
              'Check your current password. If you just updated the app, try the password you last used to sign in.',
          });
          return;
        }
      }
      toast({
        title: 'Password changed',
        message:
          API_MODE === 'live'
            ? 'Your account credentials are updated.'
            : 'Updated for this mock session on this device.',
        kind: 'success',
      });
      setCurrent('');
      setNext('');
      setConfirm('');
      navigation.goBack();
    } catch (error) {
      alert({
        title: 'Could not update password',
        message: errorMessage(
          error,
          'Please check your current password and try again.',
        ),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScroll>
      <Text style={screenStyles.sectionOverline}>Security</Text>
      <Text style={styles.title}>Change password</Text>
      <Text style={styles.lead}>
        For this preview build, your password is stored only on this device with
        your session. Use a strong password you don’t reuse elsewhere.
      </Text>

      <View style={styles.callout}>
        <Lock
          color={colors.primary}
          size={iconSize.md}
          strokeWidth={iconStroke}
        />
        <Text style={styles.calloutText}>
          After you ship a live API, this screen should call your backend and
          never persist plaintext passwords locally.
        </Text>
      </View>

      <Text style={fieldStyles.label}>Current password</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={current}
          onChangeText={setCurrent}
          secureTextEntry={!showCurrent}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          style={styles.inputFlex}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Current password"
        />
        <Pressable
          onPress={() => setShowCurrent(s => !s)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={showCurrent ? 'Hide password' : 'Show password'}>
          {showCurrent ? (
            <EyeOff color={colors.textMuted} size={22} strokeWidth={iconStroke} />
          ) : (
            <Eye color={colors.textMuted} size={22} strokeWidth={iconStroke} />
          )}
        </Pressable>
      </View>

      <Text style={[fieldStyles.label, styles.mt]}>New password</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={next}
          onChangeText={setNext}
          secureTextEntry={!showNext}
          placeholder={`At least ${MIN_LEN} characters`}
          placeholderTextColor={colors.textMuted}
          style={styles.inputFlex}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="New password"
        />
        <Pressable
          onPress={() => setShowNext(s => !s)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={showNext ? 'Hide new password' : 'Show new password'}>
          {showNext ? (
            <EyeOff color={colors.textMuted} size={22} strokeWidth={iconStroke} />
          ) : (
            <Eye color={colors.textMuted} size={22} strokeWidth={iconStroke} />
          )}
        </Pressable>
      </View>

      <Text style={[fieldStyles.label, styles.mt]}>Confirm new password</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showConfirm}
          placeholder="Repeat new password"
          placeholderTextColor={colors.textMuted}
          style={styles.inputFlex}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Confirm new password"
        />
        <Pressable
          onPress={() => setShowConfirm(s => !s)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={
            showConfirm ? 'Hide confirmation' : 'Show confirmation'
          }>
          {showConfirm ? (
            <EyeOff color={colors.textMuted} size={22} strokeWidth={iconStroke} />
          ) : (
            <Eye color={colors.textMuted} size={22} strokeWidth={iconStroke} />
          )}
        </Pressable>
      </View>

      <Text style={fieldStyles.hint}>
        Tip: mix letters, numbers, and symbols. You’ll re-enter this password
        when you sign in again on this device.
      </Text>

      <GradientButton
        label="Update password"
        onPress={onSubmit}
        loading={busy}
        disabled={busy || !current || !next || !confirm}
        style={styles.cta}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  lead: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: layout.radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.ringPrimaryMid,
    marginBottom: spacing.lg,
  },
  calloutText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    flex: 1,
    fontWeight: '500',
  },
  mt: { marginTop: spacing.lg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,196,215,0.18)',
    paddingHorizontal: spacing.md,
    minHeight: layout.buttonHeightMin,
  },
  inputFlex: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 12,
  },
  cta: { marginTop: spacing.xl },
});
