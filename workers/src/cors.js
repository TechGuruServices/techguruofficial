/**
 * Shared CORS origin allowlist.
 * Every handler must resolve the request Origin through here —
 * never echo the raw Origin header back.
 */

const ALLOWED_ORIGINS = [
  'https://techguruofficial.us',
  'https://www.techguruofficial.us',
  'http://localhost:8000', // for local dev
  'http://127.0.0.1:8000', // for local dev
  'http://localhost:3000', // for local dev
  'http://localhost:5500', // VS Code Live Server
  'http://127.0.0.1:5500', // VS Code Live Server
  'http://localhost:5501', // VS Code Live Server alt
  'http://127.0.0.1:5501', // VS Code Live Server alt
  'http://localhost:5173', // Vite
  'http://localhost:4173', // Vite preview
];

const FALLBACK_ORIGIN = 'https://techguruofficial.us';

/**
 * Returns the Origin to send in Access-Control-Allow-Origin.
 * Allowed origins are echoed; anything else gets the safe fallback
 * (browser will block the response for disallowed origins).
 */
export const resolveCorsOrigin = (origin) => {
  if (typeof origin === 'string' && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return FALLBACK_ORIGIN;
};
