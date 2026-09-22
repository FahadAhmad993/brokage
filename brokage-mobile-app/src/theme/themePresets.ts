/**
 * Brokage — theme presets.
 *
 * Every preset has the exact same keys as `theme/colors.ts` (the app's one
 * color contract). Screens never import from here directly — they keep
 * importing `colors` from `./colors` exactly as before; `applyTheme()`
 * mutates that shared object in place, and `themeStore` forces a full-tree
 * remount so every already-mounted screen re-reads the new values. This is
 * the same "remount to reset state" trick `App.tsx` already uses for its
 * error-boundary recovery key, just applied to theme switching.
 *
 * Four themes, per the "black / white / two more" request:
 *   - dark      → the original editorial-black look (unchanged default)
 *   - light     → clean white/paper theme
 *   - midnight  → deep navy-blue dark variant (distinct from plain black)
 *   - sand      → warm cream/sepia light variant (distinct from plain white)
 */

export type ThemeName = 'dark' | 'light' | 'midnight' | 'sand';

export type ThemePalette = {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceElevated: string;
  surfaceHighlight: string;

  border: string;
  borderStrong: string;
  divider: string;

  primary: string;
  primaryMid: string;
  primarySoft: string;
  brandWordmark: string;
  brandGradient: string[];

  washPrimary: string;
  ringPrimary: string;
  ringPrimaryMid: string;
  ringPrimaryStroke: string;
  ringPrimaryFocus: string;
  primaryBadgeOverlay: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textTabInactive: string;
  onPrimary: string;
  onBrandGradient: string;

  accentBrown: string;
  washAccent: string;
  tipBg: string;
  tipBorder: string;
  tipText: string;
  tipTitle: string;

  overlayHeader: string;
  overlayOnPhoto: string;
  shadow: string;

  success: string;
  danger: string;

  /**
   * Distinct surfaces for the top app bar vs. the bottom composer/tab bar —
   * previously both silently fell back to `colors.surface`, so the two bars
   * were visually identical and hard to tell apart. Every preset now gives
   * them a deliberately different tone.
   */
  topBar: string;
  topBarBorder: string;
  bottomBar: string;
  bottomBarBorder: string;

  /** true = light status-bar icons/text (use on dark surfaces). */
  isDark: boolean;
};

const DARK: ThemePalette = {
  background: '#0C0A09',
  surface: '#16130F',
  surfaceMuted: '#1D1916',
  surfaceElevated: '#221E1A',
  surfaceHighlight: 'rgba(255, 250, 245, 0.07)',

  border: 'rgba(255, 250, 245, 0.07)',
  borderStrong: 'rgba(255, 250, 245, 0.16)',
  divider: 'rgba(255, 250, 245, 0.12)',

  primary: '#F5F1EC',
  primaryMid: '#E2DDD6',
  primarySoft: '#1D1916',
  brandWordmark: '#D29565',
  brandGradient: ['#77787D', '#131514'],

  washPrimary: 'rgba(245, 245, 247, 0.04)',
  ringPrimary: 'rgba(245, 245, 247, 0.10)',
  ringPrimaryMid: 'rgba(245, 245, 247, 0.14)',
  ringPrimaryStroke: 'rgba(245, 245, 247, 0.22)',
  ringPrimaryFocus: 'rgba(245, 245, 247, 0.36)',
  primaryBadgeOverlay: 'rgba(12, 10, 9, 0.92)',

  textPrimary: '#F5F1EC',
  textSecondary: '#BDB6AC',
  textMuted: '#8F877D',
  textTabInactive: '#5C5651',
  onPrimary: '#0B0B0C',
  onBrandGradient: '#FFFFFF',

  accentBrown: '#C9803E',
  washAccent: 'rgba(201, 128, 62, 0.10)',
  tipBg: 'rgba(201, 128, 62, 0.14)',
  tipBorder: 'rgba(201, 128, 62, 0.45)',
  tipText: '#E8B889',
  tipTitle: '#F5D9BB',

  overlayHeader: 'rgba(12, 10, 9, 0.88)',
  overlayOnPhoto: 'rgba(12, 10, 9, 0.72)',
  shadow: 'rgba(0, 0, 0, 0.45)',

  success: '#34D399',
  danger: '#F87171',

  // Top bar reads a hair darker/flatter than the canvas; bottom composer
  // reads a hair lighter with a visible top hairline — the two are no
  // longer visually interchangeable.
  topBar: '#0F0D0B',
  topBarBorder: 'rgba(255, 250, 245, 0.08)',
  bottomBar: '#1A1611',
  bottomBarBorder: 'rgba(255, 250, 245, 0.14)',

  isDark: true,
};

const LIGHT: ThemePalette = {
  background: '#FAFAF9',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EFEC',
  surfaceElevated: '#FFFFFF',
  surfaceHighlight: 'rgba(20, 18, 16, 0.04)',

  border: 'rgba(20, 18, 16, 0.10)',
  borderStrong: 'rgba(20, 18, 16, 0.20)',
  divider: 'rgba(20, 18, 16, 0.12)',

  primary: '#171412',
  primaryMid: '#312B26',
  primarySoft: '#F1EFEC',
  brandWordmark: '#B5652B',
  brandGradient: ['#3A3A3D', '#0E0D0C'],

  washPrimary: 'rgba(23, 20, 18, 0.04)',
  ringPrimary: 'rgba(23, 20, 18, 0.08)',
  ringPrimaryMid: 'rgba(23, 20, 18, 0.12)',
  ringPrimaryStroke: 'rgba(23, 20, 18, 0.20)',
  ringPrimaryFocus: 'rgba(23, 20, 18, 0.34)',
  primaryBadgeOverlay: 'rgba(255, 255, 255, 0.92)',

  textPrimary: '#171412',
  textSecondary: '#5A5450',
  textMuted: '#8B857F',
  textTabInactive: '#B7B0A9',
  onPrimary: '#FFFFFF',
  onBrandGradient: '#FFFFFF',

  accentBrown: '#B5652B',
  washAccent: 'rgba(181, 101, 43, 0.08)',
  tipBg: 'rgba(181, 101, 43, 0.10)',
  tipBorder: 'rgba(181, 101, 43, 0.35)',
  tipText: '#8A4C1E',
  tipTitle: '#6E3B15',

  overlayHeader: 'rgba(255, 255, 255, 0.90)',
  overlayOnPhoto: 'rgba(23, 20, 18, 0.55)',
  shadow: 'rgba(23, 20, 18, 0.14)',

  success: '#15803D',
  danger: '#DC2626',

  topBar: '#FFFFFF',
  topBarBorder: 'rgba(20, 18, 16, 0.10)',
  bottomBar: '#F3F1EE',
  bottomBarBorder: 'rgba(20, 18, 16, 0.14)',

  isDark: false,
};

const MIDNIGHT: ThemePalette = {
  background: '#0A0E17',
  surface: '#111726',
  surfaceMuted: '#161E30',
  surfaceElevated: '#1B2438',
  surfaceHighlight: 'rgba(210, 225, 255, 0.06)',

  border: 'rgba(210, 225, 255, 0.08)',
  borderStrong: 'rgba(210, 225, 255, 0.18)',
  divider: 'rgba(210, 225, 255, 0.12)',

  primary: '#EAF1FF',
  primaryMid: '#C7D6F2',
  primarySoft: '#161E30',
  brandWordmark: '#6FA8FF',
  brandGradient: ['#3D5A8C', '#0A0E17'],

  washPrimary: 'rgba(111, 168, 255, 0.06)',
  ringPrimary: 'rgba(111, 168, 255, 0.12)',
  ringPrimaryMid: 'rgba(111, 168, 255, 0.18)',
  ringPrimaryStroke: 'rgba(111, 168, 255, 0.30)',
  ringPrimaryFocus: 'rgba(111, 168, 255, 0.45)',
  primaryBadgeOverlay: 'rgba(10, 14, 23, 0.92)',

  textPrimary: '#EAF1FF',
  textSecondary: '#A9B8D6',
  textMuted: '#6E7C9C',
  textTabInactive: '#404B65',
  onPrimary: '#0A0E17',
  onBrandGradient: '#FFFFFF',

  accentBrown: '#6FA8FF',
  washAccent: 'rgba(111, 168, 255, 0.10)',
  tipBg: 'rgba(111, 168, 255, 0.14)',
  tipBorder: 'rgba(111, 168, 255, 0.40)',
  tipText: '#A9CBFF',
  tipTitle: '#D6E6FF',

  overlayHeader: 'rgba(10, 14, 23, 0.88)',
  overlayOnPhoto: 'rgba(10, 14, 23, 0.72)',
  shadow: 'rgba(0, 0, 4, 0.5)',

  success: '#34D399',
  danger: '#FB7185',

  topBar: '#080C14',
  topBarBorder: 'rgba(210, 225, 255, 0.10)',
  bottomBar: '#141C2E',
  bottomBarBorder: 'rgba(210, 225, 255, 0.16)',

  isDark: true,
};

const SAND: ThemePalette = {
  background: '#F7EFE2',
  surface: '#FFFBF3',
  surfaceMuted: '#EFE3CD',
  surfaceElevated: '#FFFBF3',
  surfaceHighlight: 'rgba(70, 50, 20, 0.05)',

  border: 'rgba(70, 50, 20, 0.12)',
  borderStrong: 'rgba(70, 50, 20, 0.22)',
  divider: 'rgba(70, 50, 20, 0.14)',

  primary: '#3A2A16',
  primaryMid: '#5A4126',
  primarySoft: '#EFE3CD',
  brandWordmark: '#A85A22',
  brandGradient: ['#8A6339', '#2A1D10']	,

  washPrimary: 'rgba(58, 42, 22, 0.05)',
  ringPrimary: 'rgba(58, 42, 22, 0.10)',
  ringPrimaryMid: 'rgba(58, 42, 22, 0.15)',
  ringPrimaryStroke: 'rgba(58, 42, 22, 0.24)',
  ringPrimaryFocus: 'rgba(58, 42, 22, 0.38)',
  primaryBadgeOverlay: 'rgba(255, 251, 243, 0.92)',

  textPrimary: '#3A2A16',
  textSecondary: '#6E5636',
  textMuted: '#9A8462',
  textTabInactive: '#C6B491',
  onPrimary: '#FFFBF3',
  onBrandGradient: '#FFFBF3',

  accentBrown: '#A85A22',
  washAccent: 'rgba(168, 90, 34, 0.10)',
  tipBg: 'rgba(168, 90, 34, 0.14)',
  tipBorder: 'rgba(168, 90, 34, 0.38)',
  tipText: '#7A4318',
  tipTitle: '#5C3311',

  overlayHeader: 'rgba(255, 251, 243, 0.90)',
  overlayOnPhoto: 'rgba(58, 42, 22, 0.55)',
  shadow: 'rgba(58, 42, 22, 0.18)',

  success: '#2F8F4E',
  danger: '#B4432A',

  topBar: '#FFFBF3',
  topBarBorder: 'rgba(70, 50, 20, 0.14)',
  bottomBar: '#EFE1C7',
  bottomBarBorder: 'rgba(70, 50, 20, 0.18)',

  isDark: false,
};

export const themePresets: Record<ThemeName, ThemePalette> = {
  dark: DARK,
  light: LIGHT,
  midnight: MIDNIGHT,
  sand: SAND,
};

export const themeMeta: Record<ThemeName, { label: string; swatch: string }> = {
  dark: { label: 'Dark (Black)', swatch: DARK.background },
  light: { label: 'Light (White)', swatch: LIGHT.background },
  midnight: { label: 'Midnight Blue', swatch: MIDNIGHT.background },
  sand: { label: 'Sand (Warm Light)', swatch: SAND.background },
};
