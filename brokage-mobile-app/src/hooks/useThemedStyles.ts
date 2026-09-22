import { useMemo } from 'react';
import type { StyleSheet } from 'react-native';
import { useThemeStore } from '../stores/themeStore';

/**
 * Drop-in replacement for a module-level `StyleSheet.create({...})` call
 * when the styles read from `theme/colors`.
 *
 * Why this exists: a plain `const styles = StyleSheet.create({ color:
 * colors.textPrimary })` at the top of a screen file only ever reads
 * `colors` **once**, the moment the file is first imported (usually during
 * the very first app launch, before any saved theme has even loaded) —
 * switching themes later mutates the shared `colors` object, but that
 * already-built style object never re-reads it.
 *
 * `useThemedStyles` moves the `StyleSheet.create(...)` call inside the
 * component and re-runs it whenever `themeStore`'s version counter changes
 * (bumped on every theme switch, including the initial hydrate from
 * storage), so the screen repaints with the current palette every time.
 *
 * Usage — change:
 *   const styles = StyleSheet.create({ ... });
 * to:
 *   const styles = useThemedStyles(() => StyleSheet.create({ ... }));
 * moved inside the component function body. No other call sites change.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: () => T,
): T {
  const themeVersion = useThemeStore(s => s.version);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- themeVersion is the intended, sole dependency
  return useMemo(factory, [themeVersion]);
}
