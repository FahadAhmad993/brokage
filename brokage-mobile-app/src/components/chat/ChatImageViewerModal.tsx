/**
 * WhatsApp-style full-screen image viewer.
 *
 * Previously tapping a photo in a chat bubble did nothing — the only way to
 * see it at full size was to already be looking at the small inline
 * thumbnail. This opens it full-screen on tap, with a close button and a
 * "save to device" download action, matching the familiar tap-to-expand
 * behavior from WhatsApp/Telegram/etc.
 */
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Download, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppToast } from '../appAlert';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = {
  /** `null`/undefined = closed. Passing a url opens the viewer on it. */
  imageUrl: string | null | undefined;
  onClose: () => void;
};

async function ensureAndroidSavePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  // Android 13+ (API 33) scoped media permissions don't require this for
  // saving via MediaStore, but older OS versions do — request write access
  // and treat "already granted" / "not required" both as success.
  if (Platform.Version >= 33) {
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

export function ChatImageViewerModal({ imageUrl, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const toast = useAppToast();

  const handleDownload = async () => {
    if (!imageUrl || saving) {
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
      await CameraRoll.save(imageUrl, { type: 'photo' });
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
      visible={Boolean(imageUrl)}
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

          {/* Tapping the backdrop (not the photo itself) also closes —
              standard full-screen viewer behavior. */}
          <Pressable style={styles.imageArea} onPress={onClose}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : null}
          </Pressable>

          <Text style={styles.hint}>Tap anywhere to close</Text>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
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
  imageArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hint: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
});
