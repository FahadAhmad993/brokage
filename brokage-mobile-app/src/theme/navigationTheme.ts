import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { colors } from './colors';

/**
 * Navigation container theme aligned with the currently active app theme.
 * This is a **function**, not a static object: `AppProviders` remounts
 * fully whenever the theme changes (see `themeStore`), so calling this
 * fresh on every mount picks up the just-mutated `colors` values instead of
 * freezing in whatever palette was active the first time this module was
 * ever imported.
 */
export function getNavigationTheme(): Theme {
  const base = colors.isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: colors.isDark,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: {
      ...base.fonts,
      regular: {
        fontFamily: 'System',
        fontWeight: '400' as const,
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500' as const,
      },
      bold: {
        fontFamily: 'System',
        fontWeight: '700' as const,
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '800' as const,
      },
    },
  };
}

