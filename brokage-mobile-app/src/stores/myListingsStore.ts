import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { AMENITY_OPTIONS } from '../constants/listingAmenities';
import { DEFAULT_USER_LISTING_IMAGE } from '../api/mockData';
import type { ListingFormValues } from '../types/listingForm';
import type {
  ListingStatus,
  ManagedListing,
  PropertyFeature,
  PropertyLister,
} from '../types/models';

const STORAGE_KEY = 'brokage.my-listings.v1';

function parseMonthlyPrice(raw: string): number {
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function formToManaged(
  form: ListingFormValues,
  ownerId: string,
  ownerDisplayName: string,
): ManagedListing {
  const id = `ml-${Date.now()}`;
  const priceMonthly = parseMonthlyPrice(form.price);
  const features: PropertyFeature[] = [];
  const b = form.bedrooms.trim();
  const bt = form.bathrooms.trim();
  const sq = form.sqft.trim();
  if (b) {
    features.push({ label: `${b} beds`, icon: 'bed' });
  }
  if (bt) {
    features.push({ label: `${bt} baths`, icon: 'bath' });
  }
  if (sq) {
    features.push({ label: `${sq} sqft`, icon: 'sqft' });
  }
  for (const amenityId of form.amenities) {
    const label = AMENITY_OPTIONS.find(a => a.id === amenityId)?.label;
    if (label) {
      features.push({ label });
    }
  }
  if (features.length === 0) {
    features.push({ label: 'Details in description', icon: 'info' });
  }

  const description = form.description.trim();

  const photoUris = form.photoUris.filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0,
  );
  const imageUrls =
    photoUris.length > 0 ? photoUris : [DEFAULT_USER_LISTING_IMAGE];
  const imageUrl = imageUrls[0];

  const lister: PropertyLister = {
    id: ownerId,
    displayName: ownerDisplayName.trim() || 'Host',
    bio: 'Brokage host — ask me anything about this listing.',
  };

  return {
    id,
    title: form.title.trim(),
    location: form.address.trim(),
    priceMonthly: priceMonthly > 0 ? priceMonthly : 0,
    imageUrl,
    imageUrls,
    category: form.category,
    isPremium: false,
    features,
    description: description || undefined,
    lister,
    ownerId,
    status: 'live',
    updatedAt: new Date().toISOString(),
  };
}

type State = {
  listings: ManagedListing[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addFromDraft: (
    form: ListingFormValues,
    ownerId: string,
    ownerDisplayName: string,
  ) => void;
  setStatus: (id: string, status: ListingStatus) => void;
  remove: (id: string) => void;
};

export const useMyListingsStore = create<State>((set, get) => ({
  listings: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ManagedListing[];
        const listings = parsed.map(l => {
          const imageUrls =
            Array.isArray(l.imageUrls) && l.imageUrls.length > 0
              ? l.imageUrls
              : l.imageUrl
                ? [l.imageUrl]
                : [DEFAULT_USER_LISTING_IMAGE];
          return {
            ...l,
            imageUrl: l.imageUrl || imageUrls[0],
            imageUrls,
            lister: l.lister ?? {
              id: l.ownerId,
              displayName: 'Host',
              bio: 'Brokage host',
            },
          };
        });
        set({ listings, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  addFromDraft: (form, ownerId, ownerDisplayName) => {
    const next = formToManaged(form, ownerId, ownerDisplayName);
    const listings = [next, ...get().listings];
    set({ listings });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(listings)).catch(
      () => {},
    );
  },

  setStatus: (id, status) => {
    const listings = get().listings.map(l =>
      l.id === id
        ? { ...l, status, updatedAt: new Date().toISOString() }
        : l,
    );
    set({ listings });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(listings)).catch(
      () => {},
    );
  },

  remove: id => {
    const listings = get().listings.filter(l => l.id !== id);
    set({ listings });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(listings)).catch(
      () => {},
    );
  },
}));
