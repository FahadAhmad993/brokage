import { InteractionManager, Linking } from 'react-native';
import { showAppAlert } from './globalAppAlert';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type CameraOptions,
  type ImageLibraryOptions,
} from 'react-native-image-picker';

export async function takeChatPhoto(): Promise<string | null> {
  const options: CameraOptions = {
    mediaType: 'photo',
    quality: 0.9,
    cameraType: 'back',
    saveToPhotos: false,
  };

  try {
    const result = await launchCamera(options);

    if (result.didCancel) {
      return null;
    }

    const err = result.errorMessage ?? result.errorCode;

    if (err) {
      showAppAlert({
        title: 'Camera',
        message: String(err),
      });

      return null;
    }

    return result.assets?.[0]?.uri ?? null;
  } catch {
    showAppAlert({
      title: 'Camera',
      message: 'Could not open the camera.',
    });

    return null;
  }
}

function assetUris(assets: Asset[] | undefined): string[] {
  if (!assets?.length) {
    return [];
  }
  return assets
    .map(a => a.uri)
    .filter((u): u is string => typeof u === 'string' && u.length > 0);
}

function openLibrary(max: number): Promise<string[]> {
  // Use library defaults for presentationStyle (pageSheet). Forcing fullScreen
  // here broke the picker when Add Property is shown as a native-stack modal.
  const libOptions: ImageLibraryOptions = {
    mediaType: 'photo',
    quality: 0.9,
    selectionLimit: max,
  };

  return launchImageLibrary(libOptions).then(result => {
    if (result.didCancel) {
      return [];
    }
    const err = result.errorMessage ?? result.errorCode;
    if (err) {
      const code = result.errorCode;
      if (code === 'permission') {
        showAppAlert({
          title: 'Photos',
          message:
            'Allow photo library access in Settings to add listing images.',
          buttons: [
            { text: 'Not now', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() },
          ],
        });
      } else {
        showAppAlert({ title: 'Photos', message: String(err) });
      }
      return [];
    }
    return assetUris(result.assets);
  });
}

/**
 * Opens the photo library and returns local `file://` or `content://` URIs.
 * Does not request broad Android storage/media permissions: the system Photo
 * Picker (used by react-native-image-picker) grants access to the items the
 * user selects without READ_MEDIA_IMAGES / READ_EXTERNAL_STORAGE.
 */
/** Single photo for profile avatar — same picker pipeline as listing photos. */
export async function pickProfileAvatar(): Promise<string | null> {
  const uris = await pickListingImages({ maxAssets: 1 });
  return uris[0] ?? null;
}

export async function pickListingImages(options: {
  maxAssets: number;
}): Promise<string[]> {
  const max = Math.max(1, Math.min(10, options.maxAssets));

  try {
    await new Promise<void>(resolve => {
      InteractionManager.runAfterInteractions(() => {
        // One frame after interactions so the native-stack modal finishes
        // presenting before we present the picker (iOS + Android).
        requestAnimationFrame(() => resolve());
      });
    });
    return await openLibrary(max);
  } catch {
    showAppAlert({
      title: 'Photos',
      message: 'Could not open your photo library.',
    });
    return [];
  }
}
