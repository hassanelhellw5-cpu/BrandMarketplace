import { useState, useEffect, useCallback } from 'react'
import { Plus, MessageCircle, Send, LifeBuoy, Clock, Search, AlertCircle, CheckCircle2, XCircle, MessageSquare } from 'lucide-react'
import { get, post, put, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'
import { reportCreateTicket } from '../hooks/usePageTracking'

const statusBadge = (s) => {
  const map = { Open: 'badge-green', Pending: 'badge-gold', Resolved: 'badge', Closed: 'badge-gray' }
  return `badge ${map[s] || 'badge-gray'}`
}

const priorityStyle = (p) => {
  const map = {
    Urgent: { bg: 'rgba(244,63,94,0.1)', color: '#F43F5E', border: 'rgba(244,63,94,0.3)' },
    High: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: 'rgba(245,158,11,0.3)' },
    Normal: { bg: 'rgba(139,92,246,0.1)', color: '#8B5CF6', border: 'rgba(139,92,246,0.3)' },
    Low: { bg: 'rgba(107,107,128,0.1)', color: '#6B6B80', border: 'rgba(107,107,128,0.3)' },
  }
  return map[p] || map.Normal
}

export default function Support() {
  const toast = useToast()
  const [tickets, setTickets] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [detail, setDetail] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    const params = { pageSize: 50 }
    if (filter) params.status = filter
    try { const res = await get('/support/tickets', params); setTickets(res.data || []) }
    catch { /* ignore */ }
  }, [filter])

  useEffect(() => {
    const run = async () => { setLoading(true); await load(); setLoading(false) }
    run()
  }, [load])

  const create = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { await post('/support/tickets', form); toast.success('Ticket created'); setCreateOpen(false); setForm({}); await load(); reportCreateTicket(null, form.subject || form.title) }
    catch (err) { toast.error(errMsg(err)) } finally { setSaving(false) }
  }

  const openDetail = async (t) => {
    setDetail(t)
    setMsg('')
    setDetailOpen(true)
    try {
      const res = await get(`/support/tickets/${t.id}`)
      const tick = res.ticket || res
      setDetail(tick)
      setMessages(res.messages || tick.messages || [])
    } catch (err) { toast.error(errMsg(err)); setMessages([]) }
  }

  const send = async (e) => {
    e.preventDefault()
    if (!msg.trim() || !detail) return
    setSending(true)
    try {
      const res = await post(`/support/tickets/${detail.id}/messages`, { content: msg.trim() })
      setMessages((list) => [...list, res.message || res])
      setMsg('')
    } catch (err) { toast.error(errMsg(err)) } finally { setSending(false) }
  }

  const close = async () => {
    if (!detail) return
    try { await put(`/support/tickets/${detail.id}/status`, { status: 'Closed' }); toast.success('Ticket closed'); setDetailOpen(false); await load() }
    catch (err) { toast.error(errMsg(err)) }
  }

  const openCount = tickets.filter((t) => t.status === 'Open').length
  const pendingCount = tickets.filter((t) => t.status === 'Pending').length

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8 }}>Support</span>
          <h1 className="section-title">Help <span className="grad-text">center</span></h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, maxWidth: 440 }}>Need a hand? Our team replies within 24 hours. Track your tickets and chat with support.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({}); setCreateOpen(true) }}><Plus size={16} /> New ticket</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: 14 }}>
          <small style={{ color: 'var(--text-dim)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><LifeBuoy size={12} /> Total tickets</small>
          <strong style={{ fontSize: 22, display: 'block', marginTop: 4 }}>{tickets.length}</strong>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <small style={{ color: '#10B981', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> Open</small>
          <strong style={{ fontSize: 22, color: '#10B981', display: 'block', marginTop: 4 }}>{openCount}</strong>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <small style={{ color: '#F59E0B', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Pending</small>
          <strong style={{ fontSize: 22, color: '#F59E0B', display: 'block', marginTop: 4 }}>{pendingCount}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="profile-tabs" style={{ marginBottom: 22 }}>
        {['', 'Open', 'Pending', 'Resolved', 'Closed'].map((s) => (
          <button key={s} className={`profile-tab${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>{s === '' ? 'All' : s}</button>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
            <LifeBuoy size={24} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>No tickets yet</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>Create a support ticket and we'll get back to you.</p>
          <button className="btn btn-primary" onClick={() => { setForm({}); setCreateOpen(true) }}><Plus size={15} /> New ticket</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tickets.map((t) => {
            const pri = priorityStyle(t.priority || 'Normal')
            return (
              <div key={t.id} className="card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center', transition: 'border-color 0.2s', cursor: 'pointer' }}
                onClick={() => openDetail(t)}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <MessageSquare size={18} color="var(--primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <strong style={{ fontSize: 15 }}>{t.subject}</strong>
                    <span className={statusBadge(t.status)}>{t.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, color: 'var(--text-faint)', fontSize: 12.5, flexWrap: 'wrap' }}>
                    <span>{t.category || 'General'}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 6, background: pri.bg, color: pri.color, fontSize: 11, fontWeight: 600 }}>{t.priority || 'Normal'}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); openDetail(t) }}>Open</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Create ticket modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a support ticket" width={560}>
        <form onSubmit={create}>
          <div className="field"><label>Subject</label><input required value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief summary of the issue" /></div>
          <div className="field"><label>Category</label>
            <select value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select…</option>
              {['Account & billing', 'Payments & withdrawals', 'Bookings & contracts', 'Profile & verification', 'Technical issue', 'Report a user', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field"><label>Priority</label>
            <select value={form.priority || 'Normal'} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['Low', 'Normal', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field"><label>Description</label><textarea rows={4} required value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell us what happened…" /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Submitting…' : 'Submit ticket'}</button>
          </div>
        </form>
      </Modal>

      {/* Ticket detail modal */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail?.subject || 'Ticket'} width={640}>
        {detail && (
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <span className={statusBadge(detail.status)}>{detail.status}</span>
              <span className="badge badge-gray">{detail.category || 'General'}</span>
              {detail.priority && <span className="badge" style={{ background: priorityStyle(detail.priority).bg, color: priorityStyle(detail.priority).color, borderColor: priorityStyle(detail.priority).border }}>{detail.priority}</span>}
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>{detail.description}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto', marginBottom: 16, padding: 8, borderRadius: 12, background: 'var(--bg-soft)' }}>
              {messages.length === 0 ? (
                <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: 24 }}>No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} style={{
                    alignSelf: m.isFromSupport ? 'flex-start' : 'flex-end', maxWidth: '80%',
                    background: m.isFromSupport ? 'var(--surface-2)' : 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.2))',
                    border: '1px solid var(--border)', borderRadius: 14, padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{m.content}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>
                      {m.isFromSupport ? 'Support' : 'You'} · {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {detail.status !== 'Closed' && (
              <form onSubmit={send}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div className="field" style={{ flex: 1, margin: 0 }}>
                    <textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a reply…" style={{ resize: 'none' }} />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={sending || !msg.trim()} style={{ alignSelf: 'flex-end', padding: '10px 16px' }}><Send size={15} /></button>
                </div>
              </form>
            )}
            {detail.status !== 'Closed' && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-dim)', marginTop: 12 }} onClick={close}><XCircle size={14} /> Close ticket</button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
