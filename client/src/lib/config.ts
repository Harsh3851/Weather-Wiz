/**
 * Runtime mode is decided at build time:
 * - `api`:  VITE_API_URL is set -> the Node.js/MongoDB backend is used.
 * - `demo`: no API URL -> the browser calls Open-Meteo directly and user data
 *           lives in localStorage (used for the static GitHub Pages build).
 */
const rawApiUrl = (import.meta.env.VITE_API_URL ?? '').trim();

export const API_URL = rawApiUrl.replace(/\/+$/, '');
export type AppMode = 'api' | 'demo';
export const APP_MODE: AppMode = API_URL ? 'api' : 'demo';
export const IS_DEMO = APP_MODE === 'demo';

export const REPO_URL = 'https://github.com/Harsh3851/Weather-Wiz';
export const README_URL = `${REPO_URL}#readme`;
