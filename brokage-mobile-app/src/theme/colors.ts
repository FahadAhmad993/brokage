/**
 * Brokage — editorial-black palette inspired by Apple TV+, Saint Laurent,
 * and Hermès web/app aesthetics. Drives a single dark theme tuned to the
 * Brokage logo (metallic grey → black gradient + warm-brown editorial accent).
 *
 * Single source of truth: every UI surface, text style, border, ring, gradient,
 * shadow, and accent reads from here. Swap hex values to re-tune the brand.
 */

/** Brand-canonical gradient stops (logo SVG). Keep in sync with BrokageLogo. */
const BRAND_BLACK = '#131514';
const BRAND_MID = '#77787D';
const BRAND_HIGHLIGHT = '#D9D9D9';

export const colors = {
  /* ─────── Canvas ─────── */
  /**
   * App background — warm near-black. The slight red bias (vs neutral grey)
   * gives the canvas a leather / editorial undertone instead of feeling sterile.
   */
  background: '#0C0A09',
  /** Card / list-row surface — one step above the canvas, same warm undertone. */
  surface: '#16130F',
  /** Input fields, chips, secondary blocks. */
  surfaceMuted: '#1D1916',
  /** Modals, popovers, sheet headers — top of the elevation stack. */
  surfaceElevated: '#221E1A',
  /**
   * Subtle top-edge highlight on elevated surfaces — mimics a 1px specular
   * gloss on real materials. Use as `borderTopColor` with hairline width to
   * lift cards / sheet headers off the canvas.
   */
  surfaceHighlight: 'rgba(255, 250, 245, 0.07)',

  /* ─────── Hairlines ─────── */
  /** Default card/list border — soft warm-white hairline. */
  border: 'rgba(255, 250, 245, 0.07)',
  /** Pressed/focused borders, prominent dividers — readable structure. */
  borderStrong: 'rgba(255, 250, 245, 0.16)',
  /** List dividers, keyboard toolbars. */
  divider: 'rgba(255, 250, 245, 0.12)',

  /* ─────── Brand / interactive ─────── */
  /**
   * Interactive accent (link tint, icon active color, header tint, focus rings).
   * On a dark canvas the brand expresses through near-white interactive chrome,
   * with the logo gradient reserved for `brandGradient` and hero glyphs.
   */
  primary: '#F5F1EC',
  /** Companion to `primary` for solid secondary CTAs / hairline accents. */
  primaryMid: '#E2DDD6',
  /** Tinted pressed/selected surface (inverted tone on dark). */
  primarySoft: '#1D1916',
  /**
   * Wordmark color — warm-brown editorial accent rather than plain off-white.
   * Gives the "Brokage" lockup a luxe pop against the dark canvas without
   * touching the logo glyph, which keeps its metallic gradient.
   */
  brandWordmark: '#D29565',

  /**
   * Logo gradient stops — drives the canonical CTA gradient. The dark stop
   * (`BRAND_BLACK`) deliberately recedes into the canvas for an editorial,
   * fading-mark aesthetic; the mid stop (`BRAND_MID`) carries the readable
   * brand presence. Pair with `onPrimary` text.
   */
  brandGradient: [BRAND_MID, BRAND_BLACK] as string[],

  /** Subtle brand washes (canvas tints, dashed zones, chrome). */
  washPrimary: 'rgba(245, 245, 247, 0.04)',
  ringPrimary: 'rgba(245, 245, 247, 0.10)',
  ringPrimaryMid: 'rgba(245, 245, 247, 0.14)',
  ringPrimaryStroke: 'rgba(245, 245, 247, 0.22)',
  ringPrimaryFocus: 'rgba(245, 245, 247, 0.36)',
  /** High-opacity brand pill (cover chips, floating badges). */
  primaryBadgeOverlay: 'rgba(12, 10, 9, 0.92)',

  /* ─────── Text ─────── */
  /** Body / headings — warm off-white, kinder than pure #FFF, no cool cast. */
  textPrimary: '#F5F1EC',
  /** Secondary copy, captions on dark surfaces. */
  textSecondary: '#BDB6AC',
  /** Placeholder, metadata, low-emphasis labels. */
  textMuted: '#8F877D',
  /** Inactive tab labels — recede further. */
  textTabInactive: '#5C5651',
  /**
   * Text & icons placed on top of a **solid `primary` fill** — outgoing chat
   * bubbles, unread badges, active chips, error-boundary CTA, etc. Because
   * `primary` is now an off-white surface, contrast text must be near-black.
   */
  onPrimary: '#0B0B0C',
  /**
   * Text & icons placed on the **brand gradient CTA** (`brandGradient`). The
   * gradient runs from mid-grey to deep black, so contrast text stays white.
   */
  onBrandGradient: '#FFFFFF',

  /* ─────── Editorial accent (warm brown) ─────── */
  /**
   * Re-tuned for dark canvas — the original #713300 vanished against black.
   * #C9803E reads as polished saddle-leather: warmth that anchors the editorial
   * black without competing with the brand mark.
   */
  accentBrown: '#C9803E',
  /** Soft accent wash — tip cards, auth decor panels. */
  washAccent: 'rgba(201, 128, 62, 0.10)',
  tipBg: 'rgba(201, 128, 62, 0.14)',
  tipBorder: 'rgba(201, 128, 62, 0.45)',
  tipText: '#E8B889',
  tipTitle: '#F5D9BB',

  /* ─────── Chrome / elevation ─────── */
  /** Translucent header overlay (scrolled-under nav bar). */
  overlayHeader: 'rgba(12, 10, 9, 0.88)',
  /**
   * Translucent pill / chip rendered on top of imagery (price tags, badges,
   * floating actions over property photos). Dark so the editorial canvas
   * carries through; pair with light text (`textPrimary`).
   */
  overlayOnPhoto: 'rgba(12, 10, 9, 0.72)',
  /** Default shadow color — pure black for ambient depth on dark surfaces. */
  shadow: 'rgba(0, 0, 0, 0.45)',

  /* ─────── Status ─────── */
  /** Re-tuned for dark contrast — original #15803D was too low-luminance. */
  success: '#34D399',
  /** Re-tuned for dark contrast — original #DC2626 stayed muddy on black. */
  danger: '#F87171',
} as const;

export type ColorName = keyof typeof colors;

/** Logo highlight stop, exported for SVG / decorative reuse. */
export const BRAND_HIGHLIGHT_STOP = BRAND_HIGHLIGHT;
