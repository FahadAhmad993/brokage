import { API_BASE_URL as ENV_API_BASE_URL } from '@env';

/**
 * Application identity and runtime configuration.
 * Keep APP_VERSION aligned with package.json when releasing.
 */
export const APP_NAME = 'Brokage';
export const APP_VERSION = '0.0.1';

export const IS_DEVELOPMENT = __DEV__;

/** When `live`, replace `src/api/client.ts` calls with your HTTP client + auth. */
export type ApiMode = 'mock' | 'live';
export const API_MODE: ApiMode = 'live';

/** Base URL for REST/GraphQL — set `API_BASE_URL` in `.env` (loaded via react-native-dotenv). */
export const API_BASE_URL = ENV_API_BASE_URL ?? '';

if (API_MODE === 'live' && !API_BASE_URL && IS_DEVELOPMENT) {
  // Soft warning only — throwing at module load would crash before the error boundary mounts.
  console.warn(
    '[Brokage] API_BASE_URL is not set. Define it in .env, then restart Metro with `--reset-cache`.',
  );
}
export const appConfig = {

  name: APP_NAME,
  version: APP_VERSION,
  isDevelopment: IS_DEVELOPMENT,
  apiMode: API_MODE,
  apiBaseUrl: API_BASE_URL,
} as const;
