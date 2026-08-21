import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  applyZodIssues,
  LISTING_STEPS,
  publishSchema,
  step1Schema,
  step2Schema,
  valuesForStep1,
  valuesForStep2,
} from './addProperty/listingFormSchema';
import {
  clearListingFormDraft,
  loadListingFormDraft,
  saveListingFormDraft,
} from '../../lib/listingDraftStorage';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';
import { errorMessage, publishListing } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import {
  DEFAULT_LISTING_FORM_VALUES,
  type ListingFormValues,
} from '../../types/listingForm';
import { colors } from '../../theme/colors';
import { layout } from '../../theme/layout';
import { spacing } from '../../theme/spacing';
import { useAppAlert, useAppToast } from '../../components/appAlert';
import {
  AddPropertyChrome,
  AddPropertyFooter,
} from './addProperty/AddPropertyChrome';
import { StepDetails } from './addProperty/StepDetails';
import { StepMedia } from './addProperty/StepMedia';
import { StepReview } from './addProperty/StepReview';

/** Breathing room between keyboard top and action bar */
const KEYBOARD_GAP = Platform.select({ ios: 10, android: 12 }) ?? 12;

export function AddPropertyScreen() {
  const alert = useAppAlert();
  const toast = useAppToast();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const user = useAuthStore(s => s.user);

  const [step, setStep] = useState(1);

  const methods = useForm<ListingFormValues>({
    defaultValues: DEFAULT_LISTING_FORM_VALUES,
    mode: 'onChange',
  });

  const { reset, getValues, setError, clearErrors, control } = methods;

  useEffect(() => {
    let cancelled = false;
    loadListingFormDraft().then(d => {
      if (cancelled || !d) {
        return;
      }
      reset({ ...DEFAULT_LISTING_FORM_VALUES, ...d });
    });
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const watched = useWatch({ control });

  const step1Ok = useMemo(() => {
    return step1Schema.safeParse(valuesForStep1(watched as ListingFormValues))
      .success;
  }, [watched]);

  const step2Ok = useMemo(() => {
    return step2Schema.safeParse(valuesForStep2(watched as ListingFormValues))
      .success;
  }, [watched]);

  const primaryDisabled = useMemo(() => {
    if (step === 1) {
      return !step1Ok;
    }
    if (step === 2) {
      return !step2Ok;
    }
    return false;
  }, [step, step1Ok, step2Ok]);

  const progress = useMemo(
    () => Math.min(1, step / LISTING_STEPS),
    [step],
  );

  /** Keeps Cancel / Next above the keyboard on both platforms */
  const footerPaddingBottom = useMemo(() => {
    if (keyboardInset > 0) {
      return keyboardInset + KEYBOARD_GAP;
    }
    return Math.max(insets.bottom, 12);
  }, [keyboardInset, insets.bottom]);

  const scrollBottomPadding = useMemo(
    () => spacing.lg + (keyboardInset > 0 ? spacing.sm : 0),
    [keyboardInset],
  );

  const close = useCallback(() => {
    reset(DEFAULT_LISTING_FORM_VALUES);
    setStep(1);
    clearListingFormDraft().catch(() => {});
    navigation.goBack();
  }, [navigation, reset]);

  const saveDraft = useCallback(async () => {
    try {
      await saveListingFormDraft(getValues());
      alert({
        title: 'Draft saved',
        message:
          'Your listing draft is saved on this device. Open Add listing anytime to continue.',
      });
    } catch {
      alert({
        title: 'Could not save',
        message: 'Try again in a moment.',
      });
    }
  }, [alert, getValues]);

  const goNext = useCallback(() => {
    if (step >= LISTING_STEPS) {
      return;
    }
    const values = getValues();
    if (step === 1) {
      const r = step1Schema.safeParse(valuesForStep1(values));
      if (!r.success) {
        applyZodIssues(r.error.issues, setError, clearErrors);
        return;
      }
      clearErrors();
      setStep(2);
      return;
    }
    if (step === 2) {
      const r = step2Schema.safeParse(valuesForStep2(values));
      if (!r.success) {
        applyZodIssues(r.error.issues, setError, clearErrors);
        return;
      }
      clearErrors();
      setStep(3);
    }
  }, [step, getValues, setError, clearErrors]);

  const publish = useCallback(() => {
    if (!user) {
      alert({
        title: 'Session required',
        message: 'Sign in again to publish a listing.',
      });
      return;
    }
    const values = getValues();
    const r = publishSchema.safeParse(values);
    if (!r.success) {
      applyZodIssues(r.error.issues, setError, clearErrors);
      return;
    }
    publishListing(r.data, user.id, user.displayName)
      .then(() => {
        reset(DEFAULT_LISTING_FORM_VALUES);
        setStep(1);
        clearListingFormDraft().catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['property'] });
        queryClient.invalidateQueries({ queryKey: ['my-listings', user.id] });
        toast({
          title: 'Listing published',
          message: 'Now visible in Discover and Your listings.',
          kind: 'success',
        });
        navigation.goBack();
      })
      .catch(error => {
        alert({
          title: 'Publish failed',
          message: errorMessage(error, 'Please try again in a moment.'),
        });
      });
  }, [
    alert,
    clearErrors,
    getValues,
    navigation,
    queryClient,
    reset,
    setError,
    toast,
    user,
  ]);

  const onPrimary = useCallback(() => {
    if (step < LISTING_STEPS) {
      goNext();
    } else {
      publish();
    }
  }, [step, goNext, publish]);

  const primaryLabel =
    step >= LISTING_STEPS
      ? 'Publish Listing'
      : step === 1
        ? 'Next'
        : 'Continue';

  const editPropertyDetails = useCallback(() => {
    setStep(1);
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <FormProvider {...methods}>
        <View style={styles.column}>
          <AddPropertyChrome
            step={step}
            progress={progress}
            onClose={close}
            onSaveDraft={saveDraft}
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: scrollBottomPadding },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            showsVerticalScrollIndicator={false}
            {...(Platform.OS === 'ios'
              ? { contentInsetAdjustmentBehavior: 'automatic' as const }
              : {})}>
            {step === 1 ? <StepDetails /> : null}
            {step === 2 ? <StepMedia /> : null}
            {step === 3 ? (
              <StepReview onEditPropertyDetails={editPropertyDetails} />
            ) : null}
          </ScrollView>

          <AddPropertyFooter
            showBack={step > 1}
            onBack={() => setStep(s => Math.max(1, s - 1))}
            onCancel={close}
            onPrimary={onPrimary}
            primaryLabel={primaryLabel}
            primaryDisabled={primaryDisabled}
            isPublishStep={step === LISTING_STEPS}
            paddingBottom={footerPaddingBottom}
          />
        </View>
      </FormProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  column: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    flexGrow: 1,
  },
});
