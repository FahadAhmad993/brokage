import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, Trash2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScreenScroll } from '../../components/ScreenScroll';
import { GradientButton } from '../../components/GradientButton';
import { errorMessage, updateProfile as updateProfileApi } from '../../api/client';
import { pickProfileAvatar } from '../../lib/pickListingImages';
import { uploadImageToCloudinary } from '../../lib/cloudinary';
import type { MainStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { getScreenStyles } from '../../theme/screenStyles';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { fieldStyles } from '../property/addProperty/fieldStyles';
import { initialsFromDisplay } from '../../utils/userDisplay';
import { useAppAlert, useAppToast } from '../../components/appAlert';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Nav = NativeStackNavigationProp<MainStackParamList, 'EditProfile'>;

export function EditProfileScreen() {
  const styles = useThemedStyles(buildStyles);
  const navigation = useNavigation<Nav>();
  const alert = useAppAlert();
  const toast = useAppToast();
  const user = useAuthStore(s => s.user);
  const updateProfile = useAuthStore(s => s.updateProfile);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [estateName, setEstateName] = useState(user?.estateName ?? '');
  const [avatarUri, setAvatarUri] = useState(user?.avatarUri);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  // `useState(user?.displayName ?? '')` above only ever runs its initial
  // value ONCE, at first mount — if `user` is still hydrating from storage
  // at that exact moment (e.g. right after a cold app start), every field
  // locks in as permanently empty even though the real profile data
  // arrives a moment later. This backfills the form the first time a real
  // `user` shows up, without re-running on every store update (which
  // would otherwise clobber whatever the person is actively typing).
  const hydratedFromUserRef = useRef(false);
  useEffect(() => {
    if (hydratedFromUserRef.current || !user) {
      return;
    }
    hydratedFromUserRef.current = true;
    setDisplayName(user.displayName ?? '');
    setPhone(user.phone ?? '');
    setEstateName(user.estateName ?? '');
    setAvatarUri(user.avatarUri);
  }, [user]);

  const initials = useMemo(
    () => initialsFromDisplay(displayName, user?.email),
    [displayName, user?.email],
  );

  const onPickPhoto = async () => {
    setPicking(true);
    try {
      const uri = await pickProfileAvatar();
      if (uri) {
        setAvatarUri(uri);
      }
    } finally {
      setPicking(false);
    }
  };

  const onSave = async () => {
    const name = displayName.trim();
    if (name.length < 2) {
      alert({
        title: 'Display name',
        message: 'Please enter at least 2 characters.',
      });
      return;
    }
    setSaving(true);
    try {
      const trimmedPhone = phone.trim();
      const trimmedEstate = estateName.trim();

      // `avatarUri` is a local device file path right after picking a new
      // photo (file://, content://, ph://…) — it only resolves on this
      // device. This was the bug behind avatars never showing anywhere
      // else (admin panel, other users' apps): the raw local path was
      // being saved as-is. Upload it to Cloudinary first so we save a
      // real, universally-reachable https URL — same as ad photos.
      let uploadedAvatarUrl = avatarUri;
      if (avatarUri && !/^https?:\/\//i.test(avatarUri)) {
        uploadedAvatarUrl = await uploadImageToCloudinary(avatarUri);
      }

      await updateProfileApi({
        displayName: name,
        avatarUrl: uploadedAvatarUrl || undefined,
        phone: trimmedPhone || undefined,
        estateName: trimmedEstate || undefined,
      });
      await updateProfile({
        displayName: name,
        avatarUri: uploadedAvatarUrl || undefined,
        phone: trimmedPhone || undefined,
        estateName: trimmedEstate || undefined,
      });
      toast({
        title: 'Profile saved',
        message: 'Your public profile is updated.',
        kind: 'success',
      });
      navigation.goBack();
    } catch (error) {
      alert({
        title: 'Could not update profile',
        message: errorMessage(error, 'Please try again in a moment.'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenScroll>
      <Text style={getScreenStyles().sectionOverline}>Account</Text>
      <Text style={styles.title}>Edit profile</Text>
      <Text style={styles.lead}>
        Your name and photo appear on listings and messages. Email stays tied to
        your sign-in for now.
      </Text>

      <View style={styles.avatarCard}>
        <View style={styles.avatarRing}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={styles.avatarActions}>
          <Pressable
            onPress={onPickPhoto}
            disabled={picking}
            style={({ pressed }) => [
              styles.photoBtn,
              pressed && styles.photoBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo">
            {picking ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Camera
                  color={colors.primary}
                  size={iconSize.sm}
                  strokeWidth={iconStroke}
                />
                <Text style={styles.photoBtnText}>Upload photo</Text>
              </>
            )}
          </Pressable>
          {avatarUri ? (
            <Pressable
              onPress={() => setAvatarUri(undefined)}
              style={({ pressed }) => [
                styles.removeBtn,
                pressed && styles.removeBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Remove profile photo">
              <Trash2
                color={colors.danger}
                size={iconSize.sm}
                strokeWidth={iconStroke}
              />
              <Text style={styles.removeBtnText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={fieldStyles.label}>Display name</Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Your name"
        placeholderTextColor={colors.textMuted}
        style={fieldStyles.input}
        autoCorrect
        accessibilityLabel="Display name"
      />

      <Text style={[fieldStyles.label, styles.mt]}>Phone number</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="e.g. +1 555 123 4567"
        placeholderTextColor={colors.textMuted}
        style={fieldStyles.input}
        keyboardType="phone-pad"
        accessibilityLabel="Phone number"
      />

      <Text style={[fieldStyles.label, styles.mt]}>Estate name</Text>
      <TextInput
        value={estateName}
        onChangeText={setEstateName}
        placeholder="e.g. Skyline Estates"
        placeholderTextColor={colors.textMuted}
        style={fieldStyles.input}
        autoCorrect
        accessibilityLabel="Estate name"
      />

      <Text style={[fieldStyles.label, styles.mt]}>Email</Text>
      <View style={styles.emailBox}>
        <Text style={styles.emailText}>{user?.email ?? '—'}</Text>
      </View>
      <Text style={fieldStyles.hint}>
        To change your email, sign out and use a different account, or contact
        support when your workspace is on a live backend.
      </Text>

      <GradientButton
        label="Save changes"
        onPress={onSave}
        loading={saving}
        disabled={saving}
        style={styles.saveBtn}
      />
    </ScreenScroll>
  );
}

const AVATAR = 96;

const buildStyles = () => StyleSheet.create({
  title: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  lead: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  avatarCard: {
    ...getScreenStyles().cardElevated,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  avatarRing: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.primarySoft,
    ...shadows.cardSubtle,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...typography.headline,
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  avatarActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: layout.radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.ringPrimaryMid,
    minHeight: layout.minTouchTarget - 4,
  },
  photoBtnPressed: { opacity: 0.9 },
  photoBtnText: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: layout.radius.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: layout.minTouchTarget - 4,
  },
  removeBtnPressed: { opacity: 0.92 },
  removeBtnText: {
    ...typography.label,
    color: colors.danger,
    fontWeight: '600',
  },
  mt: { marginTop: spacing.lg },
  emailBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,196,215,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  emailText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '500',
  },
  saveBtn: { marginTop: spacing.xl },
});
