import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth, displayName } from './AuthContext'
import { getPlan, getPlans } from '../data/plans'
import { get, post } from '../api/client'

const USAGE_KEY = 'bm_usage_v1'

const monthKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

export function pickRole(user) {
  return (user?.roles || []).find((r) => ['Model', 'Agency', 'Brand'].includes(r)) || null
}

// Backend stores the global plan name (Free/Starter/Professional/Enterprise) plus the
// website plan name (e.g. Elite, Pro, Growth). The website catalogs are per-role, so we
// resolve the matching catalog key by name first, then fall back to the server plan name.
const SERVER_PLAN_KEYS = {
  Model: { free: 'starter', starter: 'starter', professional: 'pro', enterprise: 'elite' },
  Brand: { free: 'starter', starter: 'starter', professional: 'growth', enterprise: 'enterprise' },
  Agency: { free: 'starter', starter: 'starter', professional: 'pro', enterprise: 'elite' },
}

function resolvePlanKey(role, sub) {
  if (!role || !sub) return null
  const catalog = getPlans(role)
  if (sub.planName) {
    const byName = catalog.find((p) => p.name.toLowerCase() === String(sub.planName).toLowerCase())
    if (byName) return byName.key
  }
  const serverKey = String(sub.plan || 'free').toLowerCase()
  return SERVER_PLAN_KEYS[role]?.[serverKey] || catalog[0]?.key || null
}

const SubscriptionContext = createContext(null)

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.id
  const role = pickRole(user)

  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState(() => loadJSON(USAGE_KEY, {}))

  useEffect(() => { saveJSON(USAGE_KEY, usage) }, [usage])

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const res = await get('/enterprise/subscription')
        if (!cancelled && res) {
          setSub(res.id ? res : null)
        }
      } catch { /* no subscription yet */ }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [uid])

  const status = useMemo(() => {
    if (!sub) return 'none'
    if (sub.status === 'Active' && sub.isActive) return 'active'
    if (sub.status === 'Pending') return 'pending'
    if (sub.status === 'Cancelled') return 'cancelled'
    return 'expired'
  }, [sub])

  const activePlanKey = status === 'active' ? resolvePlanKey(role, sub) : null
  const plans = role ? getPlans(role) : []
  const plan = role ? getPlan(role, activePlanKey) : null

  const can = useCallback((f) => !!plan && plan.features.some((x) => x.f === f), [plan])
  const limit = useCallback((f) => {
    const item = plan?.features.find((x) => x.f === f)
    return item ? item.limit : 0
  }, [plan])

  const remaining = useCallback((f) => {
    const lim = limit(f)
    const bucket = uid && usage[uid]?.month === monthKey() ? usage[uid].items : {}
    const used = bucket[f] || 0
    return { used, limit: lim, remaining: lim === null ? Infinity : Math.max(0, lim - used) }
  }, [uid, usage, limit])

  const consume = useCallback((f, n = 1) => {
    if (!uid) return
    setUsage((prev) => {
      const cur = prev[uid] && prev[uid].month === monthKey() ? prev[uid] : { month: monthKey(), items: {} }
      return { ...prev, [uid]: { month: cur.month, items: { ...cur.items, [f]: (cur.items[f] || 0) + n } } }
    })
  }, [uid])

  const subscribe = useCallback(async (planObj, payment, opts = {}) => {
    if (!uid || !planObj) return null
    const planMap = { starter: 'Starter', pro: 'Professional', elite: 'Enterprise', growth: 'Professional', enterprise: 'Enterprise', free: 'Free' }
    const serverPlan = planMap[planObj.key] || 'Starter'
    const trialEndDate = opts.trial ? new Date(Date.now() + (opts.trialDays || 10) * 86400000).toISOString() : null
    const res = await post('/enterprise/subscription', {
      plan: serverPlan,
      planName: planObj.name,
      price: opts.trial ? 0 : planObj.price || 0,
      billingCycle: 'Monthly',
      autoRenew: true,
      trialEndDate,
      paymentMethod: payment?.method && payment?.method !== 'trial' ? payment.method : null,
      paymentReference: payment?.reference || null,
    })
    if (res) {
      const stored = { ...res, server: true, userName: displayName(user), userEmail: user?.email, role, planKey: planObj.key }
      setSub(stored)
      return stored
    }
    return null
  }, [uid, user, role])

  const cancel = useCallback(async () => {
    if (!uid) return
    try {
      await post('/enterprise/subscription/cancel')
    } catch { /* ignore */ }
    setSub((prev) => prev ? { ...prev, isActive: false, status: 'Cancelled', updatedAt: new Date().toISOString() } : null)
  }, [uid])

  const value = {
    sub,
    status,
    loading,
    isActive: status === 'active',
    role,
    plans,
    plan,
    planKey: status === 'active' ? (activePlanKey || plans[0]?.key || null) : plans[0]?.key || null,
    can,
    limit,
    remaining,
    consume,
    subscribe,
    activate: () => {},
    cancel,
  }

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}
