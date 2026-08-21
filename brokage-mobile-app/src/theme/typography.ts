import { Platform, TextStyle } from 'react-native';

/**
 * Type scale aligned with:
 * - **iOS HIG** — Body 17pt, Callout 16, Subheadline 15, Footnote/Caption 12–13, minimum touch 44pt.
 * - **Material 3** — bodyLarge 16, bodyMedium 14, labelLarge 14, titleMedium 16, titleLarge 22.
 *
 * Uses system fonts until custom fonts are linked (see react-native.config.js).
 */
const familyDisplay = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const familyBody = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const typography = {
  /** Hero / large wordmark — M3 headline-small / iOS title2 range */
  displayLarge: {
    fontFamily: familyDisplay,
    fontSize: 28,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  /** Screen titles, brand — iOS title3 / M3 title-large */
  displayMedium: {
    fontFamily: familyDisplay,
    fontSize: 22,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.35,
    lineHeight: 28,
  },
  /** Section titles, card titles — M3 title-medium */
  title: {
    fontFamily: familyDisplay,
    fontSize: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.25,
    lineHeight: 24,
  },
  /** List headings, emphasized rows — iOS headline */
  headline: {
    fontFamily: familyDisplay,
    fontSize: 17,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.25,
    lineHeight: 22,
  },
  /** Primary reading text — iOS body (17) / M3 body-large (16); we use 17 on both for parity */
  body: {
    fontFamily: familyBody,
    fontSize: 17,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  /** Secondary body — iOS subheadline / M3 body-medium */
  bodySmall: {
    fontFamily: familyBody,
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: -0.15,
    lineHeight: 20,
  },
  /** Labels on controls, chips — M3 label-large */
  label: {
    fontFamily: familyBody,
    fontSize: 14,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  /** Captions, meta — iOS caption / M3 body-small */
  caption: {
    fontFamily: familyBody,
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0,
    lineHeight: 16,
  },
  /** Uppercase micro labels */
  overline: {
    fontFamily: familyBody,
    fontSize: 11,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.8,
    lineHeight: 14,
  },
} as const;
