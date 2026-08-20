// API base URL.
// In production the site and API share the same origin (brandmarketplace.runasp.net).
// In dev, Vite proxies /api -> the deployed backend (see vite.config.js).
export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

// Absolute origin of the backend (used to resolve relative image/file URLs).
export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://brandmarketplace.runasp.net'
