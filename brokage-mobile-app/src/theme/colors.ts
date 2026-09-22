/**
 * Brokage — theme-aware color palette.
 *
 * `colors` used to be a frozen `as const` object holding only the original
 * editorial-black palette. It's now a single mutable object that every
 * screen still imports exactly the same way (`import { colors } from
 * '.../theme/colors'`) — nothing about existing imports changes.
 *
 * `applyTheme()` copies a full preset's values onto this same object
 * in place (object identity never changes, only its property values do),
 * and `themeStore` forces a full app remount right after, so every
 * currently-mounted screen re-renders and picks up the new values without
 * needing a theme hook/context threaded through hundreds of files.
 */
import { themePresets, type ThemeName, type ThemePalette } from './themePresets';

/** Brand-canonical gradient stops (logo SVG). Keep in sync with BrokageLogo. */
const BRAND_HIGHLIGHT = '#D9D9D9';

export const colors: ThemePalette = { ...themePresets.dark };

/** Mutates `colors` in place to match the given theme's palette. */
export function applyTheme(name: ThemeName): void {
  Object.assign(colors, themePresets[name]);
}

export type ColorName = keyof typeof colors;

/** Logo highlight stop, exported for SVG / decorative reuse. */
export const BRAND_HIGHLIGHT_STOP = BRAND_HIGHLIGHT;

