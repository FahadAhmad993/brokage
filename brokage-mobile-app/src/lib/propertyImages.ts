import type { Property } from '../types/models';

/** Ordered gallery URIs: explicit `imageUrls` when present, otherwise cover only. */
export function propertyGalleryUrls(
  p: Pick<Property, 'imageUrl' | 'imageUrls'>,
): string[] {
  const extra = p.imageUrls?.filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0,
  );
  if (extra && extra.length > 0) {
    return extra;
  }
  return p.imageUrl?.trim() ? [p.imageUrl.trim()] : [];
}
