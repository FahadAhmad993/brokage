/**
 * Full-screen gallery for a post's photos with a Download button.
 *
 * Download saves a *snapshot of the branded view* (watermark + broker name +
 * countdown + eye/members counter), not the raw remote file, so every saved
 * photo of an ad — all 10 of them, if that's how many it has — carries the
 * same overlays. Implemented with `react-native-view-shot` (native module:
 * the app needs a rebuild after `npm install`).
 */
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Download, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { useAppToast } from '../appAlert';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PostPhotoOverlay } from './PostPhotoOverlay';

type Props = {
  images: string[];
  /** Index to open on; `null` = closed. */
  startIndex: number | null;
  onClose: () => void;
  brokerName?: string | null;
  viewCount?: number;
  remainingLabel?: string | null;
};

async function ensureAndroidSavePermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version >= 33) {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Save photo',
        message: 'Allow Brokage to save this photo to your gallery.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export function PostImageViewerModal({
  images,
  startIndex,
  onClose,
  brokerName,
  viewCount,
  remainingLabel,
}: Props) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const toast = useAppToast();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  // image index -> aspect ratio (w/h), measured once per photo.
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const captureRefs = useRef<Record<number, View | null>>({});
  const open = startIndex !== null;

  useEffect(() => {
    if (startIndex !== null) {
      setIndex(startIndex);
      setLoaded({});
    }
  }, [startIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }
    images.forEach(uri => {
      Image.getSize(
        uri,
        (w, h) => {
          if (w > 0 && h > 0) {
            setRatios(prev => (prev[uri] ? prev : { ...prev, [uri]: w / h }));
          }
        },
        () => undefined,
      );
    });
  }, [open, images]);

  const maxPhotoH = screenH - 190;
  const sizeFor = useCallback(
    (uri: string) => {
      const ratio = ratios[uri] ?? 4 / 3;
      let w = screenW;
      let h = w / ratio;
      if (h > maxPhotoH) {
        h = maxPhotoH;
        w = h * ratio;
      }
      return { w: Math.round(w), h: Math.round(h) };
    },
    [ratios, screenW, maxPhotoH],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index !== null && first?.index !== undefined) {
        setIndex(first.index);
      }
    },
  ).current;

  const handleDownload = async () => {
    if (saving) {
      return;
    }
    const target = captureRefs.current[index];
    if (!target || !loaded[index]) {
      toast({
        title: 'Please wait',
        message: 'The photo is still loading.',
        kind: 'info',
      });
      return;
    }
    setSaving(true);
    try {
      const allowed = await ensureAndroidSavePermission();
      if (!allowed) {
        toast({
          title: 'Permission needed',
          message: 'Enable photo library access in Settings to save images.',
          kind: 'info',
        });
        return;
      }
      const uri = await captureRef(target, {
        format: 'jpg',
        quality: 0.95,
        result: 'tmpfile',
      });
      const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      await CameraRoll.save(fileUri, { type: 'photo' });
      toast({ title: 'Saved', message: 'Photo saved to your gallery.', kind: 'success' });
    } catch (err) {
      toast({
        title: 'Could not save photo',
        message: err instanceof Error ? err.message : 'Please try again.',
        kind: 'info',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.toolbar}>
            <Pressable
              onPress={onClose}
              hitSlop={layout.hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Close photo"
              style={styles.toolbarButton}>
              <X color="#FFFFFF" size={iconSize.lg} strokeWidth={iconStroke} />
            </Pressable>
            {images.length > 1 ? (
              <Text style={styles.counter}>
                {index + 1} / {images.length}
              </Text>
            ) : (
              <View />
            )}
            <Pressable
              onPress={handleDownload}
              disabled={saving}
              hitSlop={layout.hitSlop}
              accessibilityRole="button"
              accessibilityLabel="Download photo"
              style={styles.toolbarButton}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Download color="#FFFFFF" size={iconSize.lg} strokeWidth={iconStroke} />
              )}
            </Pressable>
          </View>

          {open ? (
            <FlatList
              style={styles.list}
              data={images}
              keyExtractor={(uri, i) => `${uri}-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={Math.min(startIndex ?? 0, Math.max(images.length - 1, 0))}
              getItemLayout={(_, i) => ({ length: screenW, offset: screenW * i, index: i })}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
              renderItem={({ item, index: i }) => {
                const { w, h } = sizeFor(item);
                return (
                  <View style={[styles.page, { width: screenW }]}>
                    <PostPhotoOverlay
                      ref={r => {
                        captureRefs.current[i] = r;
                      }}
                      uri={item}
                      width={w}
                      height={h}
                      resizeMode="contain"
                      brokerName={brokerName}
                      viewCount={viewCount}
                      remainingLabel={remainingLabel}
                      onImageLoad={() => setLoaded(prev => ({ ...prev, [i]: true }))}
                    />
                  </View>
                );
              }}
            />
          ) : null}

          <Text style={styles.hint}>
            {images.length > 1 ? 'Swipe for more · ' : ''}Download saves with the Broker watermark
          </Text>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.96)' },
  safe: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toolbarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  list: { flex: 1 },
  counter: { ...typography.bodySmall, color: '#FFFFFF', fontWeight: '700' },
  page: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  hint: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
});
