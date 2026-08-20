// API base URL.
// In dev, Vite proxies /api -> localhost:5032 (see vite.config.js).
// In production (Vercel), vercel.json rewrites /api -> brandmarketplace.runasp.net.
export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// Absolute origin of the backend (used to resolve relative image/file URLs).
export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'https://brandmarketplace.runasp.net'
