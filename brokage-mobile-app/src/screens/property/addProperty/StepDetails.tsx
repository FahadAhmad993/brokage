import { ChevronsUpDown, Lightbulb, MapPin } from 'lucide-react-native';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ListingFormValues } from '../../../types/listingForm';
import { colors } from '../../../theme/colors';
import { iconSize, iconStroke } from '../../../theme/icons';
import { layout } from '../../../theme/layout';
import { spacing } from '../../../theme/spacing';
import { typography } from '../../../theme/typography';
import { CATEGORY_OPTIONS } from './constants';
import { fieldStyles } from './fieldStyles';

export function StepDetails() {
  const {
    control,
    formState: { errors },
  } = useFormContext<ListingFormValues>();

  return (
    <View style={styles.block}>
      <Text style={fieldStyles.label}>Property Title</Text>
      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="e.g. Minimalist Glass Villa in Mykonos"
            placeholderTextColor="rgba(121,117,134,0.55)"
            style={[
              fieldStyles.input,
              errors.title && styles.inputErr,
            ]}
            accessibilityLabel="Property title"
          />
        )}
      />
      {errors.title?.message ? (
        <Text style={fieldStyles.errorText}>{errors.title.message}</Text>
      ) : null}
      <Text style={fieldStyles.hint}>
        An evocative title helps your listing stand out in the editorial feed.
      </Text>

      <Text style={[fieldStyles.label, styles.mt]}>Asking Price</Text>
      <View
        style={[
          styles.priceRow,
          errors.price && styles.inputRowErr,
        ]}>
        <Text style={styles.dollar}>$</Text>
        <Controller
          control={control}
          name="price"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#6B7280"
              style={styles.priceInput}
              accessibilityLabel="Asking price per month"
            />
          )}
        />
      </View>
      {errors.price?.message ? (
        <Text style={fieldStyles.errorText}>{errors.price.message}</Text>
      ) : null}

      <Text style={[fieldStyles.label, styles.mt]}>Category</Text>
      <Controller
        control={control}
        name="category"
        render={({ field: { value, onChange } }) => {
          const cycleCategory = () => {
            const idx = CATEGORY_OPTIONS.findIndex(c => c.key === value);
            const next = CATEGORY_OPTIONS[(idx + 1) % CATEGORY_OPTIONS.length];
            onChange(next.key);
          };
          return (
            <Pressable
              style={[
                styles.select,
                errors.category && styles.inputRowErr,
              ]}
              onPress={cycleCategory}
              accessibilityRole="button"
              accessibilityLabel="Change category">
              <Text style={styles.selectText}>
                {CATEGORY_OPTIONS.find(c => c.key === value)?.label ?? 'Villa'}
              </Text>
              <ChevronsUpDown
                color={colors.textMuted}
                size={iconSize.md}
                strokeWidth={iconStroke}
              />
            </Pressable>
          );
        }}
      />
      {errors.category?.message ? (
        <Text style={fieldStyles.errorText}>{errors.category.message}</Text>
      ) : null}

      <Text style={[fieldStyles.label, styles.mt]}>Location (Address)</Text>
      <View
        style={[
          styles.locRow,
          errors.address && styles.inputRowErr,
        ]}>
        <MapPin
          color={colors.primary}
          size={iconSize.md}
          strokeWidth={iconStroke}
        />
        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Enter the full street address"
              placeholderTextColor="#6B7280"
              style={styles.locInput}
              accessibilityLabel="Street address"
            />
          )}
        />
      </View>
      {errors.address?.message ? (
        <Text style={fieldStyles.errorText}>{errors.address.message}</Text>
      ) : null}

      {/*
        Map preview / verify — out of scope until client funds maps. Re-enable with:
        - import { Image } from 'react-native', Map from lucide, MAP_PREVIEW from constants
      <View style={styles.mapCard}>
        <Image source={{ uri: MAP_PREVIEW }} style={styles.mapImg} />
        <View style={styles.mapOverlay}>
          <Pressable style={styles.mapBtn} onPress={() => {}}>
            <Map
              color={colors.primary}
              size={iconSize.sm}
              strokeWidth={iconStroke}
            />
            <Text style={styles.mapBtnText}>Verify on Map</Text>
          </Pressable>
        </View>
      </View>
      */}

      <View style={styles.tip}>
        <View style={styles.tipHead}>
          <Lightbulb
            color={colors.tipTitle}
            size={iconSize.md}
            strokeWidth={iconStroke}
          />
          <Text style={styles.tipTitle}>Pro Tip</Text>
        </View>
        <Text style={styles.tipBody}>
          Listings with precise addresses and descriptive titles receive up to
          40% more inquiries from verified buyers.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 0 },
  mt: { marginTop: spacing.lg },
  inputErr: {
    borderColor: 'rgba(220,38,38,0.45)',
  },
  inputRowErr: {
    borderColor: 'rgba(220,38,38,0.45)',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,196,215,0.18)',
    paddingHorizontal: spacing.md,
  },
  dollar: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,196,215,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  selectText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,196,215,0.18)',
    paddingLeft: 12,
    gap: 8,
  },
  locInput: {
    flex: 1,
    paddingVertical: 14,
    ...typography.body,
    color: colors.textPrimary,
  },
  /* Map card styles — restore with map block above (paid scope)
  mapCard: {
    marginTop: spacing.lg,
    borderRadius: layout.radius.lg,
    overflow: 'hidden',
    height: 192,
    backgroundColor: '#E8E8EA',
  },
  mapImg: { width: '100%', height: '100%', opacity: 0.88 },
  mapOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: layout.radius.full,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  mapBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  */
  tip: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: layout.radius.lg,
    backgroundColor: colors.tipBg,
    borderLeftWidth: 4,
    borderLeftColor: colors.tipBorder,
    gap: spacing.sm,
  },
  tipHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.tipTitle,
  },
  tipBody: {
    ...typography.caption,
    color: colors.tipText,
    lineHeight: 20,
    fontWeight: '400',
  },
});
