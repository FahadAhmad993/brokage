import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { layout } from '../theme/layout';
import { useThemedStyles } from '../hooks/useThemedStyles';

export type ActionMenuItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

/**
 * A small vertical list of actions anchored near a screen point — the
 * WhatsApp-style menu that pops up right next to the "⋮" you tapped, or
 * right next to a long-pressed message, instead of a centered OS Alert.
 */
export function ActionMenu({
  visible,
  onClose,
  anchor,
  items,
  align = 'right',
}: {
  visible: boolean;
  onClose: () => void;
  /** Screen-space point (from `measureInWindow` or a touch event) to anchor near. */
  anchor: { x: number; y: number } | null;
  items: ActionMenuItem[];
  /** Whether the menu's right or left edge lines up with `anchor.x`. */
  align?: 'left' | 'right';
}) {
  const styles = useThemedStyles(buildStyles);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  if (!visible || !anchor) {
    return null;
  }

  const MENU_WIDTH = 210;
  const MARGIN = 8;

  let left = align === 'right' ? anchor.x - MENU_WIDTH : anchor.x;
  left = Math.max(MARGIN, Math.min(left, screenWidth - MENU_WIDTH - MARGIN));

  const estimatedHeight = items.length * 44 + 8;
  let top = anchor.y;
  if (top + estimatedHeight > screenHeight - MARGIN) {
    top = Math.max(MARGIN, anchor.y - estimatedHeight - 24);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.menu, { left, top, width: MENU_WIDTH }]}>
          {items.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              disabled={item.disabled}
              style={({ pressed }) => [
                styles.item,
                i < items.length - 1 && styles.itemDivider,
                pressed && styles.itemPressed,
                item.disabled && styles.itemDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Text style={[styles.itemLabel, item.destructive && styles.itemLabelDestructive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const buildStyles = () => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: layout.radius.md,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  item: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  itemLabelDestructive: {
    color: colors.danger,
  },
});
