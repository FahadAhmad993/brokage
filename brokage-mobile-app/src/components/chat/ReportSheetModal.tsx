import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Check, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { layout } from '../../theme/layout';
import { iconSize, iconStroke } from '../../theme/icons';
import { submitReport, type ReportReason } from '../../api/client';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'suspicious_activity', label: 'Suspicious activity' },
  { value: 'other', label: 'Other' },
];

export function ReportSheetModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetLabel,
  blocksOnSubmit,
  onSubmitted,
}: {
  visible: boolean;
  onClose: () => void;
  targetType: 'user' | 'message' | 'listing';
  targetId: string;
  targetLabel?: string;
  /** Shows a warning that submitting also blocks this user (user reports only). */
  blocksOnSubmit?: boolean;
  /** Called once the report is successfully submitted (e.g. to also block them). */
  onSubmitted?: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setReason(null);
    setDetails('');
    setError(null);
    setDone(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const canSubmit = reason !== null && (reason !== 'other' || details.trim().length > 0);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReport({
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      setDone(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>{done ? 'Report submitted' : 'Report'}</Text>
            <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <X color={colors.textPrimary} size={iconSize.md} strokeWidth={iconStroke} />
            </Pressable>
          </View>

          {done ? (
            <View style={styles.doneBody}>
              <AlertTriangle color={colors.primary} size={iconSize.xl} strokeWidth={iconStroke} />
              <Text style={styles.doneText}>
                {blocksOnSubmit
                  ? "Thanks — an admin will review this report shortly. We've also blocked this user for you."
                  : 'Thanks — an admin will review this report shortly.'}
              </Text>
              <Pressable style={styles.primaryBtn} onPress={close} accessibilityRole="button" accessibilityLabel="OK">
                <Text style={styles.primaryBtnLabel}>OK</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {targetLabel ? (
                <Text style={styles.subtitle}>Reporting {targetLabel}</Text>
              ) : null}

              {blocksOnSubmit ? (
                <View style={styles.blockWarning}>
                  <AlertTriangle color={colors.danger} size={iconSize.sm} strokeWidth={iconStroke} />
                  <Text style={styles.blockWarningText}>
                    Submitting this report will also block this user — they won't be able to
                    message you until you unblock them.
                  </Text>
                </View>
              ) : null}

              <View style={styles.reasonList}>
                {REASONS.map(r => {
                  const active = reason === r.value;
                  return (
                    <Pressable
                      key={r.value}
                      style={[styles.reasonRow, active && styles.reasonRowActive]}
                      onPress={() => setReason(r.value)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={r.label}>
                      <View style={[styles.checkbox, active && styles.checkboxActive]}>
                        {active ? <Check color={colors.onPrimary} size={14} strokeWidth={3} /> : null}
                      </View>
                      <Text style={styles.reasonLabel}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder={
                  reason === 'other'
                    ? 'Describe the issue (required)…'
                    : 'Add more details (optional)…'
                }
                placeholderTextColor={colors.textMuted}
                style={styles.detailsInput}
                multiline
                maxLength={2000}
                textAlignVertical="top"
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                style={[styles.primaryBtn, (!canSubmit || submitting) && styles.primaryBtnDisabled]}
                onPress={submit}
                disabled={!canSubmit || submitting}
                accessibilityRole="button"
                accessibilityLabel="Submit report">
                {submitting ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.primaryBtnLabel}>Submit report</Text>
                )}
              </Pressable>
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.headline, fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary },
  blockWarning: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: layout.radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'flex-start',
  },
  blockWarningText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },
  reasonList: { gap: spacing.xs, marginTop: spacing.xs },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: layout.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  reasonRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonLabel: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  detailsInput: {
    marginTop: spacing.xs,
    minHeight: 80,
    padding: spacing.sm,
    borderRadius: layout.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    ...typography.bodySmall,
  },
  errorText: { ...typography.caption, color: colors.danger },
  primaryBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: layout.radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnLabel: { ...typography.bodySmall, color: colors.onPrimary, fontWeight: '700' },
  doneBody: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  doneText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
