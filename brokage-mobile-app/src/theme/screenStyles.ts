import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { layout } from './layout';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

/**
 * Shared layout patterns for stack/tab screens — spacing, hierarchy,
 * surfaces.
 *
 * This used to be a plain `StyleSheet.create({...})` computed once at
 * module load — every screen that spread `screenStyles.cardElevated`
 * (etc.) into its own theme-reactive styles was still copying in colors
 * frozen from whichever theme was active the very first time this file
 * was imported, regardless of later theme switches. It's now a function;
 * call it fresh inside each screen's own `buildStyles()` (already wrapped
 * in `useThemedStyles`) so the values it contributes stay current too.
 */
export function getScreenStyles() {
  return StyleSheet.create({
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
}

