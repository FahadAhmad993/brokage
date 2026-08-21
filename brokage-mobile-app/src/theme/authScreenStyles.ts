import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { layout } from './layout';
import { spacing } from './spacing';
import { typography } from './typography';

/** Shared surfaces for sign-in, register, and recovery (enterprise consistency). */
export const authScreenStyles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    gap: spacing.md,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  title: {
    ...typography.displayMedium,
    color: colors.textPrimary,
  },
  sub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  logoMark: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: layout.radius.xxl,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
});
