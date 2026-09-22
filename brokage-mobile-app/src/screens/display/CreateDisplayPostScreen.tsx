import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { ArrowLeft, Plus, X } from 'lucide-react-native';
import {
  createDisplayPost,
  errorMessage,
  fetchDisplayConfig,
  quoteDisplayPostPrice,
  updateDisplayPost,
} from '../../api/client';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
import { pickListingImages } from '../../lib/pickListingImages';
import { useAppAlert, useAppToast } from '../../components/appAlert';
import type { MainStackParamList } from '../../navigation/types';
import type { DisplayPostConfig } from '../../types/models';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Nav = NativeStackNavigationProp<MainStackParamList, 'CreateDisplayPost'>;
type Route = RouteProp<MainStackParamList, 'CreateDisplayPost'>;

const DURATION_PRESETS = [24, 48, 72];

/**
 * The optional spec fields from the product's handwritten notes — "Bed,
 * Bath, Kitchen, Carporch or TV Lounge Demanded" — anything the poster
 * leaves blank simply doesn't show on the post later.
 */
const OPTIONAL_FIELDS: { key: string; label: string; keyboard?: 'numeric' }[] = [
  { key: 'bedrooms', label: 'Bedrooms', keyboard: 'numeric' },
  { key: 'bathrooms', label: 'Bathrooms', keyboard: 'numeric' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'carporch', label: 'Carporch' },
  { key: 'tvLounge', label: 'TV Lounge' },
];

export function CreateDisplayPostScreen() {
  const styles = useThemedStyles(buildStyles);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editPost = route.params?.editPost;
  const alert = useAppAlert();
  const toast = useAppToast();

  const [config, setConfig] = useState<DisplayPostConfig | null>(null);
  const [images, setImages] = useState<string[]>(editPost?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [marlaSize, setMarlaSize] = useState(editPost ? String(editPost.marlaSize) : '');
  const [city, setCity] = useState(editPost?.city ?? '');
  const [area, setArea] = useState(editPost?.area ?? '');
  const [description, setDescription] = useState(editPost?.description ?? '');
  const [fields, setFields] = useState<Record<string, string>>(editPost?.extraFields ?? {});
  const [durationHours, setDurationHours] = useState(editPost?.durationHours ?? 24);
  const [price, setPrice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = Boolean(editPost);

  useEffect(() => {
    fetchDisplayConfig()
      .then(setConfig)
      .catch(() => setConfig({ pricePerHourPkr: 2.0833, minImages: 1, maxImages: 7 }));
  }, []);

  useEffect(() => {
    if (isEditing) {
      // Duration/price were already paid for on the original post — not
      // re-quoted on edit.
      return;
    }
    let cancelled = false;
    quoteDisplayPostPrice(durationHours)
      .then(res => {
        if (!cancelled) setPrice(res.price);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [durationHours, isEditing]);

  const maxImages = config?.maxImages ?? 7;
  const minImages = config?.minImages ?? 1;

  const addImages = async () => {
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      return;
    }
    const picked = await pickListingImages({ maxAssets: remaining });
    if (!picked.length) {
      return;
    }
    setUploading(true);
    try {
      const uploaded = await Promise.all(picked.map(uri => uploadImageToCloudinary(uri)));
      setImages(prev => [...prev, ...uploaded]);
    } catch (err) {
      alert({ title: 'Upload failed', message: errorMessage(err, 'Could not upload photos.') });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (uri: string) => {
    setImages(prev => prev.filter(u => u !== uri));
  };

  const setField = (key: string, value: string) => {
    setFields(prev => {
      const next = { ...prev };
      if (value.trim()) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const canSubmit =
    images.length >= minImages &&
    images.length <= maxImages &&
    Number(marlaSize) > 0 &&
    !uploading &&
    !submitting;

  const onSubmit = async () => {
    setFormError(null);
    if (images.length < minImages) {
      setFormError(`Please add at least ${minImages} photo${minImages === 1 ? '' : 's'}.`);
      return;
    }
    const marla = Number(marlaSize);
    if (!marla || marla <= 0) {
      setFormError('Please enter a valid plot/house size in Marla.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editPost) {
        await updateDisplayPost(editPost.id, {
          images,
          marlaSize: marla,
          city: city.trim() || undefined,
          area: area.trim() || undefined,
          description: description.trim() || undefined,
          extraFields: fields,
        });
        toast({ title: 'Updated', message: 'Your post has been updated.', kind: 'success' });
      } else {
        await createDisplayPost({
          images,
          marlaSize: marla,
          city: city.trim() || undefined,
          area: area.trim() || undefined,
          description: description.trim() || undefined,
          extraFields: fields,
          durationHours,
        });
        toast({
          title: 'Post submitted',
          message: 'Sent for review — it will appear on your Display once approved.',
          kind: 'success',
        });
      }
      navigation.goBack();
    } catch (err) {
      setFormError(errorMessage(err, 'Could not save this post.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={layout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ArrowLeft color={colors.primary} size={iconSize.md} strokeWidth={iconStroke} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Post' : 'Add Post'}</Text>
        <View style={{ width: iconSize.md }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* ---- Photos ---- */}
        <Text style={styles.sectionLabel}>
          Photos ({images.length}/{maxImages})
        </Text>
        <View style={styles.photoGrid}>
          {images.map(uri => (
            <View key={uri} style={styles.photoTile}>
              <Image source={{ uri }} style={styles.photoImg} />
              <Pressable
                onPress={() => removeImage(uri)}
                style={styles.photoRemove}
                hitSlop={layout.hitSlop}
                accessibilityRole="button"
                accessibilityLabel="Remove photo">
                <X color="#FFFFFF" size={14} strokeWidth={2.5} />
              </Pressable>
            </View>
          ))}
          {images.length < maxImages ? (
            <Pressable
              onPress={addImages}
              disabled={uploading}
              style={styles.photoAdd}
              accessibilityRole="button"
              accessibilityLabel="Add photos">
              {uploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Plus color={colors.primary} size={iconSize.lg} strokeWidth={iconStroke} />
              )}
            </Pressable>
          ) : null}
        </View>

        {/* ---- Required: Marla size ---- */}
        <Text style={styles.sectionLabel}>Size (Marla) *</Text>
        <TextInput
          value={marlaSize}
          onChangeText={setMarlaSize}
          placeholder="e.g. 5"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        {/* ---- Location (optional) ---- */}
        <Text style={styles.sectionLabel}>Location (optional)</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="City — e.g. Lahore"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <View style={{ height: spacing.xs }} />
        <TextInput
          value={area}
          onChangeText={setArea}
          placeholder="Area — e.g. DHA Phase 6"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        {/* ---- Optional specs ---- */}
        <Text style={styles.sectionLabel}>Details (optional — leave blank to skip)</Text>
        {OPTIONAL_FIELDS.map(f => (
          <View key={f.key} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <TextInput
              value={fields[f.key] ?? ''}
              onChangeText={v => setField(f.key, v)}
              placeholder={f.keyboard === 'numeric' ? 'e.g. 3' : 'e.g. Yes'}
              placeholderTextColor={colors.textMuted}
              keyboardType={f.keyboard}
              style={styles.fieldInput}
            />
          </View>
        ))}

        {/* ---- Description ---- */}
        <Text style={styles.sectionLabel}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Anything else buyers should know…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          style={[styles.input, styles.textArea]}
        />

        {/* ---- Duration / price (new posts only) ---- */}
        {!isEditing ? (
          <>
            <Text style={styles.sectionLabel}>How long should this run?</Text>
            <View style={styles.durationRow}>
              {DURATION_PRESETS.map(h => (
                <Pressable
                  key={h}
                  onPress={() => setDurationHours(h)}
                  style={[
                    styles.durationChip,
                    durationHours === h && styles.durationChipActive,
                  ]}>
                  <Text
                    style={[
                      styles.durationChipText,
                      durationHours === h && styles.durationChipTextActive,
                    ]}>
                    {h}h
                  </Text>
                </Pressable>
              ))}
            </View>
            {price !== null ? (
              <Text style={styles.priceHint}>Estimated cost: PKR {price.toFixed(0)}</Text>
            ) : null}
          </>
        ) : null}

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}>
          {submitting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitBtnText}>
              {isEditing ? 'Save changes' : 'Submit for review'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const buildStyles = () =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.topBar,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.topBarBorder,
    },
    headerTitle: {
      ...typography.body,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    scrollContent: {
      padding: layout.screenPaddingHorizontal,
      paddingBottom: spacing.xxl,
      gap: spacing.xs,
    },
    sectionLabel: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    photoTile: {
      width: 84,
      height: 84,
      borderRadius: layout.radius.md,
      overflow: 'hidden',
      position: 'relative',
    },
    photoImg: { width: '100%', height: '100%' },
    photoRemove: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoAdd: {
      width: 84,
      height: 84,
      borderRadius: layout.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      ...typography.body,
      color: colors.textPrimary,
      backgroundColor: colors.surfaceMuted,
      borderRadius: layout.radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    fieldLabel: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      flex: 1,
    },
    fieldInput: {
      ...typography.bodySmall,
      color: colors.textPrimary,
      backgroundColor: colors.surfaceMuted,
      borderRadius: layout.radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      minWidth: 110,
      textAlign: 'right',
    },
    durationRow: { flexDirection: 'row', gap: spacing.sm },
    durationChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: layout.radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    durationChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    durationChipText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
    durationChipTextActive: { color: colors.onPrimary },
    priceHint: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    errorText: {
      ...typography.bodySmall,
      color: colors.danger,
      marginTop: spacing.md,
    },
    submitBtn: {
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: layout.radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: {
      ...typography.body,
      fontWeight: '700',
      color: colors.onPrimary,
    },
  });
