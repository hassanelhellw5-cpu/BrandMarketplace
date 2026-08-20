import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, MapPin, Clock, Link as LinkIcon } from 'lucide-react'
import { get, post, del, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'
import './Calendar.css'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#0EA5E9', '#EF4444']

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const toLocalISO = (d) => {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return t.toISOString()
}

export default function Calendar() {
  const toast = useToast()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ title: '', date: '', start: '09:00', end: '10:00', allDay: false, color: COLORS[0], location: '', description: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const from = toLocalISO(new Date(year, month, 1, 0, 0, 0))
    const to = toLocalISO(new Date(year, month + 1, 0, 23, 59, 59))
    try {
      const res = await get('/calendar', { from, to })
      setEvents(Array.isArray(res) ? res : res.data || [])
    } catch { setEvents([]) }
    setLoading(false)
  }, [year, month])

  useEffect(() => { load() }, [load])

  const prev = () => { setMonth((m) => (m === 0 ? 11 : m - 1)); if (month === 0) setYear((y) => y - 1) }
  const next = () => { setMonth((m) => (m === 11 ? 0 : m + 1)); if (month === 11) setYear((y) => y + 1) }
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  const openCreate = (day) => {
    setForm({ title: '', date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, start: '09:00', end: '10:00', allDay: false, color: COLORS[0], location: '', description: '' })
    setCreateOpen(true)
  }

  const create = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const startTime = form.allDay ? `${form.date}T00:00:00` : `${form.date}T${form.start}:00`
      const endTime = form.allDay ? `${form.date}T23:59:00` : `${form.date}T${form.end}:00`
      await post('/calendar', {
        title: form.title.trim(),
        description: form.description,
        startTime,
        endTime,
        isAllDay: form.allDay,
        color: form.color,
        location: form.location,
      })
      toast.success('Event added')
      setCreateOpen(false)
      load()
    } catch (err) { toast.error(errMsg(err)) } finally { setSaving(false) }
  }

  const remove = async (evt) => {
    try {
      await del(`/calendar/${evt.id}`)
      toast.success('Event deleted')
      setSelected(null)
      load()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const first = new Date(year, month, 1)
  const startOffset = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const eventsOn = (day) => events.filter((e) => {
    const d = new Date(e.startTime)
    return dayKey(d) === dayKey(new Date(year, month, day))
  })

  return (
    <div className="container" style={{ padding: '40px 24px 70px' }}>
      <div className="cal-head">
        <div>
          <span className="badge" style={{ marginBottom: 8 }}>Calendar</span>
          <h1 className="section-title">{MONTHS[month]} <span className="grad-text">{year}</span></h1>
        </div>
        <div className="cal-nav">
          <button className="btn btn-ghost btn-sm" onClick={goToday}>Today</button>
          <button className="btn btn-ghost btn-sm" onClick={prev}><ChevronLeft size={16} /></button>
          <button className="btn btn-ghost btn-sm" onClick={next}><ChevronRight size={16} /></button>
          <button className="btn btn-primary btn-sm" onClick={() => openCreate(today.getDate())}><Plus size={16} /> Add event</button>
        </div>
      </div>

      {loading ? <PageLoader text="Loading calendar…" /> : (
        <div className="card cal-grid-wrap">
          <div className="cal-grid">
            {WEEKDAYS.map((w) => <div key={w} className="cal-weekday">{w}</div>)}
            {cells.map((day, i) => (
              <div key={i} className={`cal-day${day === null ? ' empty' : ''}${day === today.getDate() && month === today.getMonth() && year === today.getFullYear() ? ' today' : ''}`}>
                {day !== null && (
                  <>
                    <div className="cal-day-top">
                      <span className="cal-day-num">{day}</span>
                      <button className="cal-day-add" onClick={() => openCreate(day)} title="Add event"><Plus size={13} /></button>
                    </div>
                    <div className="cal-day-events">
                      {eventsOn(day).map((e) => (
                        <button key={e.id} className="cal-event" style={{ background: e.color || COLORS[0] }} onClick={() => setSelected(e)}>
                          {e.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && !loading && (
        <EmptyState
          title="Nothing scheduled"
          message="Add your bookings, auditions and shoots to stay on top of your week."
          action={<button className="btn btn-primary" onClick={() => openCreate(today.getDate())}><Plus size={16} /> Add your first event</button>}
        />
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add event">
        <div className="field"><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Studio shoot" /></div>
        <div className="field"><label>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <label className="cal-all-day"><input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} /> All day</label>
        {!form.allDay && (
          <div className="form-row">
            <div className="field"><label>Start</label><input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
            <div className="field"><label>End</label><input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
          </div>
        )}
        <div className="field"><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Studio / city" /></div>
        <div className="field">
          <label>Color</label>
          <div className="cal-colors">{COLORS.map((c) => <button key={c} className={form.color === c ? 'on' : ''} style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />)}</div>
        </div>
        <div className="field"><label>Description</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={create} disabled={saving}>{saving ? 'Saving…' : 'Save event'}</button>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || 'Event'}>
        {selected && (
          <div className="cal-detail">
            <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}>
              <Clock size={15} />
              {selected.isAllDay ? 'All day' : `${new Date(selected.startTime).toLocaleString()} — ${new Date(selected.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
            {selected.location && <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)' }}><MapPin size={15} /> {selected.location}</p>}
            {selected.description && <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>{selected.description}</p>}
            {selected.referenceType && <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-faint)', marginTop: 8 }}><LinkIcon size={14} /> {selected.referenceType} #{selected.referenceId}</p>}
            <button className="btn btn-danger btn-sm" style={{ marginTop: 16 }} onClick={() => remove(selected)}><Trash2 size={15} /> Delete event</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
