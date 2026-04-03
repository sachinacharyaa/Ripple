/** Optional: set on `window` from a small inline script when embedding the static landing. */
declare global {
  interface Window {
    RIPPLE_APP_ORIGIN?: string;
  }
}

export {};
