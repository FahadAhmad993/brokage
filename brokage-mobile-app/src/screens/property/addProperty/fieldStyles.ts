import { StyleSheet } from 'react-native';
import { colors } from '../../../theme/colors';
import { layout } from '../../../theme/layout';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';

export const fieldErrorText = {
  ...typography.caption,
  color: colors.danger,
  marginTop: 6,
  fontWeight: '600',
} as const;

/** Shared field chrome — soft fill + hairline border (clean Figma-like inputs) */
export const fieldStyles = StyleSheet.create({
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,196,215,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: layout.buttonHeightMin,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  errorText: fieldErrorText,
});
