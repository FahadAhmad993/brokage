import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ListingFormValues } from '../types/listingForm';

const KEY = 'brokage.listing-form-draft.v1';

export async function loadListingFormDraft(): Promise<ListingFormValues | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ListingFormValues;
  } catch {
    return null;
  }
}

export async function saveListingFormDraft(
  values: ListingFormValues,
): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(values));
}

export async function clearListingFormDraft(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
