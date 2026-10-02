import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// LayoutList re-enabled with the "Your listings" row.
import { ChevronRight, LayoutGrid, Settings, Share2, Users } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenScroll } from '../../components/ScreenScroll';
import {
  navigateToContacts,
  navigateToEditProfile,
  navigateToHomeStackScreen,
  navigateToMyDisplay,
  navigateToSettings,
} from '../../navigation/crossTabNavigate';
import type { ProfileStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { shareInvite } from '../../lib/invite';
import { initialsFromDisplay } from '../../utils/userDisplay';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { getScreenStyles } from '../../theme/screenStyles';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

export function ProfileScreen() {
  const styles = useThemedStyles(buildStyles);
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(s => s.user);

  const initials = useMemo(
    () => initialsFromDisplay(user?.displayName, user?.email),
    [user?.displayName, user?.email],
  );

  // "Your listings" is hidden — re-enable with the menu row.
  // const goMyListings = () => {
  //   navigateToHomeStackScreen(navigation, 'MyListings');
  // };

  // Saved homes will be enabled again later.
  // const goSaved = () => {
  //   navigateToHomeStackScreen(navigation, 'SavedProperties');
  // };

  return (
    <ScreenScroll>
      <Text style={getScreenStyles().sectionOverline}>Profile</Text>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.sub}>
        Your listings and profile preferences.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.heroCard, pressed && styles.heroPressed]}
        onPress={() => navigateToEditProfile(navigation)}
        accessibilityRole="button"
        accessibilityLabel="Edit profile">
        <View style={styles.avatarLarge}>
          {user?.avatarUri ? (
            <Image source={{ uri: user.avatarUri }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.initials}>{initials}</Text>
          )}
        </View>
        <View style={styles.heroMeta}>
          <Text style={styles.name}>{user?.displayName ?? 'Guest'}</Text>
          <Text style={styles.email}>{user?.email ?? '—'}</Text>
          <Text style={styles.editHint}>Tap to edit profile & photo</Text>
        </View>
        <ChevronRight
          color={colors.textMuted}
          size={iconSize.lg}
          strokeWidth={iconStroke}
        />
      </Pressable>

      <View style={styles.menuCard}>
        {/*
          "Your listings" row is intentionally hidden for now.
          Uncomment when this feature is enabled again.
        <Pressable
          style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          onPress={goMyListings}
          accessibilityRole="button"
          accessibilityLabel="Your listings">
          <View style={styles.menuLeft}>
            <View style={styles.menuIconWrap}>
              <LayoutList
                color={colors.primary}
                size={iconSize.md}
                strokeWidth={iconStroke}
              />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuLabel}>Your listings</Text>
              <Text style={styles.menuHint}>Manage and add properties</Text>
            </View>
          </View>
          <ChevronRight
            color={colors.textMuted}
            size={iconSize.lg}
            strokeWidth={iconStroke}
          />
        </Pressable>
        */}

        {/*
          Saved homes row is intentionally hidden for now.
          Uncomment when this feature is enabled again.
        <Pressable
          style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          onPress={goSaved}
          accessibilityRole="button"
          accessibilityLabel="Saved homes">
          <View style={styles.menuLeft}>
            <View style={styles.menuIconWrap}>
              <Bookmark
                color={colors.primary}
                size={iconSize.md}
                strokeWidth={iconStroke}
              />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuLabel}>Saved homes</Text>
              <Text style={styles.menuHint}>Listings you have saved</Text>
            </View>
          </View>
          <ChevronRight
            color={colors.textMuted}
            size={iconSize.lg}
            strokeWidth={iconStroke}
          />
        </Pressable>
        */}

        <Pressable
          style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          onPress={() => navigateToContacts(navigation)}
          accessibilityRole="button"
          accessibilityLabel="Contacts">
          <View style={styles.menuLeft}>
            <View style={styles.menuIconWrap}>
              <Users color={colors.primary} size={iconSize.md} strokeWidth={iconStroke} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuLabel}>Contacts</Text>
              <Text style={styles.menuHint}>Add people by email & start a chat</Text>
            </View>
          </View>
          <ChevronRight color={colors.textMuted} size={iconSize.lg} strokeWidth={iconStroke} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          onPress={() => void shareInvite(user?.displayName)}
          accessibilityRole="button"
          accessibilityLabel="Invite friends">
          <View style={styles.menuLeft}>
            <View style={styles.menuIconWrap}>
              <Share2 color={colors.primary} size={iconSize.md} strokeWidth={iconStroke} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuLabel}>Invite friends</Text>
              <Text style={styles.menuHint}>Share Brokage on WhatsApp, SMS & more</Text>
            </View>
          </View>
          <ChevronRight color={colors.textMuted} size={iconSize.lg} strokeWidth={iconStroke} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          onPress={() => navigateToMyDisplay(navigation)}
          accessibilityRole="button"
          accessibilityLabel="My Display">
          <View style={styles.menuLeft}>
            <View style={styles.menuIconWrap}>
              <LayoutGrid color={colors.primary} size={iconSize.md} strokeWidth={iconStroke} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuLabel}>My Display</Text>
              <Text style={styles.menuHint}>Your storefront — photos & posts</Text>
            </View>
          </View>
          <ChevronRight color={colors.textMuted} size={iconSize.lg} strokeWidth={iconStroke} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.menuRowLast,
            pressed && styles.pressed,
          ]}
          onPress={() => navigateToSettings(navigation)}
          accessibilityRole="button"
          accessibilityLabel="Settings">
          <View style={styles.menuLeft}>
            <View style={styles.menuIconWrap}>
              <Settings
                color={colors.primary}
                size={iconSize.md}
                strokeWidth={iconStroke}
              />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuLabel}>Settings</Text>
              <Text style={styles.menuHint}>Notifications, session & about</Text>
            </View>
          </View>
          <ChevronRight
            color={colors.textMuted}
            size={iconSize.lg}
            strokeWidth={iconStroke}
          />
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Discover new homes from the{' '}
        <Text
          style={styles.hintLink}
          onPress={() => navigateToHomeStackScreen(navigation, 'Home')}>
          Home
        </Text>{' '}
        tab.
      </Text>
    </ScreenScroll>
  );
}

const buildStyles = () => StyleSheet.create({
  title: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  sub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  heroCard: {
    ...getScreenStyles().cardElevated,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  heroPressed: { opacity: 0.96 },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  initials: {
    ...typography.title,
    color: colors.primary,
    fontWeight: '800',
  },
  heroMeta: { flex: 1, gap: 4 },
  name: {
    ...typography.title,
    color: colors.textPrimary,
  },
  email: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  editHint: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouchTarget + 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  menuRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouchTarget + 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pressed: { opacity: 0.92, backgroundColor: colors.surfaceMuted },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  menuTextCol: { flex: 1, gap: 2 },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  menuHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
  },
  hintLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});
