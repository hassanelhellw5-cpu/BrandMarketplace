import axios from 'axios'
import { API_BASE, API_ORIGIN } from '../config'

const TOKEN_KEY = 'bm_access_token'
const REFRESH_KEY = 'bm_refresh_token'

// Resolve backend-relative file URLs (e.g. "/uploads/pictures/x.jpg" or "uploads/x.jpg")
// to an absolute URL on the API origin so images work in dev and in prod.
export function assetUrl(url) {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  return url.startsWith('/') ? `${API_ORIGIN}${url}` : `${API_ORIGIN}/${url}`
}

export const tokenStore = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access, refresh) => {
    localStorage.setItem(TOKEN_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach bearer token
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 403 (banned), force logout
let banning = false
// On 401, try refresh once
let refreshing = null
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 403 && !banning) {
      banning = true
      tokenStore.clear()
      window.dispatchEvent(new CustomEvent('bm:banned', { detail: { message: error.response?.data?.message || 'Your account has been banned.' } }))
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      banning = false
      return Promise.reject(error)
    }
    if (error.response?.status === 401 && !original._retried && tokenStore.getRefresh()) {
      original._retried = true
      try {
        refreshing = refreshing || axios.post(`${API_BASE}/auth/refresh`, {
          accessToken: tokenStore.getAccess(),
          refreshToken: tokenStore.getRefresh(),
        })
        const { data } = await refreshing
        refreshing = null
        tokenStore.set(data.token, data.refreshToken)
        original.headers.Authorization = `Bearer ${data.token}`
        return api(original)
      } catch {
        refreshing = null
        tokenStore.clear()
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  },
)

// ---- Generic helpers ----
export function errMsg(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback
}

// Some list fields (categories, specialties, requiredModelTypes, tags...) are stored
// inconsistently as JSON arrays ("[...]") or plain comma strings ("Fashion, Editorial").
// This safely parses either form without crashing the page.
export function parseList(value, fallback = []) {
  if (value == null || value === '') return fallback
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return fallback
  const t = value.trim()
  if (t.startsWith('[')) {
    try {
      const v = JSON.parse(t)
      return Array.isArray(v) ? v : fallback
    } catch { /* fall through to comma split */ }
  }
  return t.split(',').map((s) => s.trim()).filter(Boolean)
}

// Some "list" endpoints (e.g. /stories/my) return a bare object when there is
// exactly one row and an array when there are many. Normalize to an array.
export function asArray(value, fallback = []) {
  if (Array.isArray(value)) return value
  if (value == null) return fallback
  if (Array.isArray(value.data)) return value.data
  return [value]
}

export async function get(url, params) {
  const { data } = await api.get(url, { params })
  return data
}

export async function post(url, body) {
  const { data } = await api.post(url, body)
  return data
}

export async function put(url, body) {
  const { data } = await api.put(url, body)
  return data
}

export async function del(url) {
  const { data } = await api.delete(url)
  return data
}

export function upload(url, formData) {
  return api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
}
