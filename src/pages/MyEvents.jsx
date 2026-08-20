import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Users, Search, Users2, Check, X, ExternalLink, Video, CalendarPlus, Send, FileText, CalendarRange, DollarSign, CalendarDays } from 'lucide-react'
import { get, put, post, errMsg, assetUrl } from '../api/client'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

const eventStatusConfig = {
  Confirmed: { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  Accepted: { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  Cancelled: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  Pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  Draft: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
}

const EventStatusBadge = ({ status, size = 'md' }) => {
  const config = eventStatusConfig[status] || eventStatusConfig.Pending
  const isSmall = size === 'sm'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: isSmall ? '3px 8px' : '5px 12px',
      borderRadius: 20, fontSize: isSmall ? 11 : 12.5, fontWeight: 600, color: config.color, background: config.bg,
    }}>
      {status}
    </span>
  )
}

export default function MyEvents() {
  const toast = useToast()
  const { hasRole } = useAuth()
  const isModel = hasRole('Model')
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [q, setQ] = useState('')
  const [regsFor, setRegsFor] = useState(null)
  const [regs, setRegs] = useState([])
  const [regsLoading, setRegsLoading] = useState(false)
  const [busy, setBusy] = useState(null)
  const [bookOpen, setBookOpen] = useState(false)
  const [bookTarget, setBookTarget] = useState(null)
  const [booking, setBooking] = useState({})
  const [savingBook, setSavingBook] = useState(false)
  const [contractMap, setContractMap] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isModel) {
        const res = await get('/events/my-registrations', { pageSize: 100 })
        setEvents((res.data || []).map((r) => ({
          id: r.eventId,
          title: r.eventTitle,
          location: r.eventLocation,
          isOnline: r.eventIsOnline,
          category: r.eventCategory,
          startDate: r.eventStartDate,
          status: r.status,
          amountPaid: r.amountPaid,
          registrationId: r.id,
        })))
      } else {
        const res = await get('/events/my', { pageSize: 100 })
        setEvents(res.data || [])
      }
    } catch { setEvents([]) } finally { setLoading(false) }
  }, [isModel])

  const loadContractMap = useCallback(async () => {
    try {
      const [mine, reg, bk, ct] = await Promise.allSettled([
        get('/events/my', { pageSize: 100 }),
        isModel ? get('/events/my-registrations', { pageSize: 100 }) : Promise.resolve({ data: [] }),
        get('/bookings', { pageSize: 200 }),
        get('/contracts', { pageSize: 200 }),
      ])
      const titles = {}
      if (mine.status === 'fulfilled') for (const e of (mine.value.data || [])) if (e?.title) titles[e.id] = e.title.toLowerCase()
      if (reg.status === 'fulfilled') for (const r of (reg.value.data || [])) if (r?.eventTitle && r.eventId != null) titles[r.eventId] = r.eventTitle.toLowerCase()
      const map = {}
      if (bk.status === 'fulfilled' && ct.status === 'fulfilled') {
        for (const b of (bk.value.data || [])) {
          const contract = (ct.value.data || []).find((c) => String(c.bookingId) === String(b.id))
          if (!contract || !b.projectName) continue
          const matchId = Object.keys(titles).find((id) => titles[id] === b.projectName.toLowerCase())
          if (matchId) map[matchId] = contract.id
        }
      }
      setContractMap(map)
    } catch { /* optional */ }
  }, [isModel])

  useEffect(() => {
    const run = async () => {
      await load()
      await loadContractMap()
    }
    run()
  }, [load, loadContractMap])

  const openRegs = async (ev) => {
    setRegsFor(ev)
    setRegs([])
    setRegsLoading(true)
    try {
      const res = await get(`/events/${ev.id}/registrations`, { pageSize: 200 })
      setRegs(res.data || [])
    } catch (err) {
      toast.error(errMsg(err))
      setRegsFor(null)
    } finally {
      setRegsLoading(false)
    }
  }

  const applyStatus = (r) => (r.status === 'Cancelled' ? 'Cancelled' : 'Accepted')

  const accept = async (r) => {
    if (r.status === 'Cancelled') return
    setBusy(`acc-${r.id}`)
    setRegs((list) => list.map((x) => (x.id === r.id ? { ...x, status: applyStatus(x) } : x)))
    toast.success(`${r.userName} accepted`)
    setBusy(null)
  }

  const reject = async (r) => {
    if (r.status === 'Cancelled') return
    setBusy(`rej-${r.id}`)
    try {
      await put(`/events/registrations/${r.id}/cancel`)
      setRegs((list) => list.map((x) => (x.id === r.id ? { ...x, status: 'Cancelled' } : x)))
      toast.success(`${r.userName} rejected`)
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setBusy(null)
    }
  }

  const openBooking = (r) => {
    setBookTarget(r)
    setBooking({
      projectName: regsFor?.title || 'Event project',
      startDate: (regsFor?.startDate || '').slice(0, 10),
      endDate: (regsFor?.endDate || '').slice(0, 10),
      agreedFee: '',
    })
    setBookOpen(true)
  }

  const createBooking = async (e) => {
    e.preventDefault()
    setSavingBook(true)
    try {
      const body = {
        modelUserId: bookTarget.userId,
        projectName: booking.projectName,
        startDate: booking.startDate ? new Date(booking.startDate).toISOString() : null,
        endDate: booking.endDate ? new Date(booking.endDate).toISOString() : null,
        agreedFee: booking.agreedFee ? Number(booking.agreedFee) : null,
        currency: regsFor?.currency || 'USD',
      }
      await post('/bookings', body)
      toast.success('Booking request sent — a contract is created once the model confirms')
      setBookOpen(false)
      setRegs((list) => list.map((x) => (x.id === bookTarget.id ? { ...x, status: 'Accepted' } : x)))
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSavingBook(false)
    }
  }

  const filtered = events.filter((ev) => !q.trim() || String(ev.title || '').toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div>
      <section className="container" style={{ padding: '40px 24px 70px', maxWidth: 980 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 26 }}>
          <div>
            <span className="badge" style={{ marginBottom: 8 }}>Events</span>
            <h1 className="section-title"><>My <span className="grad-text">Events</span></></h1>
            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{isModel ? 'Events you are registered for, with your ticket status.' : 'Review who applied to your events, accept or reject applicants.'}</p>
          </div>
          <Link to="/events" className="btn btn-outline">Browse all events</Link>
        </div>

        <div style={{ marginBottom: 18 }}>
          <form className="explore-search" style={{ maxWidth: 360 }} onSubmit={(e) => { e.preventDefault(); setQ(q.trim()) }}>
            <Search size={19} />
            <input placeholder="Search your events…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-primary btn-sm" type="submit">Search</button>
          </form>
        </div>

        {loading ? <PageLoader /> : filtered.length === 0 ? (
          <EmptyState title={q.trim() ? 'No matching events' : (isModel ? "You haven't registered for any events" : "You haven't created any events")} message={q.trim() ? 'Try a different search.' : (isModel ? 'Browse the Events page and register for one — it will show up here.' : 'Create an event from the Events page and applicants will show up here.')} action={!q.trim() && <Link to="/events" className="btn btn-primary">{isModel ? 'Browse events' : 'Create an event'}</Link>} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((ev) => {
              const config = eventStatusConfig[ev.status] || eventStatusConfig.Pending
              return (
                <div key={ev.id} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${config.color}` }}>
                  <div style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CalendarDays size={18} color={config.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Link to={`/event/${ev.id}`} style={{ fontWeight: 700, fontSize: 15, textDecoration: 'none', color: 'inherit' }}>{ev.title}</Link>
                            {ev.category && <span className="badge badge-gold" style={{ marginLeft: 8, fontSize: 10 }}>{ev.category}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, color: 'var(--text-faint)', fontSize: 12.5, marginTop: 6, flexWrap: 'wrap', paddingLeft: 50 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {ev.isOnline ? 'Online' : ev.location || 'TBD'}</span>
                          {ev.startDate && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarRange size={12} /> {new Date(ev.startDate).toLocaleDateString()}</span>}
                          {!isModel && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {ev.currentAttendees}/{ev.maxAttendees || '∞'}</span>}
                          {ev.amountPaid > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#FCD34D', fontWeight: 600 }}><DollarSign size={12} /> ${ev.amountPaid}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        <EventStatusBadge status={ev.status} />
                        {isModel && contractMap[ev.id] != null && (
                          <Link to="/contracts" className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', textDecoration: 'none' }}><FileText size={13} /> Contract</Link>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingLeft: 50, flexWrap: 'wrap' }}>
                      {!isModel && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => openRegs(ev)}>
                            <Users2 size={14} /> Applicants {ev.currentAttendees > 0 ? `(${ev.currentAttendees})` : ''}
                          </button>
                          {contractMap[ev.id] != null && (
                            <Link to="/contracts" className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', textDecoration: 'none' }}><FileText size={13} /> Contract</Link>
                          )}
                        </>
                      )}
                      <Link to={`/meeting/bm-event-${ev.id}`} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', textDecoration: 'none' }}><Video size={13} /> Meeting</Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <Modal open={!!regsFor} onClose={() => setRegsFor(null)} title={regsFor ? `Applicants — ${regsFor.title}` : ''} width={620}>
        {regsLoading ? <PageLoader /> : regs.length === 0 ? (
          <EmptyState title="No applicants yet" message="Attendees will appear here once they register for this event." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {regs.map((r) => {
              const cancelled = r.status === 'Cancelled'
              return (
                <div key={r.id} className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {r.avatarUrl ? <img src={assetUrl(r.avatarUrl)} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div className="avatar-fallback" style={{ width: 38, height: 38, flexShrink: 0 }}>{r.userName?.[0] || '?'}</div>}
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/u/${r.userId}`} style={{ color: 'inherit', textDecoration: 'none' }}><strong style={{ fontSize: 14 }}>{r.userName}</strong></Link>
                      <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{r.userEmail}</small>
                    </div>
                  </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <EventStatusBadge status={r.status} size="sm" />
                      {r.amountPaid > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', color: '#FCD34D', fontSize: 11, fontWeight: 600 }}><DollarSign size={11} /> ${r.amountPaid}</span>}
                    <Link to={`/u/${r.userId}`} className="btn btn-ghost btn-sm" title="View profile"><ExternalLink size={13} /> Profile</Link>
                    {!cancelled && (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => accept(r)} disabled={busy === `acc-${r.id}`}><Check size={13} /> Accept</button>
                        <button className="btn btn-danger btn-sm" onClick={() => reject(r)} disabled={busy === `rej-${r.id}`}><X size={13} /> {busy === `rej-${r.id}` ? 'Rejecting…' : 'Reject'}</button>
                        {r.status !== 'Cancelled' && r.status !== 'Pending' && (
                          <button className="btn btn-outline btn-sm" onClick={() => openBooking(r)}><CalendarPlus size={13} /> Book & contract</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      <Modal open={bookOpen} onClose={() => setBookOpen(false)} title="Book from event" width={520}>
        <form onSubmit={createBooking}>
          <div className="field">
            <label>Project name</label>
            <input required value={booking.projectName || ''} onChange={(e) => setBooking({ ...booking, projectName: e.target.value })} placeholder="e.g. Runway show booking" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field">
              <label>Start date</label>
              <input type="date" required value={(booking.startDate || '').slice(0, 10)} onChange={(e) => setBooking({ ...booking, startDate: e.target.value })} />
            </div>
            <div className="field">
              <label>End date</label>
              <input type="date" required value={(booking.endDate || '').slice(0, 10)} onChange={(e) => setBooking({ ...booking, endDate: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Agreed fee ({regsFor?.currency || 'USD'})</label>
            <input type="number" value={booking.agreedFee ?? ''} onChange={(e) => setBooking({ ...booking, agreedFee: e.target.value })} />
          </div>
          {bookTarget?.userName && (
            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
              Booking: <strong>{bookTarget.userName}</strong> — the attendee will be asked to confirm, then a contract is created automatically.
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setBookOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={savingBook}>{savingBook ? 'Sending…' : <><Send size={14} /> Send booking request</>}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
