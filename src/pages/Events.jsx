import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Users, Ticket, Search, Plus, Pencil, Trash2, Users2, Upload } from 'lucide-react'
import { get, post, put, del, upload, errMsg, assetUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { Pagination, EmptyState } from '../components/ui'
import Modal from '../components/Modal'
import './Events.css'

const EMPTY_FORM = {
  title: '', description: '', category: 'Workshop', location: '', venue: '',
  startDate: '', endDate: '', isOnline: false, onlineUrl: '', hasTickets: false,
  ticketPrice: '', maxAttendees: '', status: 'Published', coverImageUrl: '',
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Events() {
  const { isAuthed, hasRole } = useAuth()
  const toast = useToast()
  const canHost = hasRole('Brand', 'Agency')
  const [q, setQ] = useState('')
  const [data, setData] = useState({ data: [], total: 0 })
  const [mine, setMine] = useState([])
  const [myRegs, setMyRegs] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('upcoming')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [regsFor, setRegsFor] = useState(null)
  const [regs, setRegs] = useState([])
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (q.trim()) params.category = q.trim()
      const res = await get('/events', params)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [q, page, pageSize])

  const loadMine = useCallback(async () => {
    try {
      const res = await get('/events/my', { pageSize: 50 })
      setMine(res.data || [])
    } catch { setMine([]) }
  }, [])

  const loadMyRegs = useCallback(async () => {
    try {
      const res = await get('/events/my-registrations', { pageSize: 50 })
      setMyRegs(res.data || [])
    } catch { setMyRegs([]) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (tab === 'mine' && isAuthed) loadMine()
    if (tab === 'registrations' && isAuthed) loadMyRegs()
  }, [tab, isAuthed, loadMine, loadMyRegs])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (ev) => {
    setEditing(ev)
    setForm({
      title: ev.title || '', description: ev.description || '', category: ev.category || 'Workshop',
      location: ev.location || '', venue: ev.venue || '',
      startDate: toLocalInput(ev.startDate), endDate: toLocalInput(ev.endDate),
      isOnline: ev.isOnline || false, onlineUrl: ev.onlineUrl || '',
      hasTickets: ev.hasTickets || false, ticketPrice: ev.ticketPrice ?? '',
      maxAttendees: ev.maxAttendees || '', status: ev.status === 'Draft' ? 'Draft' : 'Published',
      coverImageUrl: ev.coverImageUrl || '',
    })
    setFormOpen(true)
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setBool = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }))

  const onCoverUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await upload('/uploads?folder=events', fd)
      const url = res?.url || res?.fileUrl || res?.path
      if (url) setForm((f) => ({ ...f, coverImageUrl: url }))
      else toast.error('Could not get uploaded file URL')
    } catch (err) {
      toast.error(errMsg(err, 'Upload failed'))
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!form.title.trim()) return toast.error('Title is required')
    if (!form.startDate || !form.endDate) return toast.error('Start and end dates are required')

    const body = {
      title: form.title.trim(),
      description: form.description,
      category: form.category,
      location: form.location,
      venue: form.venue,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      isOnline: form.isOnline,
      onlineUrl: form.onlineUrl,
      hasTickets: form.hasTickets,
      ticketPrice: form.hasTickets ? Number(form.ticketPrice || 0) : 0,
      maxAttendees: Number(form.maxAttendees || 0),
      status: form.status === 'Draft' ? 'Draft' : 'Published',
      coverImageUrl: form.coverImageUrl,
    }

    setSaving(true)
    try {
      if (editing) {
        await put(`/events/${editing.id}`, body)
        toast.success('Event updated')
      } else {
        await post('/events', body)
        toast.success('Event created')
      }
      setFormOpen(false)
      setTab('mine')
      loadMine()
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (ev) => {
    if (!window.confirm(`Delete "${ev.title}"? This cannot be undone.`)) return
    try {
      await del(`/events/${ev.id}`)
      toast.success('Event deleted')
      loadMine()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const openRegs = async (ev) => {
    setRegsFor(ev)
    setRegs([])
    try {
      const res = await get(`/events/${ev.id}/registrations`, { pageSize: 200 })
      setRegs(res.data || [])
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const EventCard = ({ ev }) => (
    <Link to={`/event/${ev.id}`} className="event-card">
      <div className="event-cover">
        {ev.coverImageUrl ? <img src={assetUrl(ev.coverImageUrl)} alt={ev.title} /> : <span className="event-cover-fallback">{ev.title[0]}</span>}
        <span className="event-date">{new Date(ev.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        {ev.status === 'Draft' && <span className="event-draft-badge">Draft</span>}
      </div>
      <div className="event-body">
        <span className="event-category">{ev.category || 'Event'}</span>
        <h3>{ev.title}</h3>
        <p>{ev.description?.slice(0, 90) || ''}</p>
        <div className="event-meta">
          <span><MapPin size={13} /> {ev.isOnline ? 'Online' : ev.location || 'TBD'}</span>
          <span><Users size={13} /> {ev.currentAttendees || 0}/{ev.maxAttendees || 0}</span>
          {ev.hasTickets && <span><Ticket size={13} /> {ev.ticketPrice ? `$${ev.ticketPrice}` : 'Free'}</span>}
        </div>
      </div>
    </Link>
  )

  const ManageBar = ({ ev }) => (
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => openRegs(ev)}><Users2 size={14} /> Registrations</button>
      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(ev)}><Pencil size={14} /> Edit</button>
      <button className="btn btn-danger btn-sm" onClick={() => remove(ev)}><Trash2 size={14} /> Delete</button>
    </div>
  )

  return (
    <div>
      <section className="explore-hero">
        <div className="container">
          <h1 className="fade-up">Events & <span className="grad-text">workshops</span></h1>
          <p className="fade-up" style={{ animationDelay: '0.1s' }}>Fashion shows, portfolio reviews, training workshops and industry meetups.</p>
          <div className="fade-up" style={{ animationDelay: '0.15s', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <form className="explore-search" style={{ flex: 1, minWidth: 260 }} onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
              <Search size={19} />
              <input placeholder="Search by category (workshop, fashion show, meetup…)…" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn btn-primary btn-sm" type="submit">Search</button>
            </form>
            {canHost && (
              <button className="btn btn-gold" onClick={openCreate}><Plus size={16} /> Create event</button>
            )}
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: '40px 24px' }}>
        <div className="profile-tabs" style={{ marginBottom: 22 }}>
          <button className={`profile-tab${tab === 'upcoming' ? ' active' : ''}`} onClick={() => setTab('upcoming')}>Upcoming events</button>
          <button className={`profile-tab${tab === 'mine' ? ' active' : ''}`} onClick={() => (isAuthed ? setTab('mine') : undefined)}>My events</button>
          <button className={`profile-tab${tab === 'registrations' ? ' active' : ''}`} onClick={() => (isAuthed ? setTab('registrations') : undefined)}>My registrations</button>
        </div>

        {tab === 'upcoming' ? (
          <>
            <div className="grid-auto grid-3">
              {loading ? [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 280 }} />)
                : data.data.map((ev) => <EventCard key={ev.id} ev={ev} />)}
            </div>
            {!loading && data.data.length === 0 && <EmptyState title="No events yet" message="Public events appear here when a brand or agency publishes them. Calendar entries are personal schedules and won't show here." />}
            <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} />
          </>
        ) : tab === 'mine' ? (
          <>
            {!isAuthed ? <EmptyState title="Log in to see your events" message="Your hosted events will show up here." /> : mine.length === 0 ? (
              <EmptyState title="You haven't created any events" message={canHost ? 'Click "Create event" to host a workshop or show.' : 'Events you host will appear here.'} />
            ) : (
              <div className="grid-auto grid-3">
                {mine.map((ev) => (
                  <div key={ev.id}>
                    <EventCard ev={ev} />
                    {canHost && <ManageBar ev={ev} />}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {!isAuthed ? <EmptyState title="Log in to see your registrations" message="Events you register for will show up here." /> : myRegs.length === 0 ? (
              <EmptyState title="No registrations yet" message="Register for an event and it will appear here." />
            ) : (
              <div className="grid-auto grid-3">
                {myRegs.map((r) => (
                  <EventCard key={r.id} ev={{
                    id: r.eventId,
                    title: r.eventTitle || 'Event',
                    startDate: r.eventStartDate,
                    endDate: r.eventEndDate,
                    location: r.eventLocation,
                    isOnline: r.eventIsOnline,
                    category: r.eventCategory,
                    currentAttendees: 0,
                    maxAttendees: 0,
                  }} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit event' : 'Create event'}>
        <div className="field">
          <label>Title *</label>
          <input value={form.title} onChange={set('title')} placeholder="e.g. Spring Editorial Casting Workshop" />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={form.description} onChange={set('description')} rows={4} placeholder="What should attendees expect?" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={set('category')}>
              {['Workshop', 'Fashion Show', 'Meetup', 'Portfolio Review', 'Training', 'Networking', 'Casting', 'Other'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Max attendees</label>
            <input type="number" min="0" value={form.maxAttendees} onChange={set('maxAttendees')} placeholder="0 = unlimited" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Start date & time *</label>
            <input type="datetime-local" value={form.startDate} onChange={set('startDate')} />
          </div>
          <div className="field">
            <label>End date & time *</label>
            <input type="datetime-local" value={form.endDate} onChange={set('endDate')} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Location</label>
            <input value={form.location} onChange={set('location')} placeholder="City / area" />
          </div>
          <div className="field">
            <label>Venue</label>
            <input value={form.venue} onChange={set('venue')} placeholder="Venue name" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 14 }}>
          <label className="chk"><input type="checkbox" checked={form.isOnline} onChange={setBool('isOnline')} /> Online event</label>
          <label className="chk"><input type="checkbox" checked={form.hasTickets} onChange={setBool('hasTickets')} /> Paid tickets</label>
        </div>
        {form.isOnline && (
          <div className="field">
            <label>Online URL</label>
            <input value={form.onlineUrl} onChange={set('onlineUrl')} placeholder="https://…" />
          </div>
        )}
        {form.hasTickets && (
          <div className="field">
            <label>Ticket price (USD)</label>
            <input type="number" min="0" value={form.ticketPrice} onChange={set('ticketPrice')} />
          </div>
        )}
        <div className="field">
          <label>Cover image</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={form.coverImageUrl} onChange={set('coverImageUrl')} placeholder="Image URL" />
            <label className="btn btn-ghost btn-sm" style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
              {uploading ? 'Uploading…' : <><Upload size={14} /> Upload</>}
              <input type="file" accept="image/*" hidden onChange={onCoverUpload} />
            </label>
          </div>
          {form.coverImageUrl && <img src={assetUrl(form.coverImageUrl)} alt="cover" style={{ width: 120, height: 70, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
        </div>
        <div className="field">
          <label>Status</label>
          <select value={form.status} onChange={set('status')}>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : (editing ? 'Save changes' : 'Create event')}
        </button>
      </Modal>

      <Modal open={!!regsFor} onClose={() => setRegsFor(null)} title={regsFor ? `Registrations — ${regsFor.title}` : ''}>
        {regs.length === 0 ? (
          <EmptyState title="No registrations yet" message="Attendees will appear here once they register." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {regs.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {r.avatarUrl ? <img src={assetUrl(r.avatarUrl)} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} /> : <div className="avatar-fallback">{r.userName?.[0]}</div>}
                  <div>
                    <strong style={{ fontSize: 14 }}>{r.userName}</strong>
                    <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{r.userEmail}</small>
                  </div>
                </div>
                <span className="badge">{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
