import { useHeaderHeight } from '@react-navigation/elements';
import React, { type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { layout } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { useThemedStyles } from '../hooks/useThemedStyles';

type Props = {
  children: ReactNode;
  topInsetBackground?: string;
};

/**
 * Screen wrapper for form-style content.
 *
 * Layout matches the canonical pattern from `react-native-keyboard-controller`'s
 * example app (example/src/screens/Examples/AwareScrollView/index.tsx):
 *
 *   <View flex>
 *     <KeyboardAwareScrollView>{children}</KeyboardAwareScrollView>
 *   </View>
 *
 * — i.e. a plain View as the outer container, NO `SafeAreaView` wrapping
 * the scroll view. Wrapping the scroll view in a SafeAreaView interferes
 * with the library's measurement of the focused input vs the keyboard
 * on Android edge-to-edge.
 *
 * Top safe-area is applied manually as `paddingTop` on the outer View,
 * but only when the screen has no native-stack header above it (the
 * header consumes the inset itself when present). `useHeaderHeight()`
 * returns 0 when there is no header, > 0 when there is.
 *
 * `mode="layout"` (vs the library default `mode="insets"`) is the
 * critical choice for our stack:
 *   - "insets" extends scroll area via `contentInset` on iOS and a
 *     clipping shim on Android. It is documented to fail in
 *     edge-to-edge + new-arch + adjustResize combinations because the
 *     window doesn't resize and the clipping shim can't extend past the
 *     gesture bar. See react-native-keyboard-controller#645 / #1316.
 *   - "layout" appends a spacer View as the last child of the scroll
 *     view. The spacer's height tracks the keyboard height, physically
 *     pushing content up so the focused input scrolls into view. Works
 *     identically across iOS / Android / new arch / edge-to-edge.
 *
 * Behaviour:
 *   - Scroll is always enabled so the library can programmatically lift
 *     the focused input above the keyboard via `scrollTo` — disabling
 *     scroll on short pages makes that call a no-op and the input stays
 *     hidden behind the keyboard.
 *   - `bounces={false}` (iOS) and `overScrollMode="never"` (Android) kill
 *     the rubber-band / edge-glow affordance, so short pages still feel
 *     static — there's no visible overscroll even though scroll is on.
 *   - On focus, the library scrolls the focused input so it sits
 *     `bottomOffset` above the keyboard top.
 *   - Swipe down on the scroll view to dismiss the keyboard.
 */
export function ScreenScroll({ children, topInsetBackground }: Props) {
  const styles = useThemedStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const bottomPad = Math.max(insets.bottom, spacing.md) + spacing.lg;
  // When a native-stack header is showing, it already consumes the top
  // safe-area inset — we'd double-pad if we added insets.top here too.
  const topPad = headerHeight > 0 ? 0 : insets.top;

  return (
    <View
      style={[
        styles.root,
        topInsetBackground ? { backgroundColor: topInsetBackground } : null,
        {
          paddingTop: topPad,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPad },
        ]}
        mode="layout"
        bottomOffset={spacing.lg}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        bounces={false}
        {...(Platform.OS === 'android'
          ? { overScrollMode: 'never' as const }
          : {})}>
        {children}
      </KeyboardAwareScrollView>
    </View>
  );
}

const buildStyles = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  // NO `flexGrow: 1` — even with mode="layout", flexGrow on the content
  // container interferes with the spacer's effect on layout positioning.
  scrollContent: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.sm,
  },
});
