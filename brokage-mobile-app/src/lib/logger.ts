import { IS_DEVELOPMENT } from '../config/appConfig';

const PREFIX = '[Brokage]';

/**
 * Structured logging — verbose output only in development builds.
 * Errors are always emitted so release builds can be diagnosed via device logs.
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (IS_DEVELOPMENT) {
      console.log(PREFIX, ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (IS_DEVELOPMENT) {
      console.info(PREFIX, ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (IS_DEVELOPMENT) {
      console.warn(PREFIX, ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error(PREFIX, ...args);
  },
};
