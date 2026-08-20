import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as signalR from '@microsoft/signalr'
import { API_BASE } from '../config'
import { tokenStore } from '../api/client'
import { useAuth } from './AuthContext'
import IncomingCallPopup from '../components/IncomingCallPopup'
import CallPanel from '../components/CallPanel'

const CallContext = createContext(null)

export function CallProvider({ children }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [incomingCall, setIncomingCall] = useState(null)
  const [activeCall, setActiveCall] = useState(null)
  const [conn, setConn] = useState(null)
  const incomingRef = useRef(null)

  useEffect(() => { incomingRef.current = incomingCall }, [incomingCall])

  useEffect(() => {
    if (!user?.id) return
    const c = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE.replace('/api', '')}/hubs/meeting`, {
        accessTokenFactory: () => tokenStore.getAccess() || '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    c.on('CallOffer', (data) => {
      if (String(data.callerId) === String(user.id)) return
      if (incomingRef.current || activeCallRef.current) {
        c.invoke('CallReject', data.callerId).catch(() => {})
        return
      }
      setIncomingCall({
        callerId: data.callerId,
        callerName: data.callerName || 'User',
        peerId: data.peerId,
        isVideo: data.isVideo,
      })
    })

    c.on('CallRejected', () => {
      setActiveCall(null)
    })

    c.on('CallEnded', () => {
      setActiveCall(null)
      setIncomingCall(null)
    })

    c.start().then(() => {
      setConn(c)
      c.invoke('SendPresence', user.displayName || user.userName).catch(() => {})
    }).catch((err) => console.warn('Meeting hub connection failed:', err))
    return () => { c.stop().catch(() => {}) }
  }, [user?.id])

  const activeCallRef = useRef(null)
  useEffect(() => { activeCallRef.current = activeCall }, [activeCall])

  const startCall = useCallback((peerUserId, peerName, isVideo) => {
    setActiveCall({
      direction: 'outgoing',
      peerUserId,
      peerName,
      isVideo,
    })
  }, [])

  const acceptCall = useCallback(() => {
    if (!incomingCall) return
    setActiveCall({
      direction: 'incoming',
      peerUserId: incomingCall.callerId,
      peerName: incomingCall.callerName,
      isVideo: incomingCall.isVideo,
      callerId: incomingCall.callerId,
      callerPeerId: incomingCall.peerId,
    })
    setIncomingCall(null)
  }, [incomingCall])

  const rejectCall = useCallback(() => {
    if (!incomingCall || !conn) return
    conn.invoke('CallReject', incomingCall.callerId).catch(() => {})
    setIncomingCall(null)
  }, [incomingCall, conn])

  const handleCallEnd = useCallback(() => {
    setActiveCall(null)
  }, [])

  return (
    <CallContext.Provider value={{ incomingCall, activeCall, startCall, acceptCall, rejectCall, conn }}>
      {children}
      {incomingCall && !activeCall && (
        <IncomingCallPopup
          call={incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
      {activeCall && conn && (
        <CallPanel
          call={activeCall}
          onEnd={handleCallEnd}
          hubConnection={conn}
        />
      )}
    </CallContext.Provider>
  )
}

export function useCall() {
  return useContext(CallContext)
}
