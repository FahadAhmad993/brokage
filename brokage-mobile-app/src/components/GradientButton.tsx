import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { shadows } from '../theme/shadows';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

/** Shared corner radius — rounded rect reads cleaner than full pill at scale. */
const RADIUS_MAIN = layout.radius.lg;

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Tighter vertical padding — secondary compact CTAs. */
  compact?: boolean;
  /**
   * Slim bar CTA: no drop shadow, 40pt row, md radius — sticky footers / dense layouts.
   * Hit area expanded via `hitSlop` (still comfortable to tap).
   */
  toolbar?: boolean;
  style?: ViewStyle;
};

export function GradientButton({
  label,
  onPress,
  disabled,
  loading,
  compact,
  toolbar,
  style,
}: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
      hitSlop={toolbar ? { top: 12, bottom: 12, left: 8, right: 8 } : layout.hitSlop}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.pressable,
        toolbar && styles.pressableToolbar,
        compact && !toolbar && styles.pressableCompact,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}>
      <LinearGradient
        colors={colors.brandGradient}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.gradient, toolbar && styles.gradientToolbar]}>
        <View
          style={[
            styles.inner,
            toolbar && styles.innerToolbar,
            compact && !toolbar && styles.innerCompact,
          ]}>
          {loading ? (
            <ActivityIndicator color={colors.onBrandGradient} />
          ) : (
            <Text style={[styles.label, toolbar && styles.labelToolbar]}>
              {label}
            </Text>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: RADIUS_MAIN,
    overflow: 'hidden',
    ...shadows.button,
  },
  pressableCompact: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  pressableToolbar: {
    borderRadius: layout.radius.md,
    overflow: 'hidden',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.48 },
  gradient: { borderRadius: RADIUS_MAIN },
  gradientToolbar: { borderRadius: layout.radius.md },
  inner: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.buttonHeightMin,
  },
  innerCompact: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    minHeight: layout.minTouchTarget,
  },
  innerToolbar: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0,
    color: colors.onBrandGradient,
  },
  labelToolbar: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
  },
});
