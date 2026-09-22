import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';
import { useThemedStyles } from '../../hooks/useThemedStyles';

/** Soft brand blobs behind auth forms (non-interactive). */
export function AuthDecor() {
  const styles = useThemedStyles(buildStyles);
  return (
    <>
      <View style={styles.blobTop} pointerEvents="none" />
      <View style={styles.blobBottom} pointerEvents="none" />
    </>
  );
}

const buildStyles = () => StyleSheet.create({
  blobTop: {
    position: 'absolute',
    top: -96,
    right: -96,
    width: 384,
    height: 384,
    borderRadius: 9999,
    backgroundColor: colors.washPrimary,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 9999,
    backgroundColor: colors.washAccent,
  },
});
