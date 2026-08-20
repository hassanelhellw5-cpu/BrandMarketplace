import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, tokenStore } from '../api/client'

const AuthContext = createContext(null)

let banToastFn = null
export function setBanToast(fn) { banToastFn = fn }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = tokenStore.getAccess()
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const me = await api.get('/auth/me').then((r) => r.data)
      if (me.status === 'Banned') {
        tokenStore.clear()
        setUser(null)
        banToastFn?.error?.('Your account has been banned. Please contact support.')
        return
      }
      setUser(me)
    } catch {
      tokenStore.clear()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    tokenStore.set(data.token, data.refreshToken)
    setUser(data.user)
    return data.user
  }, [])

  const signup = useCallback(async (payload) => {
    const { data } = await api.post('/auth/signup', payload)
    tokenStore.set(data.token, data.refreshToken)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    tokenStore.clear()
    setUser(null)
  }, [])

  const hasRole = useCallback((...roles) => {
    return !!user && user.roles?.some((r) => roles.includes(r))
  }, [user])

  const value = {
    user,
    setUser,
    loading,
    login,
    signup,
    logout,
    loadUser,
    hasRole,
    isAuthed: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function displayName(user) {
  if (!user) return 'Guest'
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return (
    user.displayName ||
    user.fullName ||
    full ||
    user.companyName ||
    user.userName ||
    user.email ||
    'Guest'
  )
}
