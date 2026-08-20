import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Trash2, Heart, MessageCircle, UserPlus, Wallet, Calendar, FileText, AlertCircle, Star, Send, Bookmark, Megaphone, Ticket, DollarSign, Briefcase, AtSign, CornerUpLeft, ChevronRight } from 'lucide-react'
import { get, put, del, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'

const TYPE_CONFIG = {
  Follow: { icon: UserPlus, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', label: 'New follower' },
  Like: { icon: Heart, color: '#EC4899', bg: 'rgba(236,72,153,0.12)', label: 'New like' },
  Comment: { icon: MessageCircle, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', label: 'New comment' },
  Reply: { icon: CornerUpLeft, color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', label: 'New reply' },
  Mention: { icon: AtSign, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', label: 'Mention' },
  Message: { icon: MessageCircle, color: '#06B6D4', bg: 'rgba(6,182,212,0.12)', label: 'New message' },
  Booking: { icon: Briefcase, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Booking update' },
  Payment: { icon: DollarSign, color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Payment' },
  Contract: { icon: FileText, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', label: 'Contract' },
  System: { icon: Bell, color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'System' },
  Campaign: { icon: Megaphone, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Campaign' },
  Application: { icon: Send, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', label: 'Application' },
  Highlight: { icon: Bookmark, color: '#EC4899', bg: 'rgba(236,72,153,0.12)', label: 'Highlight' },
  Verification: { icon: AlertCircle, color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Verification' },
  WalletAdjusted: { icon: Wallet, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Wallet adjustment' },
  AdminMessage: { icon: Star, color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', label: 'Admin message' },
  AdminBroadcast: { icon: Bell, color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Announcement' },
}

const timeGroup = (iso) => {
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth()) return 'Yesterday'
  return 'Earlier'
}

export default function Notifications() {
  const toast = useToast()
  const navigate = useNavigate()
  const [data, setData] = useState({ data: [] })
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await get('/notifications', { pageSize: 50 })
      setData(res)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const markRead = async (id) => {
    try { await put(`/notifications/${id}/read`); load() } catch (err) { toast.error(errMsg(err)) }
  }

  const markAll = async () => {
    try { await put('/notifications/read-all'); load() } catch (err) { toast.error(errMsg(err)) }
  }

  const remove = async (id) => {
    try { await del(`/notifications/${id}`); load() } catch (err) { toast.error(errMsg(err)) }
  }

  if (loading) return <PageLoader />

  const items = data.data || []
  const unreadCount = items.filter((n) => !n.isRead).length

  const grouped = []
  let lastGroup = ''
  for (const n of items) {
    const g = timeGroup(n.createdAt)
    if (g !== lastGroup) { grouped.push({ label: g, items: [] }); lastGroup = g }
    grouped[grouped.length - 1].items.push(n)
  }

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8 }}>Inbox</span>
          <h1 className="section-title">Notifications</h1>
          {unreadCount > 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 4 }}>{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</p>}
        </div>
        {items.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={markAll}><CheckCheck size={15} /> Mark all read</button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="You're all caught up" message="No notifications yet — when something happens, you'll see it here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grouped.map((g) => (
            <div key={g.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1 }}>{g.label}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.items.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.System
                  const Icon = cfg.icon
                  return (
                    <div key={n.id} className="card" onClick={() => {
                      if (!n.isRead) markRead(n.id)
                      navigate(n.deepLink || '/notifications')
                    }} style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      opacity: n.isRead ? 0.55 : 1,
                      borderLeft: n.isRead ? '3px solid transparent' : `3px solid ${cfg.color}`,
                      transition: 'opacity 0.2s',
                      cursor: n.deepLink ? 'pointer' : 'default',
                    }}>
                      <span style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: cfg.bg, display: 'grid', placeItems: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={18} color={cfg.color} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: 14.5 }}>{n.title}</strong>
                        {n.body && <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 3, lineHeight: 1.5 }}>{n.body}</p>}
                        <small style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 4, display: 'block' }}>
                          {new Date(n.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {n.deepLink && <ChevronRight size={16} style={{ color: 'var(--text-faint)', alignSelf: 'center' }} />}
                        {!n.isRead && (
                          <button className="btn btn-ghost btn-sm" title="Mark read" onClick={(e) => { e.stopPropagation(); markRead(n.id) }} style={{ padding: 6 }}>
                            <CheckCheck size={15} color="var(--primary)" />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" title="Delete" onClick={(e) => { e.stopPropagation(); remove(n.id) }} style={{ padding: 6 }}>
                          <Trash2 size={15} color="var(--danger)" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
