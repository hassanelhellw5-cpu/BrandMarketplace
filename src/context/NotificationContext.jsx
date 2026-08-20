import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { tokenStore } from '../api/client'
import { API_BASE } from '../config'

const NotificationCtx = createContext(null)

export function useNotification() {
  return useContext(NotificationCtx)
}

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [popups, setPopups] = useState([])
  const connectionRef = useRef(null)
  const popupIdRef = useRef(0)

  const addPopup = useCallback((notif) => {
    const id = ++popupIdRef.current
    setPopups((p) => [...p, { ...notif, popupId: id }])
    setTimeout(() => {
      setPopups((p) => p.filter((x) => x.popupId !== id))
    }, 6000)
  }, [])

  const dismissPopup = useCallback((popupId) => {
    setPopups((p) => p.filter((x) => x.popupId !== popupId))
  }, [])

  useEffect(() => {
    const token = tokenStore.getAccess()
    if (!token) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE.replace('/api', '')}/hubs/notifications`, {
        accessTokenFactory: () => tokenStore.getAccess() || '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connectionRef.current = conn

    conn.on('ReceiveNotification', (notif) => {
      setUnreadCount((c) => c + 1)
      addPopup(notif)
    })

    conn.start().catch(() => {})

    return () => {
      conn.stop().catch(() => {})
      connectionRef.current = null
    }
  }, [addPopup])

  const markReadLocal = useCallback(() => {
    setUnreadCount((c) => Math.max(0, c - 1))
  }, [])

  const setUnread = useCallback((n) => {
    setUnreadCount(n)
  }, [])

  return (
    <NotificationCtx.Provider value={{ unreadCount, popups, dismissPopup, markReadLocal, setUnread }}>
      {children}
    </NotificationCtx.Provider>
  )
}
