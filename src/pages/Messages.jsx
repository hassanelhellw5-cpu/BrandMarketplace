import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Send, Search, ArrowLeft, MoreVertical, CheckCheck, Check, Phone, PhoneOff, Video, User, ShieldAlert, EyeOff, X, Volume2 } from 'lucide-react'
import * as signalR from '@microsoft/signalr'
import { get, post, errMsg, assetUrl, tokenStore } from '../api/client'
import { API_BASE } from '../config'
import { useAuth } from '../context/AuthContext'
import { useCall } from '../context/CallContext'
import { useToast } from '../components/Toast'
import { PageLoader } from '../components/ui'
import { reportSendMessage, reportReportUser } from '../hooks/usePageTracking'
import './Messages.css'

export default function Messages() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [convs, setConvs] = useState([])
  const [active, setActive] = useState(params.get('to') || null)
  const [thread, setThread] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [q, setQ] = useState('')
  const [showMobileList, setShowMobileList] = useState(!params.get('to'))
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportModal, setReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [blockConfirm, setBlockConfirm] = useState(false)

  const { startCall } = useCall()

  const endRef = useRef(null)
  const inputRef = useRef(null)
  const connRef = useRef(null)
  const menuRef = useRef(null)

  const loadConvs = useCallback(async () => {
    try {
      const data = await get('/chat/conversations')
      const list = Array.isArray(data) ? data : (data?.data || [])
      setConvs(list)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadConvs() }, [])

  const loadThread = useCallback(async () => {
    if (!active) return
    try {
      const res = await get('/chat/messages/' + active)
      setThread(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
    } catch { setThread([]) }
  }, [active])

  useEffect(() => { loadThread() }, [loadThread])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  useEffect(() => {
    if (active) inputRef.current?.focus()
  }, [active])

  // SignalR connection for online status
  useEffect(() => {
    if (!user?.id) return
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE.replace('/api', '')}/hubs/meeting`, {
        accessTokenFactory: () => tokenStore.getAccess() || '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('UserOnline', (d) => setOnlineUsers((p) => new Set([...p, d.userId])))
    conn.on('UserOffline', (d) => setOnlineUsers((p) => { const n = new Set(p); n.delete(d.userId); return n }))

    connRef.current = conn
    conn.start().then(() => conn.invoke('SendPresence', user.displayName || user.userName).catch(() => {})).catch(() => {})
    return () => { conn.stop().catch(() => {}) }
  }, [user?.id])

  // SignalR connection for real-time messaging
  const chatConnRef = useRef(null)
  const activeRef = useRef(active)
  useEffect(() => { activeRef.current = active }, [active])

  useEffect(() => {
    if (!user?.id) return
    const chatConn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE.replace('/api', '')}/hubs/chat`, {
        accessTokenFactory: () => tokenStore.getAccess() || '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    chatConn.on('ReceiveMessage', (msg) => {
      const currentActive = activeRef.current
      const otherUserId = msg.senderUserId === user.id ? msg.receiverUserId : msg.senderUserId
      if (otherUserId === currentActive) {
        setThread((prev) => {
          const idx = prev.findIndex((m) => m.id === msg.id)
          const real = {
            id: msg.id,
            senderUserId: msg.senderUserId,
            receiverUserId: msg.receiverUserId,
            content: msg.content,
            createdAt: msg.createdAt,
            isRead: false,
          }
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = real
            return next
          }
          if (prev.some((m) => m._pending && m.senderUserId === msg.senderUserId && m.content === '')) {
            return prev.map((m) => m._pending && m.senderUserId === msg.senderUserId && m.content === '' ? real : m)
          }
          return [...prev, real]
        })
      }
      loadConvs()
    })

    chatConn.on('MessageSent', (msg) => {
      setThread((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, {
          id: msg.id,
          senderUserId: user.id,
          content: '',
          createdAt: msg.createdAt,
          isRead: false,
          _pending: true,
        }]
      })
      loadConvs()
    })

    chatConnRef.current = chatConn
    chatConn.start().catch(() => {})
    return () => { chatConn.stop().catch(() => {}) }
  }, [user?.id])

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || !active) return
    const content = text.trim()
    setText('')
    try {
      if (chatConnRef.current?.state === signalR.HubConnectionState.Connected) {
        await chatConnRef.current.invoke('SendMessage', active, content)
      } else {
        await post('/chat/send', { receiverUserId: active, content })
        const res = await get('/chat/messages/' + active)
        setThread(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
      }
      loadConvs()
      reportSendMessage(active, null)
    } catch (err) {
      toast.error(errMsg(err))
      setText(content)
    }
  }

  const selectConv = (userId) => {
    setActive(userId)
    setShowMobileList(false)
    setMenuOpen(false)
  }

  const activeConv = convs.find((c) => c.otherUserId === active)
  const filteredConvs = q.trim()
    ? convs.filter((c) => (c.otherUserName || '').toLowerCase().includes(q.trim().toLowerCase()))
    : convs

  // ---- Call actions ----
  const handleStartCall = (video) => {
    if (!active) return
    startCall(active, activeConv?.otherUserName || 'User', video)
  }

  // ---- Report / Block ----
  const handleBlock = async () => {
    if (!active) return
    try {
      await post('/reports', {
        targetType: 'User',
        targetUserId: active,
        reason: 'Blocked by user',
        description: 'User blocked from messaging',
      })
      toast.success('User blocked')
      setBlockConfirm(false)
      setMenuOpen(false)
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const handleReport = async (e) => {
    e.preventDefault()
    if (!active || !reportReason.trim()) return
    setReportSubmitting(true)
    try {
      await post('/reports', {
        targetType: 'User',
        targetUserId: active,
        reason: reportReason,
        description: reportDetails || undefined,
      })
      toast.success('Report submitted')
      setReportModal(false)
      setReportReason('')
      setReportDetails('')
      setMenuOpen(false)
      reportReportUser(active, null, reportReason)
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setReportSubmitting(false)
    }
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '30px 24px 70px' }}>
      <span className="badge" style={{ marginBottom: 10 }}>Messages</span>
      <h1 className="section-title" style={{ marginBottom: 22 }}>Conversations</h1>

      <div className="chat-wrap">
        {/* ---- LEFT: conversation list ---- */}
        <div className={`chat-panel ${showMobileList ? '' : 'hide-mobile'}`}>
          <div className="chat-panel-header">
            <Search size={15} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            <input
              placeholder="Search conversations…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="conv-list">
            {filteredConvs.length === 0 ? (
              <div className="conv-empty">
                {q.trim() ? 'No matching conversations.' : 'No conversations yet.'}
              </div>
            ) : (
              filteredConvs.map((c) => {
                const isOnline = onlineUsers.has(c.otherUserId)
                const isActive = active === c.otherUserId
                return (
                  <button
                    key={c.otherUserId}
                    className={`conv-item ${isActive ? 'active' : ''}`}
                    onClick={() => selectConv(c.otherUserId)}
                  >
                    <div className="conv-avatar-wrap">
                      {c.otherUserPhoto ? (
                        <img src={assetUrl(c.otherUserPhoto)} alt="" className="conv-avatar-img" />
                      ) : (
                        <div className="conv-avatar-fallback">{c.otherUserName?.[0] || 'U'}</div>
                      )}
                      {isOnline && <div className="online-dot" />}
                    </div>
                    <div className="conv-info">
                      <div className="conv-top">
                        <span className="conv-name">{c.otherUserName || 'User'}</span>
                        {c.lastMessageAt && <span className="conv-time">{new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                      <div className="conv-bottom">
                        <span className="conv-preview">{c.lastMessage || 'No messages yet'}</span>
                        {c.unreadCount > 0 && <span className="conv-unread">{c.unreadCount}</span>}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ---- RIGHT: chat thread ---- */}
        <div className={`chat-panel chat-right ${!showMobileList ? '' : 'hide-mobile'}`}>
          {!active ? (
            <div className="conv-empty" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <Send size={36} style={{ color: 'var(--text-faint)', opacity: 0.4 }} />
              <span style={{ color: 'var(--text-faint)', fontSize: 15 }}>Select a conversation to start messaging.</span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="chat-header">
                <button className="chat-back" onClick={() => setShowMobileList(true)}>
                  <ArrowLeft size={20} />
                </button>
                <div className="conv-avatar-wrap" style={{ width: 36, height: 36 }}>
                  {activeConv?.otherUserPhoto ? (
                    <img src={assetUrl(activeConv.otherUserPhoto)} alt="" className="conv-avatar-img" style={{ width: 36, height: 36 }} />
                  ) : (
                    <div className="conv-avatar-fallback" style={{ width: 36, height: 36, fontSize: 13 }}>{activeConv?.otherUserName?.[0] || 'U'}</div>
                  )}
                  {onlineUsers.has(active) && <div className="online-dot" style={{ width: 10, height: 10, bottom: 0, right: 0 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeConv?.otherUserName || 'User'}</div>
                  <div style={{ fontSize: 12, color: onlineUsers.has(active) ? '#10b981' : 'var(--text-faint)' }}>
                    {onlineUsers.has(active) ? 'Online now' : 'Offline'}
                  </div>
                </div>

                {/* Call buttons — always visible */}
                <button className="chat-call-btn" onClick={() => handleStartCall(false)} title="Voice call" style={!onlineUsers.has(active) ? { opacity: 0.4 } : {}}>
                  <Phone size={18} />
                </button>
                <button className="chat-call-btn" onClick={() => handleStartCall(true)} title="Video call" style={!onlineUsers.has(active) ? { opacity: 0.4 } : {}}>
                  <Video size={18} />
                </button>

                {/* Three-dot menu */}
                <div className="chat-menu-wrap" ref={menuRef}>
                  <button className="chat-call-btn" onClick={() => setMenuOpen((v) => !v)} title="More options">
                    <MoreVertical size={18} />
                  </button>
                  {menuOpen && (
                    <div className="chat-dropdown">
                      <button className="chat-dropdown-item" onClick={() => { navigate(`/u/${active}`); setMenuOpen(false) }}>
                        <User size={16} /> View profile
                      </button>
                      <button className="chat-dropdown-item" onClick={() => { toast.success('Coming soon'); setMenuOpen(false) }}>
                        {<Volume2 size={16} />} Mute notifications
                      </button>
                      <button className="chat-dropdown-item chat-dropdown-danger" onClick={() => { setBlockConfirm(true); setMenuOpen(false) }}>
                        <ShieldAlert size={16} /> Block user
                      </button>
                      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                      <button className="chat-dropdown-item" onClick={() => { setReportModal(true); setMenuOpen(false) }}>
                        <ShieldAlert size={16} style={{ color: '#f59e0b' }} /> Report user
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="msg-list">
                {thread.length === 0 && <div className="conv-empty">Say hello! 👋</div>}
                {thread.map((m, i) => {
                  const mine = m.senderUserId === user?.id
                  const prev = thread[i - 1]
                  const showDate = !prev || new Date(m.createdAt).toDateString() !== new Date(prev.createdAt).toDateString()
                  return (
                    <div key={m.id || i}>
                      {showDate && (
                        <div className="date-sep">
                          <span>{new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                      <div className={`msg ${mine ? 'msg-mine' : 'msg-theirs'}`}>
                        <div className="msg-text">
                          {String(m.content || '').split(/(\s+)/).map((tok, j) =>
                            /^\/meeting\//.test(tok)
                              ? <Link key={j} to={tok} style={{ color: mine ? '#fff' : 'var(--gold)', textDecoration: 'underline' }}>{tok}</Link>
                              : tok
                          )}
                        </div>
                        <div className="msg-meta">
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {mine && (m.isRead ? <CheckCheck size={12} /> : <Check size={12} />)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <form className="chat-input" onSubmit={send}>
                <input ref={inputRef} placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e) }} />
                <button className="btn btn-primary" type="submit" disabled={!text.trim()} style={{ borderRadius: 12, padding: '10px 16px', flexShrink: 0 }}>
                  <Send size={17} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Block confirm modal */}
      {blockConfirm && (
        <div className="modal-overlay" style={{ zIndex: 300 }} onClick={() => setBlockConfirm(false)}>
          <div className="modal-box" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px' }}>Block this user?</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: '0 0 18px' }}>
              They won't be able to message you or see your profile. This action can be undone from your settings.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setBlockConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleBlock}>Block</button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportModal && (
        <div className="modal-overlay" style={{ zIndex: 300 }} onClick={() => setReportModal(false)}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Report {activeConv?.otherUserName}</h3>
              <button onClick={() => setReportModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleReport}>
              <div className="field">
                <label>Reason *</label>
                <select required value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                  <option value="" disabled>Select a reason</option>
                  {['Harassment', 'Spam', 'Inappropriate content', 'Fake profile', 'Scam or fraud', 'Other'].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Details</label>
                <textarea rows={3} value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} placeholder="Describe what happened…" />
              </div>
              <button className="btn btn-danger" style={{ width: '100%' }} type="submit" disabled={reportSubmitting}>
                {reportSubmitting ? 'Submitting…' : 'Submit report'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
