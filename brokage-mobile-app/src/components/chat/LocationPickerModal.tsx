import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocateFixed, MapPin, Minus, Plus, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { layout } from '../../theme/layout';
import { iconSize, iconStroke } from '../../theme/icons';
import {
  buildOsmTileUrl,
  buildStaticMapPreview,
  captureCurrentLocation,
  lonLatToWorldPixel,
  reverseGeocode,
  worldPixelToLonLat,
  STATIC_MAP_ZOOM,
} from '../../lib/shareLocation';
import type { ChatLocationRef } from '../../types/models';
import { useThemedStyles } from '../../hooks/useThemedStyles';

const DEFAULT_CENTER = { latitude: 31.5204, longitude: 74.3587 }; // Lahore fallback

export function LocationPickerModal({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (location: ChatLocationRef) => void;
}) {
  const styles = useThemedStyles(buildStyles);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(STATIC_MAP_ZOOM);
  const [mode, setMode] = useState<'idle' | 'locating' | 'map'>('idle');
  const [resolving, setResolving] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const preview = useMemo(
    () => buildStaticMapPreview(center.latitude, center.longitude, zoom),
    [center, zoom],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderMove: (_e, g) => {
          // Drag the map opposite to finger movement (pin stays fixed at
          // center, map moves under it) — same feel as Uber's pin picker.
          const { x: worldX, y: worldY } = lonLatToWorldPixel(
            center.longitude,
            center.latitude,
            zoom,
          );
          const nextX = worldX - (g.dx - dragOffset.current.x);
          const nextY = worldY - (g.dy - dragOffset.current.y);
          dragOffset.current = { x: g.dx, y: g.dy };
          const next = worldPixelToLonLat(nextX, nextY, zoom);
          setCenter({ latitude: next.latitude, longitude: next.longitude });
        },
        onPanResponderRelease: () => {
          dragOffset.current = { x: 0, y: 0 };
        },
        onPanResponderTerminate: () => {
          dragOffset.current = { x: 0, y: 0 };
        },
      }),
    [center, zoom],
  );

  const useCurrentLocation = useCallback(async () => {
    setMode('locating');
    try {
      const loc = await captureCurrentLocation();
      onSend(loc);
      onClose();
    } catch {
      // captureCurrentLocation already produces a readable message; the
      // composer's existing error strip isn't reachable from here, so fall
      // back to letting the user try the map instead.
      setMode('map');
      setCenter(DEFAULT_CENTER);
    } finally {
      setMode(m => (m === 'locating' ? 'idle' : m));
    }
  }, [onClose, onSend]);

  const confirmMapPin = useCallback(async () => {
    setResolving(true);
    try {
      const label = await reverseGeocode(center.latitude, center.longitude);
      onSend({ latitude: center.latitude, longitude: center.longitude, label });
      onClose();
    } finally {
      setResolving(false);
    }
  }, [center, onClose, onSend]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Share location</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <X color={colors.textPrimary} size={iconSize.md} strokeWidth={iconStroke} />
          </Pressable>
        </View>

        {mode !== 'map' ? (
          <View style={styles.choiceBody}>
            <Pressable
              style={({ pressed }) => [styles.choiceCard, pressed && styles.choicePressed]}
              onPress={useCurrentLocation}
              disabled={mode === 'locating'}
              accessibilityRole="button"
              accessibilityLabel="Send my current location">
              {mode === 'locating' ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <LocateFixed color={colors.primary} size={iconSize.lg} strokeWidth={iconStroke} />
              )}
              <View style={styles.choiceText}>
                <Text style={styles.choiceTitle}>Current location</Text>
                <Text style={styles.choiceSubtitle}>Share exactly where you are right now</Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.choiceCard, pressed && styles.choicePressed]}
              onPress={() => setMode('map')}
              accessibilityRole="button"
              accessibilityLabel="Pick a location on the map">
              <MapPin color={colors.primary} size={iconSize.lg} strokeWidth={iconStroke} />
              <View style={styles.choiceText}>
                <Text style={styles.choiceTitle}>Select from map</Text>
                <Text style={styles.choiceSubtitle}>Drag the map to drop a pin anywhere</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={styles.mapBody}>
            <View style={styles.mapArea} {...panResponder.panHandlers}>
              <View style={styles.mapTileGrid} pointerEvents="none">
                {preview.tiles.map((tile, i) => (
                  <Image
                    key={`${tile.x}-${tile.y}-${i}`}
                    source={{ uri: buildOsmTileUrl(tile, zoom) }}
                    style={styles.mapTile}
                  />
                ))}
              </View>
              <View style={styles.mapCenterPin} pointerEvents="none">
                <MapPin color={colors.primary} size={32} strokeWidth={2} fill={colors.primary} />
              </View>
            </View>

            <View style={styles.zoomControls}>
              <Pressable
                style={styles.zoomBtn}
                onPress={() => setZoom(z => Math.min(19, z + 1))}
                accessibilityRole="button"
                accessibilityLabel="Zoom in">
                <Plus color={colors.textPrimary} size={iconSize.sm} strokeWidth={iconStroke} />
              </Pressable>
              <Pressable
                style={styles.zoomBtn}
                onPress={() => setZoom(z => Math.max(3, z - 1))}
                accessibilityRole="button"
                accessibilityLabel="Zoom out">
                <Minus color={colors.textPrimary} size={iconSize.sm} strokeWidth={iconStroke} />
              </Pressable>
            </View>

            <View style={styles.mapFooter}>
              <Text style={styles.mapHint}>Drag the map so the pin sits on the right spot</Text>
              <Pressable
                style={({ pressed }) => [styles.sendMapBtn, pressed && styles.choicePressed]}
                onPress={confirmMapPin}
                disabled={resolving}
                accessibilityRole="button"
                accessibilityLabel="Send this location">
                {resolving ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.sendMapBtnLabel}>Send this location</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const MAP_SIZE = 320;

const buildStyles = () => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.headline, fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  choiceBody: { padding: spacing.md, gap: spacing.sm },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: layout.radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  choicePressed: { opacity: 0.85 },
  choiceText: { flex: 1 },
  choiceTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.textPrimary },
  choiceSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  mapBody: { flex: 1, alignItems: 'center', paddingTop: spacing.md },
  mapArea: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    borderRadius: layout.radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  mapTileGrid: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mapTile: { width: MAP_SIZE / 2, height: MAP_SIZE / 2 },
  mapCenterPin: {
    position: 'absolute',
    top: MAP_SIZE / 2 - 32,
    left: MAP_SIZE / 2 - 16,
  },
  zoomControls: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.md + MAP_SIZE / 2 - 44,
    gap: spacing.xs,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 2 },
      default: {},
    }),
  },
  mapFooter: { width: '100%', padding: spacing.md, gap: spacing.sm, marginTop: 'auto' },
  mapHint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  sendMapBtn: {
    backgroundColor: colors.primary,
    borderRadius: layout.radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  sendMapBtnLabel: { ...typography.bodySmall, color: colors.onPrimary, fontWeight: '700' },
});
