import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useThemedStyles } from '../hooks/useThemedStyles';

type Props = {
  label: string;
  onPress: () => void;
  leftIcon?: ReactNode;
  style?: ViewStyle;
  testID?: string;
};

/** Secondary action — bordered surface, same min height as primary CTAs. */
export function OutlinedButton({
  label,
  onPress,
  leftIcon,
  style,
  testID,
}: Props) {
  const styles = useThemedStyles(buildStyles);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      hitSlop={layout.hitSlop}
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        pressed && styles.pressed,
        style,
      ]}>
      <View style={styles.inner}>
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const RADIUS = layout.radius.lg;

const buildStyles = () => StyleSheet.create({
  wrap: {
    borderRadius: RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: layout.buttonHeightMin,
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.ringPrimaryMid,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  icon: { alignItems: 'center', justifyContent: 'center' },
  label: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0,
    color: colors.primary,
  },
});
