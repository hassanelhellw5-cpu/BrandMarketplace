import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Video, BellRing, Check, X, UserPlus } from 'lucide-react'
import * as signalR from '@microsoft/signalr'
import { useAuth } from '../context/AuthContext'
import { get, post, errMsg } from '../api/client'
import { API_BASE } from '../config'
import { tokenStore } from '../api/client'
import { useToast } from '../components/Toast'
import MeetingRoom from '../components/MeetingRoom'

async function resolveInvitees(room, meId) {
  const m = String(room || '').match(/^bm-([a-z]+)-(\d+)$/)
  if (!m || !meId) return []
  const [, kind, id] = m

  if (kind === 'contract') {
    const c = await get(`/contracts/${id}`)
    const contract = c?.contract || c
    if (!contract?.bookingId) return []
    const bk = await get(`/bookings/${contract.bookingId}`)
    const booking = bk?.booking || bk
    return [booking.modelUserId, booking.brandUserId, booking.agencyUserId]
      .filter((u) => u && String(u) !== String(meId))
  }

  if (kind === 'casting' || kind === 'campaign') {
    const res = await get(`/${kind}s/${id}`)
    const entity = res?.casting || res?.campaign || res
    const ownerId = entity.brandUserId
    if (!ownerId) return []
    if (String(ownerId) === String(meId)) {
      const apps = await get(`/${kind}s/${id}/applications`, { pageSize: 100 })
      return (apps?.data || []).map((a) => a.modelUserId).filter((u) => u && String(u) !== String(meId))
    }
    return [ownerId]
  }

  if (kind === 'event') {
    const res = await get(`/events/${id}`)
    const entity = res?.evt || res
    const ownerId = entity.userId
    if (!ownerId) return []
    if (String(ownerId) === String(meId)) {
      const regs = await get(`/events/${id}/registrations`, { pageSize: 100 })
      return (regs?.data || []).map((r) => r.userId).filter((u) => u && String(u) !== String(meId))
    }
    return [ownerId]
  }

  return []
}

export default function Meeting() {
  const { room } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const displayName = user?.displayName || user?.userName || 'Guest'
  const [inviteState, setInviteState] = useState('idle')
  const [joinRequest, setJoinRequest] = useState(null)
  const [inRoom, setInRoom] = useState(false)
  const connRef = useRef(null)

  // MeetingHub connection
  useEffect(() => {
    if (!user?.id || !room) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE.replace('/api', '')}/hubs/meeting`, {
        accessTokenFactory: () => tokenStore.getAccess() || '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connRef.current = conn

    conn.on('UserJoined', (data) => {
      toast.info(`${data.displayName} joined the meeting`)
    })

    conn.on('MeetingJoinRequest', (data) => {
      setJoinRequest(data)
    })

    conn.on('MeetingJoinAccepted', (data) => {
      if (data.room === room) {
        toast.success('Your join request was accepted!')
        setInRoom(true)
      }
    })

    conn.on('MeetingJoinDeclined', (data) => {
      if (data.room === room) {
        toast.error('Your join request was declined.')
        navigate('/contracts')
      }
    })

    conn.start().then(() => {
      conn.invoke('JoinRoom', room, displayName).catch(() => {})
    }).catch(() => {})

    return () => { conn.stop().catch(() => {}) }
  }, [room, user?.id, displayName, toast, navigate])

  // Send invite notifications
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!user?.id || !room) return
      try {
        const invitees = await resolveInvitees(room, user.id)
        if (cancelled || invitees.length === 0) return
        for (const uid of invitees) {
          await post('/chat/send', {
            receiverUserId: uid,
            content: `${displayName} is waiting for you in the online meeting. Join: /meeting/${room}`,
            messageType: 'Text',
          })
        }
        if (cancelled) return
        setInviteState('sent')
        toast.success('Meeting invite sent to the other party')
      } catch (err) {
        if (cancelled) return
        console.error('meeting invite failed:', errMsg(err))
      }
    }
    run()
    return () => { cancelled = true }
  }, [room, user?.id, displayName, toast])

  const acceptJoin = async () => {
    if (!joinRequest) return
    try {
      await connRef.current?.invoke('AcceptMeetingJoin', room, joinRequest.userId)
      toast.success(`${joinRequest.displayName} joined the meeting`)
      setJoinRequest(null)
      setInRoom(true)
    } catch { toast.error('Failed to accept') }
  }

  const declineJoin = async () => {
    if (!joinRequest) return
    try {
      await connRef.current?.invoke('DeclineMeetingJoin', room, joinRequest.userId)
      toast.info(`Join request declined`)
      setJoinRequest(null)
    } catch { toast.error('Failed to decline') }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0b0f1a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link to="/contracts" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)', fontSize: 13, textDecoration: 'none' }}>
          <ArrowLeft size={15} /> Exit meeting
        </Link>
        <span style={{ color: 'var(--text-dim)', fontSize: 13, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Video size={14} /> <strong style={{ color: '#fff', fontWeight: 600 }}>{room}</strong>
        </span>
        {inviteState === 'sent' && (
          <span style={{ color: '#6EE7B7', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}>
            <BellRing size={13} /> Invite sent
          </span>
        )}
      </div>

      {/* Join request popup */}
      {joinRequest && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 10001,
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 16,
          padding: '20px 28px', boxShadow: '0 12px 40px rgba(0,0,0,.5)',
          border: '1px solid rgba(139,92,246,0.3)', minWidth: 320, textAlign: 'center',
          animation: 'slideDown 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <UserPlus size={20} color="#c4b5fd" />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Meeting Join Request</span>
          </div>
          <p style={{ color: '#c4b5fd', fontSize: 14, marginBottom: 16 }}>
            <strong style={{ color: '#fff' }}>{joinRequest.displayName}</strong> wants to join the meeting
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={acceptJoin} style={{
              background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}><Check size={16} /> Accept</button>
            <button onClick={declineJoin} style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}><X size={16} /> Decline</button>
          </div>
          <style>{`@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0 }}>
        <MeetingRoom room={room} displayName={displayName} />
      </div>
    </div>
  )
}
