import {
  Camera,
  Lightbulb,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react-native';
import React, { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { pickListingImages } from '../../../lib/pickListingImages';
import type { ListingFormValues } from '../../../types/listingForm';
import { colors } from '../../../theme/colors';
import { iconSize, iconStroke } from '../../../theme/icons';
import { layout } from '../../../theme/layout';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { PHOTO_STEP_INTRO } from './constants';
import { fieldStyles } from './fieldStyles';
import { useThemedStyles } from '../../../hooks/useThemedStyles';

const MAX_PHOTOS = 6;

export function StepMedia() {
  const styles = useThemedStyles(buildStyles);
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ListingFormValues>();

  const photoUris = watch('photoUris');

  const addPhotos = useCallback(async () => {
    if (photoUris.length >= MAX_PHOTOS) {
      return;
    }
    const remaining = MAX_PHOTOS - photoUris.length;
    const picked = await pickListingImages({ maxAssets: remaining });
    if (picked.length === 0) {
      return;
    }
    setValue('photoUris', [...photoUris, ...picked], {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [photoUris, setValue]);

  const removeAt = (index: number) => {
    const next = photoUris.filter((_, i) => i !== index);
    setValue('photoUris', next, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>{PHOTO_STEP_INTRO}</Text>

      <Pressable
        onPress={addPhotos}
        style={({ pressed }) => [
          styles.dropzone,
          pressed && styles.dropPressed,
          photoUris.length >= MAX_PHOTOS && styles.dropDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Add photos from library">
        <View style={styles.dropIconCircle}>
          <Camera
            color={colors.primary}
            size={22}
            strokeWidth={iconStroke}
          />
          <View style={styles.plusBadge}>
            <Plus color="#fff" size={12} strokeWidth={3} />
          </View>
        </View>
        <Text style={styles.dropTitle}>Add Photos</Text>
        <Text style={styles.dropHint}>
          Tap to choose from your photo library (up to {MAX_PHOTOS} images)
        </Text>
      </Pressable>

      {errors.photoUris?.message ? (
        <Text style={fieldStyles.errorText}>{errors.photoUris.message}</Text>
      ) : null}

      {photoUris.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbRow}>
          {photoUris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} />
              {index === 0 ? (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverText}>COVER</Text>
                </View>
              ) : null}
              <View style={styles.thumbActions}>
                <Pressable
                  style={[styles.actionBtn, styles.actionEdit]}
                  onPress={addPhotos}
                  hitSlop={6}
                  accessibilityLabel="Add more photos">
                  <Pencil
                    color={colors.primary}
                    size={14}
                    strokeWidth={2}
                  />
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.actionDel]}
                  onPress={() => removeAt(index)}
                  hitSlop={6}
                  accessibilityLabel="Remove photo">
                  <Trash2 color={colors.danger} size={14} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.expert}>
        <View style={styles.expertHead}>
          <Lightbulb
            color={colors.accentBrown}
            size={iconSize.md}
            strokeWidth={iconStroke}
          />
          <Text style={styles.expertTitle}>Expert tips</Text>
        </View>
        <Text style={styles.expertBullet}>
          • Shoot in natural light (golden hour works beautifully for interiors).
        </Text>
        <Text style={styles.expertBullet}>
          • Clear surfaces and open curtains so rooms feel bright and spacious.
        </Text>
        <Text style={styles.expertBullet}>
          • Capture wide angles of living spaces, then detail shots of finishes.
        </Text>
      </View>
    </View>
  );
}

const buildStyles = () => StyleSheet.create({
  wrap: { gap: spacing.lg },
  lead: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  dropzone: {
    borderWidth: 1.5,
    borderColor: colors.ringPrimaryFocus,
    borderStyle: 'dashed',
    borderRadius: layout.radius.xl,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropPressed: { opacity: 0.94 },
  dropDisabled: { opacity: 0.55 },
  dropIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  dropHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  thumbRow: {
    gap: spacing.md,
    paddingVertical: 4,
  },
  thumbWrap: {
    width: 132,
    height: 132,
    borderRadius: layout.radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: layout.radius.sm,
  },
  coverText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
  },
  thumbActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEdit: {
    backgroundColor: 'rgba(219,234,254,0.95)',
  },
  actionDel: {
    backgroundColor: 'rgba(254,226,226,0.95)',
  },
  expert: {
    padding: spacing.lg,
    borderRadius: layout.radius.lg,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.sm,
  },
  expertHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  expertTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.accentBrown,
    textTransform: 'uppercase',
  },
  expertBullet: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
