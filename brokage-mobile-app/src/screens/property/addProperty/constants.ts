import { MOCK_PROPERTIES } from '../../../api/mockData';
import type { ListingCategory } from '../../../types/listingForm';

export const CATEGORY_OPTIONS: { key: ListingCategory; label: string }[] = [
  { key: 'villas', label: 'Villa' },
  { key: 'urban_lofts', label: 'Urban loft' },
  { key: 'shared', label: 'Shared' },
];

/** Rotating stock images for the photo step until a native picker is wired. */
export const LISTING_PLACEHOLDER_PHOTOS: string[] = MOCK_PROPERTIES.map(
  p => p.imageUrl,
);

/** Shown in the photo step body (not the sticky header). */
export const PHOTO_STEP_INTRO =
  'Bright, clear photos help seekers imagine living in your space. Aim for at least five images covering the living area, kitchen, bedrooms, and any standout outdoor spaces.';

export const STEP_CONFIG = [
  {
    stepLabel: 'STEP 01 OF 03',
    heading: 'Property Details',
    subline: '',
  },
  {
    stepLabel: 'STEP 02 OF 03',
    heading: 'Upload Photos',
    subline: '',
  },
  {
    stepLabel: 'STEP 03 OF 03',
    heading: 'Review & Publish',
    subline:
      'One last look before your property goes live to thousands of seekers.',
  },
] as const;

export { AMENITY_OPTIONS, type AmenityId } from '../../../constants/listingAmenities';

/** Used by StepDetails map preview when that UI is re-enabled (paid scope). */
export const MAP_PREVIEW =
  'https://www.figma.com/api/mcp/asset/0c43bb4e-1e81-4a84-a468-aec6b67533e7';
