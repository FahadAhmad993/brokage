import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { layout } from './layout';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

/** Shared layout patterns for stack/tab screens — spacing, hierarchy, surfaces. */
export const screenStyles = StyleSheet.create({
  sectionOverline: {
    ...typography.overline,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.6,
  },
  screenTitle: {
    ...typography.displayMedium,
    color: colors.textPrimary,
  },
  screenSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    /** Specular hairline on the top edge — reads as a real material lift. */
    borderTopWidth: 1,
    borderTopColor: colors.surfaceHighlight,
    gap: spacing.md,
  },
  cardElevated: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceHighlight,
    ...shadows.cardSubtle,
  },
  hairlineBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  /** Standard horizontal inset for scroll pages (matches ScreenScroll). */
  pagePadding: {
    paddingHorizontal: layout.screenPaddingHorizontal,
  },
});
