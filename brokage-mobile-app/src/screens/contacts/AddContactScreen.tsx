import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenScroll } from '../../components/ScreenScroll';
import { useAppToast } from '../../components/appAlert';
import { GradientButton } from '../../components/GradientButton';
import { addContact, errorMessage } from '../../api/client';
import { shareInvite } from '../../lib/invite';
import type { MainStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../theme/colors';
import { iconSize, iconStroke } from '../../theme/icons';
import { layout } from '../../theme/layout';
import { getScreenStyles } from '../../theme/screenStyles';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { fieldStyles } from '../property/addProperty/fieldStyles';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type Nav = NativeStackNavigationProp<MainStackParamList, 'AddContact'>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddContactScreen() {
  const styles = useThemedStyles(buildStyles);
  const navigation = useNavigation<Nav>();
  const toast = useAppToast();
  const me = useAuthStore(s => s.user);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email.trim());

  const onSave = async () => {
    if (!emailValid || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setNotFound(false);
    try {
      const saved = await addContact({
        email: email.trim(),
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      toast({
        title: 'Contact added',
        message: `${saved.name} is now in your contacts.`,
        kind: 'success',
      });
      navigation.goBack();
    } catch (err) {
      const msg = errorMessage(err, 'Could not add this contact.');
      // The backend answers 404 with an "invite them" message when no
      // account uses that email — offer the share sheet right there.
      if (/no brokage account/i.test(msg)) {
        setNotFound(true);
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScroll>
      <Text style={getScreenStyles().sectionOverline}>Contacts</Text>
      <Text style={styles.title}>Add contact</Text>
      <Text style={styles.lead}>
        Save someone by the email they signed up with. Their name and photo come
        from their Brokage profile.
      </Text>

      <Text style={fieldStyles.label}>Name (optional)</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ali Estate"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          maxLength={100}
          accessibilityLabel="Contact name"
        />
      </View>

      <Text style={[fieldStyles.label, styles.mt]}>Email</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={email}
          onChangeText={t => {
            setEmail(t);
            setError(null);
            setNotFound(false);
          }}
          placeholder="name@example.com"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Contact email"
        />
      </View>

      <Text style={[fieldStyles.label, styles.mt]}>Phone number (optional)</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+92 300 1234567"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={32}
          accessibilityLabel="Contact phone number"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {notFound ? (
        <Pressable
          onPress={() => void shareInvite(me?.displayName)}
          style={({ pressed }) => [styles.inviteBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Invite them to Brokage">
          <UserPlus color={colors.primary} size={iconSize.md} strokeWidth={iconStroke} />
          <Text style={styles.inviteBtnText}>Invite them to Brokage</Text>
        </Pressable>
      ) : null}

      <GradientButton
        label="Save contact"
        onPress={onSave}
        loading={busy}
        disabled={busy || !emailValid}
        style={styles.cta}
      />
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
    mt: { marginTop: spacing.lg },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted,
      borderRadius: layout.radius.md,
      borderWidth: 1,
      borderColor: 'rgba(201,196,215,0.18)',
      paddingHorizontal: spacing.md,
      minHeight: layout.buttonHeightMin,
    },
    input: {
      flex: 1,
      ...typography.body,
      color: colors.textPrimary,
      paddingVertical: 12,
    },
    error: {
      ...typography.bodySmall,
      color: colors.danger,
      marginTop: spacing.md,
    },
    inviteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderRadius: layout.radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    inviteBtnText: { ...typography.body, color: colors.primary, fontWeight: '700' },
    pressed: { opacity: 0.8 },
    cta: { marginTop: spacing.xl },
  });
