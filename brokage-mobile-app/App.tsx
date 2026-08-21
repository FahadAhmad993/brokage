/**
 * Brokage — production React Native shell: error boundary + providers.
 *
 * @format
 */

import React, { useState } from 'react';
import { AppProviders } from './src/app/AppProviders';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';

export default function App() {
  const [recoverKey, setRecoverKey] = useState(0);
  return (
    <AppErrorBoundary
      key={recoverKey}
      onRecover={() => setRecoverKey(k => k + 1)}>
      <AppProviders />
    </AppErrorBoundary>
  );
}
