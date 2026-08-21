import type { PropertyCategory } from './models';

export type ListingCategory = Exclude<PropertyCategory, 'all'>;

/** Values for the new-listing wizard (React Hook Form). */
export type ListingFormValues = {
  title: string;
  price: string;
  category: ListingCategory;
  address: string;
  description: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
  photoUris: string[];
  amenities: string[];
};

export const DEFAULT_LISTING_FORM_VALUES: ListingFormValues = {
  title: '',
  price: '',
  category: 'villas',
  address: '',
  description: '',
  bedrooms: '',
  bathrooms: '',
  sqft: '',
  photoUris: [],
  amenities: [],
};
