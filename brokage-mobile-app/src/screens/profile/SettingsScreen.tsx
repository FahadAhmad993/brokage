import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemedStyles } from '../../hooks/useThemedStyles';
// Bell re-enabled with the Communications section.
import {
  Check,
  ChevronRight,
  Info,
  KeyRound,
  LogOut,
  Palette,
  ShieldOff,
  SquarePen,
  Trash2,
} from 'lucide-react-native';
import React from 'react';
// Switch re-enabled with the Communications section.
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenScroll } from '../../components/ScreenScroll';
import { useAppAlert, useAppToast } from '../../components/appAlert';
import { deleteAccount, errorMessage } from '../../api/client';
import {
  APP_NAME,
  APP_VERSION,
  IS_DEVELOPMENT,
  API_MODE,
} from '../../config/appConfig';
import type { MainStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
// usePreferencesStore re-enabled with the Communications section.
// import { usePreferencesStore } from '../../stores/preferencesStore';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { getScreenStyles } from '../../theme/screenStyles';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { themeMeta, type ThemeName } from '../../theme/themePresets';

const THEME_ORDER: ThemeName[] = ['dark', 'light', 'midnight', 'sand', 'gray'];

type Nav = NativeStackNavigationProp<MainStackParamList, 'Settings'>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const setUser = useAuthStore(s => s.setUser);
  const alert = useAppAlert();
  const toast = useAppToast();
  const styles = useThemedStyles(buildStyles);
  const [deletingAccount, setDeletingAccount] = React.useState(false);
  const themeName = useThemeStore(s => s.themeName);
  const setTheme = useThemeStore(s => s.setTheme);
  // Preferences are read by the hidden Communications section.
  // const prefs = usePreferencesStore(s => s.prefs);
  // const setPrefs = usePreferencesStore(s => s.setPrefs);

  const runDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      queryClient.clear();
      await setUser(null);
      toast({
        title: 'Account deleted',
        message: 'Your account and all its data have been permanently removed.',
        kind: 'success',
      });
    } catch (error) {
      setDeletingAccount(false);
      alert({
        title: 'Could not delete account',
        message: errorMessage(error, 'Please try again in a moment.'),
      });
    }
  };

  const onDeleteAccountPress = () => {
    alert({
      title: 'Delete account?',
      message:
        'This permanently deletes your account, profile, listings, and every message — this cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: runDeleteAccount,
        },
      ],
    });
  };

  return (
    <ScreenScroll>
      <Text style={getScreenStyles().sectionOverline}>Preferences</Text>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.lead}>
        Manage your account, notifications, and this device session.
      </Text>

      <Text style={[getScreenStyles().sectionOverline, styles.sectionLabel]}>
        Appearance
      </Text>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Palette
            color={colors.textMuted}
            size={iconSize.sm}
            strokeWidth={iconStroke}
          />
          <Text style={styles.cardHeaderText}>Theme</Text>
        </View>
        <View style={styles.themeGrid}>
          {THEME_ORDER.map(name => {
            const meta = themeMeta[name];
            const selected = themeName === name;
            return (
              <Pressable
                key={name}
                onPress={() => {
                  void setTheme(name);
                }}
                style={({ pressed }) => [
                  styles.themeSwatchRow,
                  selected && styles.themeSwatchRowSelected,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${meta.label} theme`}>
                <View
                  style={[
                    styles.themeSwatch,
                    { backgroundColor: meta.swatch },
                  ]}
                />
                <Text style={styles.themeLabel}>{meta.label}</Text>
                {selected ? (
                  <Check
                    color={colors.primary}
                    size={iconSize.sm}
                    strokeWidth={2.5}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.themeHint}>
          Some screens may need a moment to fully repaint after switching.
        </Text>
      </View>

      <Text style={[getScreenStyles().sectionOverline, styles.sectionLabel]}>
        Account
      </Text>
      <View style={styles.card}>
        <SettingsLinkRow
          icon={
            <SquarePen
              color={colors.primary}
              size={iconSize.md}
              strokeWidth={iconStroke}
            />
          }
          title="Edit profile"
          subtitle="Name, photo & how you appear"
          onPress={() => navigation.navigate('EditProfile')}
        />
        <View style={styles.hairline} />
        <SettingsLinkRow
          icon={
            <KeyRound
              color={colors.primary}
              size={iconSize.md}
              strokeWidth={iconStroke}
            />
          }
          title="Change password"
          subtitle="Update your sign-in password"
          onPress={() => navigation.navigate('ChangePassword')}
        />
        <View style={styles.hairline} />
        <SettingsLinkRow
          icon={
            <ShieldOff
              color={colors.primary}
              size={iconSize.md}
              strokeWidth={iconStroke}
            />
          }
          title="Blocked users"
          subtitle="Manage who you've blocked"
          onPress={() => navigation.navigate('BlockedUsers')}
          isLast
        />
      </View>

      {/*
        Communications / Channels section is hidden for now.
        Uncomment when the notification preferences are re-enabled.
      <Text style={[getScreenStyles().sectionOverline, styles.sectionLabel]}>
        Communications
      </Text>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Bell
            color={colors.textMuted}
            size={iconSize.sm}
            strokeWidth={iconStroke}
          />
          <Text style={styles.cardHeaderText}>Channels</Text>
        </View>
        <PrefRow
          label="Push notifications"
          value={prefs.pushNotifications}
          onValueChange={v => {
            setPrefs({ pushNotifications: v }).catch(() => {});
          }}
        />
        <View style={styles.hairline} />
        <PrefRow
          label="Weekly email digest"
          value={prefs.emailDigest}
          onValueChange={v => {
            setPrefs({ emailDigest: v }).catch(() => {});
          }}
        />
        <View style={styles.hairline} />
        <PrefRow
          label="Product updates"
          value={prefs.marketing}
          onValueChange={v => {
            setPrefs({ marketing: v }).catch(() => {});
          }}
        />
      </View>
      */}

      <Text style={[getScreenStyles().sectionOverline, styles.sectionLabel]}>
        Session
      </Text>
      <View style={styles.card}>
        <Pressable
          style={({ pressed }) => [styles.logoutRow, pressed && styles.pressed]}
          onPress={async () => {
            await setUser(null);
            queryClient.clear();
          }}
          accessibilityRole="button"
          accessibilityLabel="Log out">
          <LogOut
            color={colors.danger}
            size={iconSize.md}
            strokeWidth={iconStroke}
          />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <Text style={[getScreenStyles().sectionOverline, styles.sectionLabel, styles.dangerLabel]}>
        Danger Zone
      </Text>
      <View style={[styles.card, styles.dangerCard]}>
        <Pressable
          style={({ pressed }) => [styles.logoutRow, pressed && styles.pressed]}
          onPress={onDeleteAccountPress}
          disabled={deletingAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete account">
          {deletingAccount ? (
            <ActivityIndicator color={colors.danger} size="small" />
          ) : (
            <Trash2 color={colors.danger} size={iconSize.md} strokeWidth={iconStroke} />
          )}
          <View style={styles.linkTextCol}>
            <Text style={styles.logoutText}>
              {deletingAccount ? 'Deleting account…' : 'Delete account'}
            </Text>
            <Text style={styles.dangerSub}>
              Permanently erases your account and all messages. Can't be undone.
            </Text>
          </View>
        </Pressable>
      </View>

      <Text style={[getScreenStyles().sectionOverline, styles.sectionLabel]}>
        About
      </Text>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Info
            color={colors.textMuted}
            size={iconSize.sm}
            strokeWidth={iconStroke}
          />
          <Text style={styles.cardHeaderText}>Build</Text>
        </View>
        <Row label="App" value={APP_NAME} />
        <View style={styles.hairline} />
        <Row label="Version" value={APP_VERSION} />
        <View style={styles.hairline} />
        <Row
          label="Data"
          value={API_MODE === 'mock' ? 'Local & preview' : 'Live API'}
        />
        {IS_DEVELOPMENT ? (
          <>
            <View style={styles.hairline} />
            <Row label="Build" value="Development" />
          </>
        ) : null}
      </View>
    </ScreenScroll>
  );
}

function SettingsLinkRow({
  icon,
  title,
  subtitle,
  onPress,
  isLast,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  const styles = useThemedStyles(buildStyles);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.linkRow,
        !isLast && styles.linkRowBorder,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}>
      <View style={styles.linkIconWrap}>{icon}</View>
      <View style={styles.linkTextCol}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSub}>{subtitle}</Text>
      </View>
      <ChevronRight
        color={colors.textMuted}
        size={iconSize.lg}
        strokeWidth={iconStroke}
      />
    </Pressable>
  );
}

// PrefRow is used by the Communications section, which is currently hidden.
// function PrefRow({
//   label,
//   value,
//   onValueChange,
// }: {
//   label: string;
//   value: boolean;
//   onValueChange: (v: boolean) => void;
// }) {
//   return (
//     <View style={styles.prefRow}>
//       <Text style={styles.prefLabel}>{label}</Text>
//       <Switch
//         value={value}
//         onValueChange={onValueChange}
//         trackColor={{
//           false: colors.surfaceMuted,
//           true: colors.primarySoft,
//         }}
//         thumbColor={value ? colors.primary : colors.textMuted}
//       />
//     </View>
//   );
// }

function Row({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(buildStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

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
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  sectionLabel: { marginTop: spacing.md, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  cardHeaderText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget + 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  linkRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  linkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTextCol: { flex: 1, gap: 2 },
  linkTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  linkSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: layout.minTouchTarget,
  },
  prefLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    paddingRight: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 44,
  },
  rowLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
  },
  rowValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: layout.minTouchTarget,
  },
  pressed: { opacity: 0.92, backgroundColor: colors.surfaceMuted },
  logoutText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
  },
  dangerLabel: { color: colors.danger },
  dangerCard: {
    borderColor: colors.danger,
  },
  dangerSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  themeGrid: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  themeSwatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  themeSwatchRowSelected: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.primarySoft,
  },
  themeSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  themeLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  themeHint: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
