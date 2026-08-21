import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  ChevronRight,
  Mail,
  Phone,
  Sparkles,
} from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenScroll } from '../../components/ScreenScroll';
import { useAppAlert } from '../../components/appAlert';
import { errorMessage, fetchUserProfile } from '../../api/client';
import type { MainStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { screenStyles } from '../../theme/screenStyles';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { initialsFromDisplay } from '../../utils/userDisplay';

type Route = RouteProp<MainStackParamList, 'UserProfile'>;
type Nav = NativeStackNavigationProp<MainStackParamList, 'UserProfile'>;

const AVATAR = 128;

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {value && value.trim() ? value : 'Not provided'}
        </Text>
      </View>
    </View>
  );
}

export function UserProfileScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const alert = useAppAlert();
  const { userId, displayName: fallbackName } = route.params;

  const profileQuery = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfile(userId),
  });

  const profile = profileQuery.data;
  const name = profile?.displayName ?? fallbackName ?? 'Profile';
  const initials = initialsFromDisplay(name, profile?.email);

  React.useLayoutEffect(() => {
    // Body already shows the name as a large title (see `styles.title`
    // below) — leaving the native header title empty avoids showing the
    // name twice.
    navigation.setOptions({ headerTitle: '' });
  }, [navigation]);

  const onDisplayPress = () => {
    alert({
      title: 'Display',
      message: 'Coming soon.',
    });
  };

  if (profileQuery.isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (profileQuery.isError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>
          {errorMessage(profileQuery.error, 'Could not load this profile.')}
        </Text>
      </View>
    );
  }

  return (
    <ScreenScroll>
      <Text style={screenStyles.sectionOverline}>Profile</Text>
      <Text style={styles.title}>{name}</Text>

      <View style={styles.avatarWrap}>
        <View style={styles.avatarRing}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <InfoRow
          icon={
            <Sparkles color={colors.primary} size={iconSize.sm} strokeWidth={iconStroke} />
          }
          label="Name"
          value={name}
        />
        <View style={styles.divider} />
        <InfoRow
          icon={<Phone color={colors.primary} size={iconSize.sm} strokeWidth={iconStroke} />}
          label="Phone"
          value={profile?.phone}
        />
        <View style={styles.divider} />
        <InfoRow
          icon={<Mail color={colors.primary} size={iconSize.sm} strokeWidth={iconStroke} />}
          label="Email"
          value={profile?.email}
        />
        <View style={styles.divider} />
        <InfoRow
          icon={
            <Building2 color={colors.primary} size={iconSize.sm} strokeWidth={iconStroke} />
          }
          label="Estate"
          value={profile?.estateName}
        />
      </View>

      <Pressable
        onPress={onDisplayPress}
        style={({ pressed }) => [styles.displayRow, pressed && styles.displayRowPressed]}
        accessibilityRole="button"
        accessibilityLabel="Display">
        <Text style={styles.displayRowLabel}>Display</Text>
        <ChevronRight color={colors.textMuted} size={iconSize.md} strokeWidth={iconStroke} />
      </Pressable>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  title: {
    ...typography.displayMedium,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
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
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
  },
  card: {
    ...screenStyles.cardElevated,
    gap: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, gap: 2 },
  infoLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    ...typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  displayRow: {
    ...screenStyles.cardElevated,
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  displayRowPressed: { opacity: 0.85 },
  displayRowLabel: {
    ...typography.headline,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
