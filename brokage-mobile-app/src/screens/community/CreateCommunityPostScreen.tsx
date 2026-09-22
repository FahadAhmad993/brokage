import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import {
  ArrowLeft,
  ImagePlus,
  Plus,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
import {createCommunityPost,} from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useThemedStyles } from '../../hooks/useThemedStyles';



const MIN_IMAGES = 2;
const MAX_IMAGES = 6;

export function CreateCommunityPostScreen() {
  const styles = useThemedStyles(buildStyles);
  const navigation = useNavigation();
const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] =
    useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');

  const DURATION_PRESETS = [24, 48, 72] as const;
  const [durationHours, setDurationHours] = useState<number>(24);
  const [customDurationText, setCustomDurationText] = useState('');
  const isCustomDuration = !(DURATION_PRESETS as readonly number[]).includes(durationHours);
  /** ₹50 per 24h block, rounded up — mirrors the server-side calc exactly. */
  const estimatedPrice = Math.max(1, Math.ceil(durationHours / 24)) * 50;

  const [selectedImages, setSelectedImages] =
    useState<Asset[]>([]);

  const [isSubmitting, setIsSubmitting] =
    useState(false);
    const [uploadProgress, setUploadProgress] =
  useState(0);

  const canAddMoreImages =
    selectedImages.length < MAX_IMAGES;

  const canCreatePost =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    city.trim().length > 0 &&
    area.trim().length > 0 &&
    durationHours >= 1 &&
    durationHours <= 720 &&
    selectedImages.length >= MIN_IMAGES &&
    selectedImages.length <= MAX_IMAGES;

  const imageCountLabel = useMemo(() => {
    return `${selectedImages.length}/${MAX_IMAGES}`;
  }, [selectedImages.length]);

  // ==========================================
  // PICK IMAGES FROM GALLERY
  // ==========================================

  const handlePickImages = async () => {
    if (!canAddMoreImages) {
      Alert.alert(
        'Maximum photos',
        `You can add maximum ${MAX_IMAGES} photos.`,
      );
      return;
    }

    const remaining =
      MAX_IMAGES - selectedImages.length;

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',

        // User ek baar mein multiple images
        // select kar sakta hai.
        selectionLimit: remaining,

        quality: 0.9,
        includeBase64: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'Gallery error',
          result.errorMessage ??
            'Could not open gallery.',
        );
        return;
      }

      const newImages =
        result.assets ?? [];

      if (newImages.length === 0) {
        return;
      }

      setSelectedImages(previous => {
        const combined = [
          ...previous,
          ...newImages,
        ];

        // Safety: maximum 6
        return combined.slice(
          0,
          MAX_IMAGES,
        );
      });
    } catch (error) {
      console.error(
        'Community post image picker error:',
        error,
      );

      Alert.alert(
        'Error',
        'Could not select images.',
      );
    }
  };

  // ==========================================
  // REMOVE IMAGE
  // ==========================================

  const handleRemoveImage = (
    index: number,
  ) => {
    setSelectedImages(previous =>
      previous.filter(
        (_, imageIndex) =>
          imageIndex !== index,
      ),
    );
  };

  // ==========================================
  // CREATE POST
  // ==========================================
const handleCreatePost = async () => {
  const trimmedTitle = title.trim();
  const trimmedDescription =
    description.trim();
  const trimmedCity = city.trim();

  // ==========================================
  // VALIDATION
  // ==========================================

  if (!trimmedTitle) {
    Alert.alert(
      'Title required',
      'Please enter a title for your post.',
    );
    return;
  }

  if (!trimmedDescription) {
    Alert.alert(
      'Description required',
      'Please enter a description.',
    );
    return;
  }

  if (!trimmedCity) {
    Alert.alert(
      'City required',
      'Please enter the city.',
    );
    return;
  }

  if (
    selectedImages.length <
    MIN_IMAGES
  ) {
    Alert.alert(
      'Add more photos',
      `Please add at least ${MIN_IMAGES} photos.`,
    );
    return;
  }

  if (
    selectedImages.length >
    MAX_IMAGES
  ) {
    Alert.alert(
      'Too many photos',
      `You can upload maximum ${MAX_IMAGES} photos.`,
    );
    return;
  }

  try {
  setIsSubmitting(true);
  setUploadProgress(0);

  // ==========================================
  // 1. UPLOAD IMAGES TO CLOUDINARY
  // ==========================================

  const uploadedImageUrls: string[] = [];

  for (
    let index = 0;
    index < selectedImages.length;
    index++
  ) {
    const asset = selectedImages[index];

    if (!asset.uri) {
      continue;
    }

    console.log(
      `Uploading image ${index + 1}/${selectedImages.length}`,
    );

    const imageUrl = await uploadImageToCloudinary(
      asset.uri,
    );

    uploadedImageUrls.push(imageUrl);

    setUploadProgress(
      (index + 1) / selectedImages.length,
    );
  }

  // ==========================================
  // 2. CHECK CLOUDINARY UPLOAD
  // ==========================================

  if (uploadedImageUrls.length < MIN_IMAGES) {
    throw new Error(
      'Some images could not be uploaded.',
    );
  }

  console.log(
    'Uploaded images:',
    uploadedImageUrls,
  );

  // ==========================================
  // 3. SAVE POST IN BACKEND
  // ==========================================

  const createdPost = await createCommunityPost({
    title: trimmedTitle,
    description: trimmedDescription,
    city: trimmedCity,
    area: area.trim(),
    images: uploadedImageUrls,
    durationHours,
  });

  console.log(
    'Community post created successfully:',
    createdPost,
  );


// Important:
// Chat screen ke community-posts query ko stale mark karega
// taake wapas aate hi latest posts fetch ho jayein.
await queryClient.invalidateQueries({
  queryKey: ['community-posts'],
});

  // ==========================================
  // 4. SUCCESS
  // ==========================================

  Alert.alert(
    'Ad sent for review',
    `Your ad was sent to the admin for verification. It will go live within 24 hours once approved — PKR ${estimatedPrice} for ${durationHours} hour${durationHours === 1 ? '' : 's'}.`,
    [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ],
  );

} catch (error) {
  console.error(
    'Create community post error:',
    error,
  );

  Alert.alert(
    'Post failed',
    error instanceof Error
      ? error.message
      : 'Could not create community post.',
  );

} finally {
  setIsSubmitting(false);
  setUploadProgress(0);
}
};
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      {/* <View style={styles.header}>
        <Pressable
          onPress={() =>
            navigation.goBack()
          }
          style={styles.backButton}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft
            size={iconSize.md}
            color={colors.textPrimary}
            strokeWidth={iconStroke}
          />
        </Pressable>

        <Text
          style={styles.headerTitle}
          numberOfLines={1}
        >
          Create Community Post
        </Text>

        <View style={styles.headerSpacer} />
      </View> */}

      {/* ================================= */}
      {/* FORM */}
      {/* ================================= */}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ================================= */}
        {/* TITLE */}
        {/* ================================= */}

        <Text style={styles.label}>
          Title
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter post title"
          placeholderTextColor={
            colors.textMuted
          }
          style={styles.input}
          maxLength={100}
          returnKeyType="next"
        />

        {/* ================================= */}
        {/* DESCRIPTION */}
        {/* ================================= */}

        <Text
          style={[
            styles.label,
            styles.labelSpacing,
          ]}
        >
          Description
        </Text>

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your property or post..."
          placeholderTextColor={
            colors.textMuted
          }
          style={[
            styles.input,
            styles.descriptionInput,
          ]}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />

        <Text style={styles.characterCount}>
          {description.length}/500
        </Text>

        {/* ================================= */}
        {/* CITY */}
        {/* ================================= */}

        <Text
          style={[
            styles.label,
            styles.labelSpacing,
          ]}
        >
          City
        </Text>

        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Enter city"
          placeholderTextColor={
            colors.textMuted
          }
          style={styles.input}
          maxLength={60}
          returnKeyType="next"
        />

        {/* ================================= */}
        {/* AREA */}
        {/* ================================= */}

        <Text
          style={[
            styles.label,
            styles.labelSpacing,
          ]}
        >
          Area
        </Text>

        <TextInput
          value={area}
          onChangeText={setArea}
          placeholder="e.g. DHA Phase 6, Gulberg…"
          placeholderTextColor={
            colors.textMuted
          }
          style={styles.input}
          maxLength={100}
          returnKeyType="done"
        />

        {/* ================================= */}
        {/* AD DURATION + PRICE */}
        {/* ================================= */}

        <Text
          style={[
            styles.label,
            styles.labelSpacing,
          ]}
        >
          How long should this ad run?
        </Text>

        <View style={styles.durationRow}>
          {DURATION_PRESETS.map(preset => (
            <Pressable
              key={preset}
              onPress={() => {
                setDurationHours(preset);
                setCustomDurationText('');
              }}
              style={[
                styles.durationChip,
                !isCustomDuration && durationHours === preset && styles.durationChipActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${preset} hours`}
            >
              <Text
                style={[
                  styles.durationChipLabel,
                  !isCustomDuration && durationHours === preset && styles.durationChipLabelActive,
                ]}
              >
                {preset}h
              </Text>
            </Pressable>
          ))}

          <View
            style={[
              styles.durationCustomWrap,
              isCustomDuration && styles.durationChipActive,
            ]}
          >
            <TextInput
              value={customDurationText}
              onChangeText={text => {
                const digitsOnly = text.replace(/[^0-9]/g, '');
                setCustomDurationText(digitsOnly);
                const n = parseInt(digitsOnly, 10);
                if (Number.isFinite(n) && n >= 1 && n <= 720) {
                  setDurationHours(n);
                }
              }}
              placeholder="Custom hrs"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={3}
              style={[
                styles.durationCustomInput,
                isCustomDuration && styles.durationChipLabelActive,
              ]}
            />
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Price for {durationHours} hour{durationHours === 1 ? '' : 's'}</Text>
          <Text style={styles.priceValue}>PKR {estimatedPrice}</Text>
        </View>
        <Text style={styles.priceHint}>
          Your ad goes live once an admin verifies it — usually within 24 hours.
        </Text>

        {/* ================================= */}
        {/* PHOTOS HEADER */}
        {/* ================================= */}

        <View
          style={[
            styles.photosHeader,
            styles.labelSpacing,
          ]}
        >
          <View>
            <Text style={styles.label}>
              Photos
            </Text>

            <Text style={styles.helperText}>
              Minimum {MIN_IMAGES}, maximum{' '}
              {MAX_IMAGES} photos
            </Text>
          </View>

          <Text
            style={[
              styles.imageCount,
              selectedImages.length >=
                MIN_IMAGES &&
                styles.imageCountValid,
            ]}
          >
            {imageCountLabel}
          </Text>
        </View>

        {/* ================================= */}
        {/* IMAGE GRID */}
        {/* ================================= */}

        {selectedImages.length > 0 && (
          <View style={styles.imageGrid}>
            {selectedImages.map(
              (asset, index) => (
                <View
                  key={`${asset.uri}-${index}`}
                  style={styles.imageWrapper}
                >
                  <Image
                    source={{
                      uri: asset.uri,
                    }}
                    style={styles.selectedImage}
                    resizeMode="cover"
                  />

                  <Pressable
                    onPress={() =>
                      handleRemoveImage(
                        index,
                      )
                    }
                    style={
                      styles.removeImageButton
                    }
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove image ${index + 1}`}
                  >
                    <X
                      size={16}
                      color="#FFFFFF"
                      strokeWidth={2.5}
                    />
                  </Pressable>

                  <View
                    style={
                      styles.imageNumber
                    }
                  >
                    <Text
                      style={
                        styles.imageNumberText
                      }
                    >
                      {index + 1}
                    </Text>
                  </View>
                </View>
              ),
            )}
          </View>
        )}

        {/* ================================= */}
        {/* ADD PHOTOS BUTTON */}
        {/* ================================= */}

        {canAddMoreImages && (
          <Pressable
            onPress={handlePickImages}
            style={({ pressed }) => [
              styles.addImagesButton,
              pressed &&
                styles.buttonPressed,
            ]}
          >
            <View
              style={
                styles.addImagesIcon
              }
            >
              <ImagePlus
                size={iconSize.md}
                color={colors.primary}
                strokeWidth={iconStroke}
              />
            </View>

            <View
              style={
                styles.addImagesTextWrap
              }
            >
              <Text
                style={
                  styles.addImagesTitle
                }
              >
                Add Photos
              </Text>

              <Text
                style={
                  styles.addImagesSubtitle
                }
              >
                Select up to{' '}
                {MAX_IMAGES -
                  selectedImages.length}{' '}
                more
              </Text>
            </View>

            <Plus
              size={iconSize.md}
              color={colors.primary}
              strokeWidth={iconStroke}
            />
          </Pressable>
        )}

        {/* ================================= */}
        {/* IMAGE VALIDATION MESSAGE */}
        {/* ================================= */}

        {selectedImages.length === 1 && (
          <Text style={styles.errorText}>
            Please add at least one more
            photo.
          </Text>
        )}

        {selectedImages.length === 0 && (
          <Text style={styles.helperText}>
            Add at least {MIN_IMAGES} photos
            to create your post.
          </Text>
        )}

        {/* ================================= */}
        {/* CREATE POST */}
        {/* ================================= */}

        <Pressable
          onPress={handleCreatePost}
          disabled={
            isSubmitting ||
            !canCreatePost
          }
          style={({ pressed }) => [
            styles.createButton,

            !canCreatePost &&
              styles.createButtonDisabled,

            pressed &&
              canCreatePost &&
              styles.buttonPressed,
          ]}
        >
         {isSubmitting ? (
  <View style={styles.uploadingContent}>
    <ActivityIndicator
      size="small"
      color="#FFFFFF"
    />

    <Text
      style={styles.createButtonText}
    >
      Uploading{' '}
      {Math.round(
        uploadProgress * 100,
      )}
      %
    </Text>
  </View>
) : (
  <Text
    style={
      styles.createButtonText
    }
  >
    Create Post
  </Text>
)}
        </Pressable>

        <View
          style={styles.bottomSpace}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const buildStyles = () => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  // ========================================
  // HEADER
  // ========================================

  header: {
    minHeight: 56,
    paddingHorizontal:
      layout.screenPaddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    borderBottomColor:
      colors.border,
    backgroundColor:
      colors.surface,
  },

  backButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    marginHorizontal: spacing.sm,
    ...typography.headline,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
  },

  headerSpacer: {
    width: layout.minTouchTarget,
  },

  // ========================================
  // CONTENT
  // ========================================

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal:
      layout.screenPaddingHorizontal,
    paddingTop: spacing.lg,
  },

  // ========================================
  // LABELS
  // ========================================

  label: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },

  labelSpacing: {
    marginTop: spacing.lg,
  },

  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },

  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },

  characterCount: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },

  // ========================================
  // INPUTS
  // ========================================

  input: {
    marginTop: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: layout.radius.md,
    borderWidth:
      StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor:
      colors.surface,
    color: colors.textPrimary,
    ...typography.body,
  },

  descriptionInput: {
    minHeight: 120,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },

  // ========================================
  // DURATION + PRICE
  // ========================================

  durationRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  durationChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  durationChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  durationChipLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  durationChipLabelActive: {
    color: colors.primary,
  },
  durationCustomWrap: {
    minWidth: 96,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    borderRadius: layout.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  durationCustomInput: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  priceRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  priceLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  priceValue: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  priceHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // ========================================
  // PHOTOS
  // ========================================

  photosHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  imageCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },

  imageCountValid: {
    color: colors.primary,
  },

  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  imageWrapper: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: layout.radius.md,
    overflow: 'hidden',
    backgroundColor:
      colors.surfaceMuted,
  },

  selectedImage: {
    width: '100%',
    height: '100%',
  },

  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(0,0,0,0.65)',
  },

  imageNumber: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(0,0,0,0.65)',
  },

  imageNumberText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  addImagesButton: {
    minHeight: 64,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor:
      colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
  },

  addImagesIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      colors.surface,
  },

  addImagesTextWrap: {
    flex: 1,
    marginLeft: spacing.sm,
  },

  addImagesTitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },

  addImagesSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // ========================================
  // uplaod content
  // ========================================
uploadingContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.sm,
},
  // ========================================
  // CREATE BUTTON
  // ========================================

  createButton: {
    minHeight: 52,
    marginTop: spacing.xl,
    borderRadius:
      layout.minTouchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      colors.primary,
  },

  createButtonDisabled: {
    opacity: 0.45,
  },

  createButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.8,
  },

  bottomSpace: {
    height: spacing.xl,
  },
});