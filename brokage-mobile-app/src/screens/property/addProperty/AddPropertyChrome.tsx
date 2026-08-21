import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react-native';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../../theme/colors';
import { iconSize, iconStroke } from '../../../theme/icons';
import { layout } from '../../../theme/layout';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { STEP_CONFIG } from './constants';

type Props = {
  step: number;
  progress: number;
  onClose: () => void;
  onSaveDraft: () => void;
};

export function AddPropertyChrome({
  step,
  progress,
  onClose,
  onSaveDraft,
}: Props) {
  const meta = STEP_CONFIG[step - 1];
  if (!meta) {
    return null;
  }

  const pct = Math.round(progress * 100);

  return (
    <>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close and discard"
          style={({ pressed }) => [
            styles.iconPill,
            pressed && styles.iconPillPressed,
          ]}
          hitSlop={6}>
          <X color={colors.primary} size={20} strokeWidth={2.25} />
        </Pressable>

        <View style={styles.headerCenter} pointerEvents="none">
          <Text style={styles.headerTitleSingle} numberOfLines={1}>
            New listing
          </Text>
        </View>

        <Pressable
          onPress={onSaveDraft}
          accessibilityRole="button"
          accessibilityLabel="Save draft"
          style={({ pressed }) => [
            styles.savePill,
            pressed && styles.savePillPressed,
          ]}
          hitSlop={4}>
          <Save color={colors.primary} size={17} strokeWidth={2.2} />
          <Text style={styles.savePillText}>Save</Text>
        </Pressable>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressTop}>
          <View style={styles.progressLeft}>
            <Text style={styles.stepLabel}>{meta.stepLabel}</Text>
            <Text style={styles.stepTitle}>{meta.heading}</Text>
            {meta.subline && meta.subline.length < 120 ? (
              <Text style={styles.stepSub}>{meta.subline}</Text>
            ) : null}
          </View>
          <View style={styles.pctPill}>
            <Text style={styles.pct}>{pct}%</Text>
          </View>
        </View>
        <View style={styles.track}>
          <LinearGradient
            colors={colors.brandGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]}
          />
        </View>
      </View>
    </>
  );
}

export function AddPropertyFooter({
  showBack,
  onBack,
  onCancel,
  onPrimary,
  primaryLabel,
  primaryDisabled,
  isPublishStep,
  paddingBottom,
}: {
  showBack: boolean;
  onBack: () => void;
  onCancel: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  isPublishStep?: boolean;
  paddingBottom: number;
}) {
  if (isPublishStep) {
    return (
      <View style={[styles.footerPublish, { paddingBottom }]}>
        {showBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backRow,
              pressed && styles.footerLinkPressed,
            ]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <ChevronLeft
              color={colors.primary}
              size={iconSize.md}
              strokeWidth={iconStroke}
            />
            <Text style={styles.backLink}>Back</Text>
          </Pressable>
        ) : null}
        <LinearGradient
          colors={colors.brandGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.publishBtn,
            primaryDisabled && styles.nextBtnDisabled,
          ]}>
          <Pressable
            onPress={onPrimary}
            disabled={primaryDisabled}
            style={styles.publishInner}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}>
            <Text style={styles.publishText}>{primaryLabel}</Text>
          </Pressable>
        </LinearGradient>
        <Text style={styles.legal}>
          By publishing, you agree to our Curator Terms.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.footerBar, { paddingBottom }]}>
      <View style={styles.footerRow}>
        {showBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.footerLinkPressed,
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back">
            <ChevronLeft
              color={colors.primary}
              size={iconSize.md}
              strokeWidth={iconStroke}
            />
            <Text style={styles.secondaryBtnText}>Back</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.footerLinkPressed,
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cancel">
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </Pressable>
        )}
        <View style={styles.nextBtnWrap}>
          <LinearGradient
            colors={colors.brandGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.nextBtn,
              primaryDisabled && styles.nextBtnDisabled,
            ]}>
            <Pressable
              onPress={onPrimary}
              disabled={primaryDisabled}
              style={styles.nextInner}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
              accessibilityState={{ disabled: !!primaryDisabled }}>
              <Text style={styles.nextText}>{primaryLabel}</Text>
              <ChevronRight
                color={colors.onBrandGradient}
                size={iconSize.md}
                strokeWidth={iconStroke}
              />
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 4 : spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  iconPill: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: layout.minTouchTarget / 2,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    minWidth: 0,
  },
  headerTitleSingle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.35,
    textAlign: 'center',
  },
  savePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: layout.minTouchTarget,
    borderRadius: layout.radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.ringPrimaryStroke,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  savePillPressed: {
    opacity: 0.88,
    backgroundColor: colors.primarySoft,
  },
  savePillText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  progressBlock: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  progressLeft: { flex: 1, gap: 4, minWidth: 0 },
  stepLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.primary,
  },
  stepTitle: {
    ...typography.displayLarge,
    fontSize: 24,
    lineHeight: 30,
    color: colors.textPrimary,
  },
  stepSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  pctPill: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: layout.radius.full,
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'flex-start',
  },
  pct: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.2,
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  footerBar: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  nextBtnWrap: {
    flex: 1,
    minWidth: 0,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 4,
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  footerLinkPressed: { opacity: 0.75 },
  footerPublish: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: 4,
  },
  backLink: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  nextBtn: {
    flex: 1,
    borderRadius: layout.radius.lg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  nextBtnDisabled: { opacity: 0.45 },
  nextInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    minHeight: layout.minTouchTarget,
  },
  nextText: {
    fontSize: 17,
    color: colors.onBrandGradient,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  publishBtn: {
    borderRadius: layout.radius.lg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  publishInner: {
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
  },
  publishText: {
    fontSize: 17,
    color: colors.onBrandGradient,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  legal: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
});
