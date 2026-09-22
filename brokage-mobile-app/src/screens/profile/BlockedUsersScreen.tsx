import { ShieldOff } from 'lucide-react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
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
import { useAppAlert, useAppToast } from '../../components/appAlert';
import {
  errorMessage,
  fetchBlockedUsers,
  unblockUser,
} from '../../api/client';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { getScreenStyles } from '../../theme/screenStyles';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { initialsFromDisplay } from '../../utils/userDisplay';

type BlockedUser = { id: string; displayName: string; avatarUrl?: string | null };

function BlockedUserRow({
  user,
  busy,
  onUnblock,
}: {
  user: BlockedUser;
  busy: boolean;
  onUnblock: (user: BlockedUser) => void;
}) {
  const styles = useThemedStyles(buildStyles);
  return (
    <View style={styles.row}>
      {user.avatarUrl ? (
        <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitials}>
            {initialsFromDisplay(user.displayName, undefined)}
          </Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {user.displayName}
      </Text>
      <Pressable
        onPress={() => onUnblock(user)}
        disabled={busy}
        style={({ pressed }) => [
          styles.unblockBtn,
          pressed && styles.unblockBtnPressed,
          busy && styles.unblockBtnDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Unblock ${user.displayName}`}>
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.unblockLabel}>Unblock</Text>
        )}
      </Pressable>
    </View>
  );
}

export function BlockedUsersScreen() {
  const styles = useThemedStyles(buildStyles);
  const alert = useAppAlert();
  const toast = useAppToast();
  const [items, setItems] = React.useState<BlockedUser[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoadError(null);
    fetchBlockedUsers()
      .then(res => setItems(res.items))
      .catch(err => {
        setItems([]);
        setLoadError(errorMessage(err, 'Could not load blocked users.'));
      });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onUnblock = React.useCallback(
    (user: BlockedUser) => {
      alert({
        title: `Unblock ${user.displayName}?`,
        message: 'They will be able to message you and see your posts again.',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unblock',
            onPress: async () => {
              setPendingId(user.id);
              try {
                await unblockUser(user.id);
                setItems(prev => (prev ?? []).filter(u => u.id !== user.id));
                toast({
                  title: 'Unblocked',
                  message: `${user.displayName} can reach you again.`,
                  kind: 'success',
                });
              } catch (err) {
                alert({
                  title: 'Could not unblock',
                  message: errorMessage(err, 'Please try again.'),
                });
              } finally {
                setPendingId(null);
              }
            },
          },
        ],
      });
    },
    [alert, toast],
  );

  return (
    <ScreenScroll>
      <Text style={getScreenStyles().sectionOverline}>Privacy</Text>
      <Text style={styles.title}>Blocked users</Text>
      <Text style={styles.lead}>
        People you've blocked can't message you or see your community posts.
        Unblock anyone below to reverse it.
      </Text>

      {items === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : loadError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>{loadError}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <ShieldOff color={colors.primary} size={iconSize.lg} strokeWidth={iconStroke} />
          </View>
          <Text style={styles.emptyTitle}>No blocked users</Text>
          <Text style={styles.emptyBody}>
            Anyone you block from a chat will show up here.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          {items.map((user, i) => (
            <React.Fragment key={user.id}>
              <BlockedUserRow
                user={user}
                busy={pendingId === user.id}
                onUnblock={onUnblock}
              />
              {i < items.length - 1 ? <View style={styles.hairline} /> : null}
            </React.Fragment>
          ))}
        </View>
      )}
    </ScreenScroll>
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
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: layout.minTouchTarget + 8,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  name: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  unblockBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: layout.radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 84,
    alignItems: 'center',
  },
  unblockBtnPressed: { backgroundColor: colors.washPrimary },
  unblockBtnDisabled: { opacity: 0.6 },
  unblockLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
});
