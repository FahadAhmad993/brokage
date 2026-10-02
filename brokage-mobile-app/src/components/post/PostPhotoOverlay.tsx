/**
 * One post photo with the Brokage "branding" baked on top of it:
 *  - a faint full-picture "Broker" watermark (zameen.com style — visible if
 *    you look for it, but not shouting),
 *  - the broker's name, small, at the top-right,
 *  - optionally the live countdown under the name (Display posts),
 *  - optionally an eye + "<n> members" visitor counter at the bottom-left
 *    (Display posts).
 *
 * It is a plain View tree on purpose: the full-screen viewer snapshots this
 * exact view with `react-native-view-shot` when the user taps Download, so
 * the saved picture carries identical overlays to what is on screen.
 */
import { Eye } from 'lucide-react-native';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, type ImageResizeMode } from 'react-native';

type Props = {
  uri: string;
  width: number;
  height: number;
  brokerName?: string | null;
  /** Visitor count; `undefined` hides the eye badge (e.g. Community posts). */
  viewCount?: number;
  /** e.g. "23h 40m left"; `null`/undefined hides it. */
  remainingLabel?: string | null;
  resizeMode?: ImageResizeMode;
  /** Called when the underlying image has finished loading. */
  onImageLoad?: () => void;
  /** Smaller chrome for thumbnails (chat attachment card). */
  compact?: boolean;
};

type BrandingProps = {
  width: number;
  height: number;
  brokerName?: string | null;
  viewCount?: number;
  remainingLabel?: string | null;
  compact?: boolean;
};

/** The overlay layer only (no image) — absolutely fills its parent. */
function BrandingLayer({
  width,
  height,
  brokerName,
  viewCount,
  remainingLabel,
  compact = false,
}: BrandingProps) {
  // Scale type with the picture so the saved (larger) image and the small
  // card thumbnail keep the same proportions.
  const unit = Math.max(compact ? 8 : 10, Math.min(width, 1200) / (compact ? 34 : 30));
  const watermarkSize = Math.max(22, Math.min(width, height) * 0.24);
  const name = brokerName?.trim();

  return (
    <>
      {/* Faint diagonal watermark across the whole picture. */}
      <View pointerEvents="none" style={styles.watermarkWrap}>
        <Text
          style={[
            styles.watermark,
            { fontSize: watermarkSize, lineHeight: watermarkSize * 1.15 },
          ]}>
          Broker
        </Text>
      </View>

      {name || remainingLabel ? (
        <View
          pointerEvents="none"
          style={[styles.topRight, { top: unit * 0.7, right: unit * 0.7, gap: unit * 0.35 }]}>
          {name ? (
            <View style={[styles.chip, chipPad(unit)]}>
              <Text style={[styles.chipText, { fontSize: unit }]} numberOfLines={1}>
                {name}
              </Text>
            </View>
          ) : null}
          {remainingLabel ? (
            <View style={[styles.chip, chipPad(unit)]}>
              <Text style={[styles.chipText, { fontSize: unit }]}>{remainingLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {typeof viewCount === 'number' ? (
        <View
          pointerEvents="none"
          style={[
            styles.eyeBadge,
            chipPad(unit),
            { left: unit * 0.7, bottom: unit * 0.7, gap: unit * 0.35 },
          ]}>
          <Eye color="#FFFFFF" size={unit * 1.15} strokeWidth={2.2} />
          <Text style={[styles.chipText, { fontSize: unit }]}>
            {viewCount} {viewCount === 1 ? 'member' : 'members'}
          </Text>
        </View>
      ) : null}
    </>
  );
}

function chipPad(unit: number) {
  return {
    paddingHorizontal: unit * 0.6,
    paddingVertical: unit * 0.2,
    borderRadius: unit * 0.5,
  };
}

/**
 * Same overlay for a parent whose size isn't known up front (e.g. the chat
 * ads album, which fills a flex box). Measures itself, then draws.
 */
export function PostPhotoBranding(props: Omit<BrandingProps, 'width' | 'height'>) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setSize(prev =>
          prev && prev.width === width && prev.height === height ? prev : { width, height },
        );
      }}>
      {size ? <BrandingLayer {...props} width={size.width} height={size.height} /> : null}
    </View>
  );
}

export const PostPhotoOverlay = React.forwardRef<View, Props>(
  function PostPhotoOverlay(
    { uri, width, height, resizeMode = 'cover', onImageLoad, ...branding },
    ref,
  ) {
    return (
      <View
        ref={ref}
        collapsable={false}
        style={{ width, height, backgroundColor: '#000' }}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          onLoad={onImageLoad}
        />
        <BrandingLayer width={width} height={height} {...branding} />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  watermarkWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  watermark: {
    color: 'rgba(255,255,255,0.22)',
    fontWeight: '800',
    letterSpacing: 2,
    transform: [{ rotate: '-24deg' }],
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    // Android adds extra font padding that makes rotated text look off-centre.
    includeFontPadding: false,
  },
  topRight: {
    position: 'absolute',
    alignItems: 'flex-end',
    maxWidth: '60%',
  },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  chipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  eyeBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
