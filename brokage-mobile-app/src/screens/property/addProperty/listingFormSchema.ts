import { z } from 'zod';
import type { FieldValues, UseFormSetError } from 'react-hook-form';
import type { ListingFormValues } from '../../../types/listingForm';

export const LISTING_STEPS = 3 as const;

const categorySchema = z.enum(['villas', 'urban_lofts', 'shared']);

export const step1Schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a property title'),
  price: z
    .string()
    .trim()
    .min(1, 'Enter an asking price')
    .refine(
      v => {
        const n = parseFloat(v.replace(/[^0-9.]/g, ''));
        return Number.isFinite(n) && n > 0;
      },
      { message: 'Enter a valid amount' },
    ),
  category: categorySchema,
  address: z
    .string()
    .trim()
    .min(1, 'Enter the full street address'),
});

export const step2Schema = z.object({
  photoUris: z
    .array(z.string())
    .min(1, 'Add at least one photo from your library'),
});

export const publishSchema = z.object({
  title: step1Schema.shape.title,
  price: step1Schema.shape.price,
  category: step1Schema.shape.category,
  address: step1Schema.shape.address,
  photoUris: step2Schema.shape.photoUris,
  description: z.string(),
  bedrooms: z.string(),
  bathrooms: z.string(),
  sqft: z.string(),
  amenities: z.array(z.string()),
});

export function applyZodIssues<T extends FieldValues>(
  issues: z.ZodIssue[],
  setError: UseFormSetError<T>,
  clearErrors: () => void,
) {
  clearErrors();
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string') {
      setError(key as never, {
        type: 'manual',
        message: issue.message,
      });
    }
  }
}

export function valuesForStep1(v: ListingFormValues): z.infer<typeof step1Schema> {
  return {
    title: v.title,
    price: v.price,
    category: v.category,
    address: v.address,
  };
}

export function valuesForStep2(v: ListingFormValues): z.infer<typeof step2Schema> {
  return { photoUris: v.photoUris };
}
