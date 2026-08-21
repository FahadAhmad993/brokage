import type { PropertyFeature } from '../types/models';

const CORE_ORDER = ['bed', 'bath', 'sqft'] as const;
type CoreIcon = (typeof CORE_ORDER)[number];

function isCoreIcon(icon: string | undefined): icon is CoreIcon {
  return icon !== undefined && CORE_ORDER.includes(icon as CoreIcon);
}

/**
 * Splits listing features into core stats (beds / baths / sqft) vs everything else.
 */
export function partitionPropertyFeatures(features: PropertyFeature[]): {
  core: PropertyFeature[];
  other: PropertyFeature[];
} {
  const core: PropertyFeature[] = [];
  const other: PropertyFeature[] = [];

  for (const f of features) {
    if (isCoreIcon(f.icon)) {
      core.push(f);
    } else {
      other.push(f);
    }
  }

  core.sort(
    (a, b) =>
      CORE_ORDER.indexOf(a.icon as CoreIcon) -
      CORE_ORDER.indexOf(b.icon as CoreIcon),
  );

  return { core, other };
}

/**
 * Normalized copy for the stats row: "2 bd", "1 ba", "1,200 sq ft".
 */
/** One-line summary for listing cards: `"2 bd · 1 ba · 1,200 sq ft"` or `null`. */
export function coreStatsSummaryLine(
  features: PropertyFeature[],
): string | null {
  const { core } = partitionPropertyFeatures(features);
  if (core.length === 0) {
    return null;
  }
  return core.map(formatCoreStatLabel).join(' · ');
}

export function formatCoreStatLabel(f: PropertyFeature): string {
  const raw = f.label.trim();
  switch (f.icon) {
    case 'bed':
      return raw.replace(/^(\d+)\s*beds?$/i, '$1 bd');
    case 'bath':
      return raw.replace(/^(\d+(?:\.\d+)?)\s*baths?$/i, '$1 ba');
    case 'sqft':
      return raw
        .replace(/\bsq\.?\s*ft\.?|sqft\b/gi, 'sq ft')
        .replace(/\s+/g, ' ')
        .trim();
    default:
      return raw;
  }
}
