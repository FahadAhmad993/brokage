/**
 * Brokage — production React Native shell: error boundary + providers.
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { AppProviders } from './src/app/AppProviders';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { useThemeStore } from './src/stores/themeStore';

export default function App() {
  const [recoverKey, setRecoverKey] = useState(0);
  const hydrateTheme = useThemeStore(s => s.hydrate);
  // Bumped by `themeStore` every time the theme changes (including the
  // initial hydrate from AsyncStorage) — folded into the remount key below
  // so every screen re-renders against the freshly mutated `colors` object.
  const themeVersion = useThemeStore(s => s.version);

  useEffect(() => {
    void hydrateTheme();
  }, [hydrateTheme]);

  return (
    <AppErrorBoundary
      key={`${recoverKey}-${themeVersion}`}
      onRecover={() => setRecoverKey(k => k + 1)}>
      <AppProviders />
    </AppErrorBoundary>
  );
}
