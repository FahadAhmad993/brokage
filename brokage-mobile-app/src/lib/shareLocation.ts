import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import type { ChatLocationRef } from '../types/models';
import { logger } from './logger';

/**
 * Configure the iOS auth flow up-front so the first `getCurrentPosition` call
 * actually triggers the system permission dialog instead of silently timing
 * out. Idempotent: react-native-community/geolocation merges the config.
 */
let iosConfigured = false;
function ensureIosConfigured() {
  if (Platform.OS !== 'ios' || iosConfigured) {
    return;
  }
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: 'whenInUse',
    enableBackgroundLocationUpdates: false,
    locationProvider: 'auto',
  });
  iosConfigured = true;
}

/**
 * Static map preview is composed from a 2×2 grid of OSM raster tiles. We use
 * `tile.openstreetmap.org` directly (instead of the flaky third-party
 * staticmap.openstreetmap.de service) so the preview survives flaky
 * networks and geo restrictions.
 */
export const STATIC_MAP_TILE_SIZE = 256;
export const STATIC_MAP_GRID = 2;
export const STATIC_MAP_ZOOM = 15;
export const STATIC_MAP_PREVIEW = {
  width: STATIC_MAP_TILE_SIZE * STATIC_MAP_GRID,
  height: STATIC_MAP_TILE_SIZE * STATIC_MAP_GRID,
};

type TileCoord = { x: number; y: number; subdomain: string };

/**
 * Convert a lon/lat to world-pixel coordinates at the given OSM zoom.
 * Uses the standard Web Mercator projection that OSM tiles are rendered in.
 */
function lonLatToWorldPixel(
  lon: number,
  lat: number,
  zoom: number,
): { x: number; y: number } {
  const scale = STATIC_MAP_TILE_SIZE * Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const clamped = Math.max(-0.9999, Math.min(0.9999, sinLat));
  const y =
    (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/** Inverse of `lonLatToWorldPixel` — used by the draggable map picker to
 *  turn a pixel pan distance back into a lat/lon delta. */
export function worldPixelToLonLat(
  x: number,
  y: number,
  zoom: number,
): { longitude: number; latitude: number } {
  const scale = STATIC_MAP_TILE_SIZE * Math.pow(2, zoom);
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { longitude, latitude };
}

export { lonLatToWorldPixel };

function tileSubdomain(x: number, _y: number): string {
  // CartoDB rotates across a/b/c/d subdomains for parallel fetches.
  const subs = ['a', 'b', 'c', 'd'];
  return subs[((x % subs.length) + subs.length) % subs.length] ?? 'a';
}

/**
 * Pixel anchor describing where on the composed grid the marker should sit.
 * Coordinates are in the grid's own pixel space (0..gridSize).
 */
export type StaticMapPreview = {
  tiles: TileCoord[];
  pinX: number;
  pinY: number;
  size: { width: number; height: number };
  zoom: number;
};

/**
 * Build a self-contained static map preview by:
 *   1. Picking the 2×2 tile window whose centre is closest to the marker.
 *   2. Returning the four tile URLs plus the marker's pixel coords inside
 *      that window. The renderer just lays the tiles out in a grid and
 *      positions the pin absolutely at (pinX, pinY).
 */
export function buildStaticMapPreview(
  latitude: number,
  longitude: number,
  zoom = STATIC_MAP_ZOOM,
): StaticMapPreview {
  const { x: worldX, y: worldY } = lonLatToWorldPixel(longitude, latitude, zoom);
  // Anchor tile is one tile up/left of the marker tile so the marker lands
  // roughly in the centre of the 2×2 window (not on the edge).
  const anchorTileX = Math.floor(worldX / STATIC_MAP_TILE_SIZE) - 1;
  const anchorTileY = Math.floor(worldY / STATIC_MAP_TILE_SIZE) - 1;
  const tiles: TileCoord[] = [];
  for (let dy = 0; dy < STATIC_MAP_GRID; dy++) {
    for (let dx = 0; dx < STATIC_MAP_GRID; dx++) {
      const x = anchorTileX + dx;
      const y = anchorTileY + dy;
      tiles.push({ x, y, subdomain: tileSubdomain(x, y) });
    }
  }
  // Pin position inside the composed grid.
  const pinX = worldX - anchorTileX * STATIC_MAP_TILE_SIZE;
  const pinY = worldY - anchorTileY * STATIC_MAP_TILE_SIZE;
  return {
    tiles,
    pinX,
    pinY,
    size: STATIC_MAP_PREVIEW,
    zoom,
  };
}

/**
 * CartoDB's "Voyager" basemap — same OpenStreetMap data, but served from
 * Carto's tile CDN. Used for many production web apps; no API key required
 * for non-commercial use, no User-Agent restriction (unlike
 * tile.openstreetmap.org which blocks generic clients), and far more
 * reliable across regions.
 */
export function buildOsmTileUrl(tile: TileCoord, zoom: number): string {
  return `https://${tile.subdomain}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tile.x}/${tile.y}.png`;
}

/** Open the shared location in the device's native maps app. */
export function buildExternalMapsUrl(
  latitude: number,
  longitude: number,
  label?: string | null,
): string {
  const q = label
    ? encodeURIComponent(label)
    : `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  if (Platform.OS === 'ios') {
    return `https://maps.apple.com/?ll=${latitude},${longitude}&q=${q}`;
  }
  return `geo:${latitude},${longitude}?q=${latitude},${longitude}(${q})`;
}

async function ensureAndroidPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  // Try fine location first; fall back to coarse so the share still works
  // on devices where the user only granted approximate location.
  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Share your location',
      message:
        'Brokage needs access to your location so you can share it in a chat.',
      buttonPositive: 'Allow',
      buttonNegative: 'Cancel',
    },
  );
  if (fine === PermissionsAndroid.RESULTS.GRANTED) {
    return true;
  }
  const coarse = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  );
  return coarse === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Wrap iOS's callback-style `requestAuthorization` in a promise. The library
 * resolves both success/error to the same callback, so we just wait for it
 * to fire before issuing `getCurrentPosition`. Without this the first call
 * after install can race the system prompt and time out.
 */
function requestIosAuthorization(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    try {
      Geolocation.requestAuthorization(
        () => resolve(),
        err => {
          logger.debug('iOS requestAuthorization error', err);
          // Don't reject — getCurrentPosition will surface the permission
          // denial with a clearer message that we translate below.
          resolve();
        },
      );
    } catch (err) {
      logger.debug('iOS requestAuthorization threw', err);
      resolve();
    }
  });
}

type Coords = { latitude: number; longitude: number };

function getPosition(opts: {
  enableHighAccuracy: boolean;
  timeoutMs: number;
}): Promise<Coords> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      err => {
        const code = (err as { code?: number } | null)?.code;
        const msg = err?.message ?? 'Location unavailable';
        reject(Object.assign(new Error(msg), { code }));
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        timeout: opts.timeoutMs,
        // Accept any fix from the last 5 min — instant when the OS already
        // has a recent location cached, avoids a fresh-fix hang on sim.
        maximumAge: 5 * 60_000,
      },
    );
  });
}

/**
 * Two-pass fetch: try high accuracy first (real GPS on device), fall back
 * to network/coarse positioning. The simulator has no GPS, so the high-acc
 * pass will always time out there — the fallback is what actually returns a
 * coordinate. On a real device the first pass usually succeeds within a
 * few seconds.
 */
async function getCurrentPosition(): Promise<Coords> {
  try {
    return await getPosition({ enableHighAccuracy: true, timeoutMs: 8_000 });
  } catch (err) {
    logger.debug('High-accuracy GPS failed, retrying coarse', err);
    return getPosition({ enableHighAccuracy: false, timeoutMs: 15_000 });
  }
}

/**
 * Best-effort reverse geocoding via OpenStreetMap Nominatim. Free and
 * keyless, but rate-limited — we time out fast and fall back to coordinates
 * so a slow lookup never blocks the user from sending.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=0`,
      {
        method: 'GET',
        headers: {
          // Nominatim's usage policy requires identifying the caller.
          'User-Agent': 'Brokage/1.0',
          Accept: 'application/json',
        },
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { display_name?: string } | null;
    const name = data?.display_name?.trim();
    return name && name.length > 0 ? name : null;
  } catch (err) {
    logger.debug('reverseGeocode failed', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Capture the device's current location and best-effort reverse-geocode it.
 * Throws on permission denial / timeout so the caller can show an error in
 * the composer's send-error strip.
 */
export async function captureCurrentLocation(): Promise<ChatLocationRef> {
  ensureIosConfigured();
  await requestIosAuthorization();
  const allowed = await ensureAndroidPermission();
  if (!allowed) {
    throw new Error('Location permission denied');
  }
  let coords: Coords;
  try {
    coords = await getCurrentPosition();
  } catch (err) {
    throw new Error(humanizeLocationError(err));
  }
  const label = await reverseGeocode(coords.latitude, coords.longitude);
  return { latitude: coords.latitude, longitude: coords.longitude, label };
}

/**
 * Map raw Geolocation error codes onto the kind of message a user can act
 * on. Codes follow the W3C Geolocation API: 1=denied, 2=position
 * unavailable, 3=timeout.
 */
function humanizeLocationError(err: unknown): string {
  const code = (err as { code?: number } | null)?.code;
  switch (code) {
    case 1:
      return 'Location permission denied. Enable it in Settings to share your location.';
    case 2:
      return "Couldn't find your location. Make sure location services are on.";
    case 3:
      return Platform.OS === 'ios'
        ? "Location request timed out. On the simulator, set Features → Location → Apple or a custom coordinate, then try again."
        : "Location request timed out. Move to an area with better GPS signal and try again.";
    default:
      return err instanceof Error
        ? err.message
        : 'Could not share your location';
  }
}

/** Short, bubble-friendly description for a shared location. */
export function describeLocation(loc: ChatLocationRef): string {
  if (loc.label && loc.label.trim().length > 0) {
    return loc.label.trim();
  }
  return `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`;
}
