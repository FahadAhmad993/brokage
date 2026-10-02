import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Phone, Share2, Trash2, UserPlus, Users } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScreenScroll } from '../../components/ScreenScroll';
import { useAppAlert, useAppToast } from '../../components/appAlert';
import {
  createDirectChatFromCommunityAd,
  deleteContact,
  errorMessage,
  fetchContacts,
} from '../../api/client';
import { shareInvite } from '../../lib/invite';
import { navigateToChatsThread } from '../../navigation/crossTabNavigate';
import type { MainStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import type { Contact } from '../../types/models';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { getScreenStyles } from '../../theme/screenStyles';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { initialsFromDisplay } from '../../utils/userDisplay';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Contacts'>;

export function ContactsScreen() {
  const styles = useThemedStyles(buildStyles);
  const navigation = useNavigation<Nav>();
  const alert = useAppAlert();
  const toast = useAppToast();
  const me = useAuthStore(s => s.user);

  const [items, setItems] = useState<Contact[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  // Reload whenever the screen regains focus (e.g. back from "Add contact").
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoadError(null);
      fetchContacts()
        .then(list => {
          if (!cancelled) setItems(list);
        })
        .catch(err => {
          if (!cancelled) {
            setItems(prev => prev ?? []);
            setLoadError(errorMessage(err, 'Could not load contacts.'));
          }
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const openChat = async (c: Contact) => {
    if (openingId) return;
    setOpeningId(c.id);
    try {
      const thread = await createDirectChatFromCommunityAd(c.userId);
      navigateToChatsThread(navigation, { threadId: thread.id, title: c.name });
    } catch (err) {
      alert({ title: 'Could not open chat', message: errorMessage(err) });
    } finally {
      setOpeningId(null);
    }
  };

  const onRemove = (c: Contact) => {
    alert({
      title: `Remove ${c.name}?`,
      message: 'They will be removed from your contacts. Your chats stay as they are.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(c.id);
              setItems(prev => (prev ?? []).filter(x => x.id !== c.id));
              toast({ title: 'Removed', message: `${c.name} removed.`, kind: 'success' });
            } catch (err) {
              alert({ title: 'Could not remove', message: errorMessage(err) });
            }
          },
        },
      ],
    });
  };

  const onCall = (c: Contact) => {
    if (!c.phone) return;
    void Linking.openURL(`tel:${c.phone}`).catch(() => {
      alert({ title: "Couldn't open dialer", message: 'Try calling from your Phone app.' });
    });
  };

  return (
    <ScreenScroll>
      <Text style={getScreenStyles().sectionOverline}>Personal</Text>
      <Text style={styles.title}>Contacts</Text>
      <Text style={styles.lead}>
        People you've saved by email. Tap a contact to start a private chat.
      </Text>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => navigation.navigate('AddContact')}
          style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Add contact">
          <UserPlus color={colors.onPrimary} size={iconSize.md} strokeWidth={iconStroke} />
          <Text style={styles.primaryActionText}>Add contact</Text>
        </Pressable>
        <Pressable
          onPress={() => void shareInvite(me?.displayName)}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Invite friends">
          <Share2 color={colors.primary} size={iconSize.md} strokeWidth={iconStroke} />
          <Text style={styles.secondaryActionText}>Invite</Text>
        </Pressable>
      </View>

      {items === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : loadError && items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>{loadError}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Users color={colors.primary} size={iconSize.lg} strokeWidth={iconStroke} />
          </View>
          <Text style={styles.emptyTitle}>No contacts yet</Text>
          <Text style={styles.emptyBody}>
            Add someone with their email — or invite a friend who isn't on Brokage yet.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          {items.map((c, i) => (
            <React.Fragment key={c.id}>
              <Pressable
                onPress={() => void openChat(c)}
                onLongPress={() => onRemove(c)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Chat with ${c.name}`}>
                {c.avatarUrl ? (
                  <Image source={{ uri: c.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>
                      {initialsFromDisplay(c.name, c.email)}
                    </Text>
                  </View>
                )}
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {c.name}
                  </Text>
                  {/* Email is the identity of a contact — always shown. */}
                  <Text style={styles.email} numberOfLines={1}>
                    {c.email}
                  </Text>
                  {c.phone ? (
                    <Text style={styles.phone} numberOfLines={1}>
                      {c.phone}
                    </Text>
                  ) : null}
                </View>
                {openingId === c.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={styles.rowActions}>
                    {c.phone ? (
                      <Pressable
                        onPress={() => onCall(c)}
                        hitSlop={layout.hitSlop}
                        accessibilityRole="button"
                        accessibilityLabel={`Call ${c.name}`}>
                        <Phone color={colors.textSecondary} size={iconSize.md} strokeWidth={iconStroke} />
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => onRemove(c)}
                      hitSlop={layout.hitSlop}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${c.name}`}>
                      <Trash2 color={colors.textMuted} size={iconSize.md} strokeWidth={iconStroke} />
                    </Pressable>
                  </View>
                )}
              </Pressable>
              {i < items.length - 1 ? <View style={styles.hairline} /> : null}
            </React.Fragment>
          ))}
        </View>
      )}
    </ScreenScroll>
  );
}

const buildStyles = () =>
  StyleSheet.create({
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
    actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    primaryAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primary,
      borderRadius: layout.radius.md,
      paddingVertical: spacing.sm + 2,
    },
    primaryActionText: { ...typography.body, fontWeight: '700', color: colors.onPrimary },
    secondaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderRadius: layout.radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
    },
    secondaryActionText: { ...typography.body, fontWeight: '700', color: colors.primary },
    pressed: { opacity: 0.8 },
    loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
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
      minHeight: layout.minTouchTarget + 16,
    },
    avatarImg: { width: 44, height: 44, borderRadius: 22 },
    avatarFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: { ...typography.caption, fontWeight: '700', color: colors.primary },
    rowText: { flex: 1 },
    name: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
    email: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
    phone: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
    emptyBody: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
  });
