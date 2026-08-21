import React, {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  InteractionManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Info } from 'lucide-react-native';
import { GradientButton } from '../GradientButton';
import { registerAppAlertShow } from '../../lib/globalAppAlert';
import { colors } from '../../theme/colors';
import { layout } from '../../theme/layout';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type {
  AppAlertButton,
  AppAlertInput,
  AppAlertState,
  AppToastInput,
} from './types';

function normalize(input: AppAlertInput): AppAlertState {
  const raw = input.buttons?.filter(b => b.text?.trim()) ?? [];
  const buttons =
    raw.length > 0 ? raw : [{ text: 'OK', style: 'default' as const }];
  const variant =
    input.variant ?? (buttons.length > 2 ? 'actionSheet' : 'dialog');
  const cancelable = input.cancelable !== false;
  return {
    title: input.title,
    message: input.message,
    buttons,
    variant,
    cancelable,
  };
}

function deferPress(fn?: () => void) {
  if (!fn) {
    return;
  }
  requestAnimationFrame(() => {
    InteractionManager.runAfterInteractions(() => fn());
  });
}

const AlertContext = createContext<((input: AppAlertInput) => void) | null>(
  null,
);
const ToastContext = createContext<((input: AppToastInput) => void) | null>(null);

export function useAppAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAppAlert must be used within AppAlertProvider');
  }
  return ctx;
}

export function useAppToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useAppToast must be used within AppAlertProvider');
  }
  return ctx;
}

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppAlertState | null>(null);
  const [toast, setToast] = useState<AppToastInput | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((input: AppAlertInput) => {
    setState(normalize(input));
  }, []);

  const dismiss = useCallback(() => {
    setState(null);
  }, []);

  const showToast = useCallback((input: AppToastInput) => {
    setToast(input);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  useLayoutEffect(() => {
    registerAppAlertShow(show);
    return () => registerAppAlertShow(null);
  }, [show]);

  const onBackdrop = useCallback(() => {
    if (!state?.cancelable) {
      return;
    }
    const cancelBtn = state.buttons.find(b => b.style === 'cancel');
    dismiss();
    deferPress(cancelBtn?.onPress);
  }, [dismiss, state]);

  const onButton = useCallback(
    (btn: AppAlertButton) => {
      dismiss();
      deferPress(btn.onPress);
    },
    [dismiss],
  );

  const ctxValue = useMemo(() => show, [show]);
  const toastValue = useMemo(() => showToast, [showToast]);

  useLayoutEffect(() => {
    if (!toast) {
      return;
    }
    const id = setTimeout(() => {
      hideToast();
    }, 2200);
    return () => clearTimeout(id);
  }, [toast, hideToast]);

  return (
    <AlertContext.Provider value={ctxValue}>
      <ToastContext.Provider value={toastValue}>
        {children}
        {toast ? (
          <View
            pointerEvents="none"
            style={[
              styles.toastWrap,
              { top: Math.max(insets.top, spacing.sm) + spacing.xs },
            ]}>
            <View style={[styles.toastCard, toast.kind === 'info' && styles.toastInfo]}>
              {toast.kind === 'info' ? (
                <Info size={18} color={colors.primary} />
              ) : (
                <CheckCircle2 size={18} color={colors.success} />
              )}
              <View style={styles.toastTextWrap}>
                <Text style={styles.toastTitle}>{toast.title}</Text>
                {toast.message ? (
                  <Text style={styles.toastMessage}>{toast.message}</Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
        <Modal
        visible={!!state}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (state?.cancelable) {
            onBackdrop();
          }
        }}>
        {state ? (
          state.variant === 'actionSheet' ? (
            <View style={styles.sheetRoot} pointerEvents="box-none">
              <Pressable
                style={styles.backdrop}
                onPress={onBackdrop}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
              />
              <View
                style={[
                  styles.sheetCard,
                  {
                    paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
                  },
                ]}>
                <View style={styles.sheetGrab} accessibilityElementsHidden />
                {state.title ? (
                  <Text style={styles.sheetTitle}>{state.title}</Text>
                ) : null}
                {state.message ? (
                  <Text style={styles.sheetMessage}>{state.message}</Text>
                ) : null}
                <View style={styles.sheetOptions}>
                  {state.buttons.map((btn, i) => (
                    <Pressable
                      key={`${btn.text}-${i}`}
                      onPress={() => onButton(btn)}
                      style={({ pressed }) => [
                        styles.sheetRow,
                        i < state.buttons.length - 1 && styles.sheetRowBorder,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={btn.text}>
                      <Text
                        style={[
                          styles.sheetRowText,
                          btn.style === 'destructive' && styles.sheetDestructive,
                          btn.style === 'cancel' && styles.sheetCancel,
                        ]}>
                        {btn.text}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.dialogRoot} pointerEvents="box-none">
              <Pressable
                style={styles.backdrop}
                onPress={onBackdrop}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
              />
              <ScrollView
                contentContainerStyle={styles.dialogScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}>
                <View style={styles.dialogCard}>
                  {state.title ? (
                    <Text style={styles.dialogTitle}>{state.title}</Text>
                  ) : null}
                  {state.message ? (
                    <Text style={styles.dialogMessage}>{state.message}</Text>
                  ) : null}
                  <DialogActions buttons={state.buttons} onPress={onButton} />
                </View>
              </ScrollView>
            </View>
          )
        ) : null}
        </Modal>
      </ToastContext.Provider>
    </AlertContext.Provider>
  );
}

function DialogActions({
  buttons,
  onPress,
}: {
  buttons: AppAlertButton[];
  onPress: (b: AppAlertButton) => void;
}) {
  if (buttons.length === 1) {
    const b = buttons[0];
    if (b.style === 'destructive') {
      return (
        <Pressable
          onPress={() => onPress(b)}
          style={({ pressed }) => [
            styles.destructiveBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={b.text}>
          <Text style={styles.destructiveBtnText}>{b.text}</Text>
        </Pressable>
      );
    }
    return (
      <GradientButton
        label={b.text}
        onPress={() => onPress(b)}
        compact
        style={styles.dialogPrimaryFull}
      />
    );
  }

  if (buttons.length === 2) {
    const [a, b] = buttons;
    return (
      <View style={styles.dialogRow}>
        <Pressable
          onPress={() => onPress(a)}
          style={({ pressed }) => [
            styles.secondaryBtn,
            styles.dialogRowBtn,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={a.text}>
          <Text
            style={[
              styles.secondaryBtnText,
              a.style === 'destructive' && styles.textDestructive,
            ]}>
            {a.text}
          </Text>
        </Pressable>
        {b.style === 'destructive' ? (
          <Pressable
            onPress={() => onPress(b)}
            style={({ pressed }) => [
              styles.destructiveBtn,
              styles.dialogRowBtn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={b.text}>
            <Text style={styles.destructiveBtnText}>{b.text}</Text>
          </Pressable>
        ) : (
          <View style={styles.dialogRowBtn}>
            <GradientButton
              label={b.text}
              onPress={() => onPress(b)}
              compact
              style={styles.dialogGradientFill}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.dialogStack}>
      {buttons.map((b, i) => {
        if (b.style === 'destructive') {
          return (
            <Pressable
              key={`${b.text}-${i}`}
              onPress={() => onPress(b)}
              style={({ pressed }) => [
                styles.destructiveBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={b.text}>
              <Text style={styles.destructiveBtnText}>{b.text}</Text>
            </Pressable>
          );
        }
        if (b.style === 'cancel') {
          return (
            <Pressable
              key={`${b.text}-${i}`}
              onPress={() => onPress(b)}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={b.text}>
              <Text style={styles.secondaryBtnText}>{b.text}</Text>
            </Pressable>
          );
        }
        return (
          <GradientButton
            key={`${b.text}-${i}`}
            label={b.text}
            onPress={() => onPress(b)}
            compact
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26, 28, 29, 0.48)',
  },
  pressed: { opacity: 0.9 },

  dialogRoot: {
    flex: 1,
    justifyContent: 'center',
  },
  dialogScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: spacing.xl,
  },
  dialogCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.xl,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    gap: spacing.md,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    ...shadows.card,
  },
  dialogTitle: {
    ...typography.headline,
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  dialogMessage: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  dialogRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dialogRowBtn: {
    flex: 1,
    minWidth: 0,
  },
  dialogPrimaryFull: {
    marginTop: spacing.xs,
  },
  dialogGradientFill: {
    width: '100%',
  },
  dialogStack: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  secondaryBtn: {
    minHeight: layout.buttonHeightMin,
    borderRadius: layout.radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  secondaryBtnText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  textDestructive: {
    color: colors.danger,
  },
  destructiveBtn: {
    minHeight: layout.buttonHeightMin,
    borderRadius: layout.radius.lg,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  destructiveBtnText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: colors.danger,
  },

  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: layout.radius.xxl,
    borderTopRightRadius: layout.radius.xxl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  sheetGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.headline,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  sheetMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  sheetOptions: {
    borderRadius: layout.radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sheetRow: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  sheetRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  sheetRowText: {
    ...typography.body,
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
  },
  sheetDestructive: {
    color: colors.danger,
  },
  sheetCancel: {
    fontWeight: '700',
    color: colors.textMuted,
  },
  toastWrap: {
    position: 'absolute',
    left: layout.screenPaddingHorizontal,
    right: layout.screenPaddingHorizontal,
    zIndex: 100,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: layout.radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...shadows.cardSubtle,
  },
  toastInfo: {
    borderColor: colors.ringPrimaryMid,
  },
  toastTextWrap: { flex: 1, gap: 2 },
  toastTitle: {
    ...typography.label,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  toastMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
