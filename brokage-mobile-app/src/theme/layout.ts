/**
 * Mobile layout tokens — 8pt grid, 44–48pt touch targets (iOS HIG / Material 3).
 * Use for padding, radii, and minimum interactive sizes.
 */
export const layout = {
  /** Horizontal padding for most screens (20 ≈ 2.5×8). */
  screenPaddingHorizontal: 20,

  /** Minimum tap area — iOS HIG 44pt; Material often 48dp; use hitSlop to reach 44+ when visual is smaller. */
  minTouchTarget: 44,

  /** Standard height for filter/choice chips (stable active ↔ inactive). */
  chipHeight: 40,

  /** Primary filled buttons — comfortable, not oversized */
  buttonHeightMin: 44,

  /** Expand tappable area without changing layout (accessibility). */
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 } as const,

  /** Corner radii — modern cards use 16–20dp; pills stay fully rounded. */
  radius: {
    sm: 10,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    /** Listing cards — matches editorial / Figma-style feed */
    card: 26,
    full: 9999,
  },

  fab: {
    size: 56,
    iconArea: 28,
  },

  chip: {
    minHeight: 40,
    paddingH: 16,
    paddingV: 8,
  },

  /** Space between major vertical sections */
  sectionGap: 24,
} as const;
