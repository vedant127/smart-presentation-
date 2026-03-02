/**
 * API configuration - use env for production
 * Vite exposes env vars prefixed with VITE_
 */
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' ? '' : 'http://localhost:5000');

export function apiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, '');
  const p = path.startsWith('/api') ? path : `/api/${path.replace(/^\//, '')}`;
  return base ? `${base}${p}` : p;
}
