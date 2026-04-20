/**
 * Base URL for API calls.
 *
 * In development, Vite's proxy forwards "/api" to the local backend,
 * so the base is empty (relative paths work).
 *
 * In production (Vercel), VITE_API_URL must point to the Render backend,
 * e.g.  VITE_API_URL=https://your-backend.onrender.com
 */
const API_BASE = import.meta.env.PROD 
  ? "https://intelligent-student-group-formation.onrender.com" 
  : (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/**
 * Build the full URL for an API endpoint.
 * Usage:  fetch(apiUrl('/api/admin/students'), { ... })
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
