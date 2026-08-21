import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { layout } from '../../theme/layout';
import { iconSize, iconStroke } from '../../theme/icons';
import { useForcedLogoutStore } from '../../stores/forcedLogoutStore';

/**
 * Shown instead of the normal login screen right after an admin blocks or
 * disables the account (from Users or from actioning a Report). The reason
 * text comes straight from the admin panel; "OK" just clears this screen so
 * the person lands on the regular login form (their account is still
 * disabled server-side, so logging back in will be rejected too).
 */
export function AccountDisabledScreen() {
  const reason = useForcedLogoutStore(s => s.reason);
  const clear = useForcedLogoutStore(s => s.clear);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <ShieldAlert color={colors.danger} size={iconSize.xl ?? 40} strokeWidth={iconStroke} />
        </View>
        <Text style={styles.title}>Your account was disabled</Text>
        <Text style={styles.reason}>
          {reason || 'An admin disabled this account. Contact support if you think this is a mistake.'}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={clear}
          accessibilityRole="button"
          accessibilityLabel="OK">
          <Text style={styles.buttonLabel}>OK</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headline,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  reason: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: layout.radius.md,
    backgroundColor: colors.primary,
    minWidth: 140,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonLabel: {
    ...typography.bodySmall,
    color: colors.onPrimary,
    fontWeight: '700',
  },
});
