import type { LucideIcon } from 'lucide-react-native';
import {
  Bath,
  BedDouble,
  Car,
  Dumbbell,
  Heart,
  MapPin,
  Pencil,
  Ruler,
  Shield,
  Waves,
  Wifi,
  Wind,
} from 'lucide-react-native';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DEFAULT_USER_LISTING_IMAGE } from '../../../api/mockData';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import type { ListingFormValues } from '../../../types/listingForm';
import { colors } from '../../../theme/colors';
import { iconStroke } from '../../../theme/icons';
import { layout } from '../../../theme/layout';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { AMENITY_OPTIONS, CATEGORY_OPTIONS } from './constants';
import { fieldStyles } from './fieldStyles';

type Props = {
  onEditPropertyDetails: () => void;
};

const AMENITY_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  parking: Car,
  air: Wind,
  pool: Waves,
  gym: Dumbbell,
  pets: Heart,
};

function MiniField({
  name,
  icon: Icon,
  label,
  placeholder,
  keyboardType,
  suffix,
}: {
  name: 'bedrooms' | 'bathrooms' | 'sqft';
  icon: LucideIcon;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
  suffix?: string;
}) {
  const styles = useThemedStyles(buildStyles);
  const { control } = useFormContext<ListingFormValues>();
  return (
    <View style={styles.miniCol}>
      <View style={styles.miniLabelRow}>
        <Icon
          color={colors.textSecondary}
          size={14}
          strokeWidth={iconStroke}
        />
        <Text style={styles.miniLabel}>{label}</Text>
      </View>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.miniInputWrap}>
            <TextInput
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor="rgba(121,117,134,0.55)"
              keyboardType={keyboardType ?? 'default'}
              style={styles.miniInput}
            />
            {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

export function StepReview({ onEditPropertyDetails }: Props) {
  const styles = useThemedStyles(buildStyles);
  const { control, watch, setValue } = useFormContext<ListingFormValues>();

  const title = watch('title');
  const address = watch('address');
  const price = watch('price');
  const category = watch('category');
  const photoUris = watch('photoUris');
  const amenities = watch('amenities');

  const cat =
    CATEGORY_OPTIONS.find(c => c.key === category)?.label ?? '—';
  const coverUri = photoUris[0] ?? DEFAULT_USER_LISTING_IMAGE;
  const priceDisplay = price.trim()
    ? `$${price.replace(/[^0-9.]/g, '')}/mo`
    : '—';

  const toggleAmenity = (id: string) => {
    const set = new Set(amenities);
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
    setValue('amenities', [...set], { shouldDirty: true, shouldValidate: false });
  };

  return (
    <View style={styles.root}>
      <View style={styles.previewCard}>
        <View style={styles.previewImageWrap}>
          <Image source={{ uri: coverUri }} style={styles.previewImage} />
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>PREVIEW</Text>
          </View>
          <Pressable
            style={styles.previewEdit}
            onPress={onEditPropertyDetails}
            hitSlop={8}
            accessibilityLabel="Edit property details">
            <Pencil color={colors.primary} size={18} strokeWidth={2} />
          </Pressable>
        </View>
        {photoUris.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={styles.previewThumbRow}>
            {photoUris.map((uri, i) => (
              <View key={`${uri}:${i}`} style={styles.previewThumbWrap}>
                <Image source={{ uri }} style={styles.previewThumb} />
                {i === 0 ? (
                  <View style={styles.previewThumbCover}>
                    <Text style={styles.previewThumbCoverText}>Cover</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.previewBody}>
          <Text style={styles.previewTitle} numberOfLines={2}>
            {title.trim() || 'Untitled listing'}
          </Text>
          <View style={styles.previewLoc}>
            <MapPin
              size={14}
              color={colors.textSecondary}
              strokeWidth={iconStroke}
            />
            <Text style={styles.previewLocText} numberOfLines={2}>
              {address.trim() || 'Address not set'}
            </Text>
          </View>
          <Text style={styles.previewMeta}>
            {cat} · {priceDisplay}
          </Text>
        </View>
      </View>

      <View style={styles.optionalRow}>
        <Text style={fieldStyles.label}>Description</Text>
        <Text style={styles.optionalTag}>Optional</Text>
      </View>
      <Controller
        control={control}
        name="description"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Describe the soul of this space..."
            placeholderTextColor="rgba(121,117,134,0.45)"
            multiline
            textAlignVertical="top"
            style={[fieldStyles.input, styles.textArea]}
          />
        )}
      />

      <Text style={[fieldStyles.label, styles.mt]}>Quick specs</Text>
      <View style={styles.grid}>
        <MiniField
          name="bedrooms"
          icon={BedDouble}
          label="Bedrooms"
          placeholder="—"
          keyboardType="number-pad"
        />
        <MiniField
          name="bathrooms"
          icon={Bath}
          label="Bathrooms"
          placeholder="—"
          keyboardType="decimal-pad"
        />
      </View>
      <View style={styles.fullRow}>
        <MiniField
          name="sqft"
          icon={Ruler}
          label="Interior size"
          placeholder="e.g. 1200"
          keyboardType="number-pad"
          suffix="sq ft"
        />
      </View>

      <Text style={[fieldStyles.label, styles.mt]}>Key amenities</Text>
      <View style={styles.amenityGrid}>
        {AMENITY_OPTIONS.map(a => {
          const active = amenities.includes(a.id);
          const Icon = AMENITY_ICONS[a.id] ?? Heart;
          return (
            <Pressable
              key={a.id}
              onPress={() => toggleAmenity(a.id)}
              style={({ pressed }) => [
                styles.amenityPill,
                active && styles.amenityPillActive,
                pressed && { opacity: 0.92 },
              ]}>
              <Icon
                size={16}
                color={active ? '#fff' : colors.textSecondary}
                strokeWidth={iconStroke}
              />
              <Text
                style={[styles.amenityLabel, active && styles.amenityLabelOn]}>
                {a.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.assurance}>
        <View style={styles.assuranceHead}>
          <Shield color={colors.accentBrown} size={22} strokeWidth={2} />
          <Text style={styles.assuranceTitle}>Velvet Assurance</Text>
        </View>
        <Text style={styles.assuranceBody}>
          Every new listing is reviewed by our editorial team within 24 hours. We
          check for clarity, accuracy, and alignment with Brokage standards
          before it appears in Discover.
        </Text>
      </View>
    </View>
  );
}

const buildStyles = () => StyleSheet.create({
  root: { gap: 0 },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  previewImageWrap: {
    height: 160,
    backgroundColor: colors.surfaceMuted,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewThumbRow: {
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  previewThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: layout.radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  previewThumb: {
    width: '100%',
    height: '100%',
  },
  previewThumbCover: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: colors.primaryBadgeOverlay,
    borderRadius: 4,
    paddingVertical: 1,
    alignItems: 'center',
  },
  previewThumbCoverText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  previewBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.overlayOnPhoto,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: layout.radius.sm,
  },
  previewBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.textPrimary,
  },
  previewEdit: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.overlayOnPhoto,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  previewBody: {
    padding: spacing.md,
    gap: 6,
  },
  previewTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  previewLoc: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  previewLocText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  previewMeta: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.primary,
  },
  optionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  optionalTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.textMuted,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
    marginTop: spacing.sm,
  },
  mt: { marginTop: spacing.lg },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  fullRow: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 0,
  },
  miniCol: { flex: 1 },
  miniLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  miniLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  miniInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,196,215,0.18)',
    paddingHorizontal: spacing.md,
  },
  miniInput: {
    flex: 1,
    paddingVertical: 12,
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  suffix: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  amenityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.sm,
  },
  amenityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: layout.radius.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: 'rgba(201,196,215,0.2)',
  },
  amenityPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  amenityLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    maxWidth: 200,
  },
  amenityLabelOn: {
    color: '#fff',
  },
  assurance: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: layout.radius.lg,
    backgroundColor: colors.tipBg,
    borderWidth: 1,
    borderColor: 'rgba(113,51,0,0.12)',
    gap: spacing.sm,
  },
  assuranceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assuranceTitle: {
    ...typography.headline,
    fontSize: 17,
    color: colors.accentBrown,
  },
  assuranceBody: {
    ...typography.bodySmall,
    color: colors.tipText,
    lineHeight: 22,
  },
});
