const ROSTER_KEY = 'bm_roster_v1'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new Event('bm-roster-changed'))
  } catch { /* ignore */ }
}

export function getRoster(agencyId) {
  const store = loadJSON(ROSTER_KEY, {})
  return (store[agencyId]?.models || []).slice()
}

export function addToRoster(agencyId, model) {
  if (!agencyId || !model?.modelUserId) return false
  const store = loadJSON(ROSTER_KEY, {})
  const list = (store[agencyId]?.models || []).filter((m) => m.modelUserId !== model.modelUserId)
  if (list.length >= 999) return false
  list.push({
    modelUserId: model.modelUserId,
    displayName: model.displayName || model.userName || `Model ${model.modelUserId}`,
    userName: model.userName || '',
    profilePictureUrl: model.profilePictureUrl || '',
    addedAt: new Date().toISOString(),
  })
  store[agencyId] = { models: list }
  saveJSON(ROSTER_KEY, store)
  return true
}

export function removeFromRoster(agencyId, modelUserId) {
  if (!agencyId) return
  const store = loadJSON(ROSTER_KEY, {})
  store[agencyId] = { models: (store[agencyId]?.models || []).filter((m) => m.modelUserId !== modelUserId) }
  saveJSON(ROSTER_KEY, store)
}

export function isInRoster(agencyId, modelUserId) {
  if (!agencyId) return false
  return getRoster(agencyId).some((m) => m.modelUserId === modelUserId)
}

export function listenRoster(fn) {
  const onStorage = (e) => { if (e.key === ROSTER_KEY) fn(getAll()) }
  const onChanged = () => fn(getAll())
  window.addEventListener('storage', onStorage)
  window.addEventListener('bm-roster-changed', onChanged)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('bm-roster-changed', onChanged)
  }
}

export function getAll() {
  return loadJSON(ROSTER_KEY, {})
}
