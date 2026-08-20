import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Users, CalendarRange, Check, Users2, Sparkles } from 'lucide-react'
import { get, post, errMsg, assetUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'
import SaveButton from '../components/SaveButton'
import { reportEventView, reportRegisterEvent } from '../hooks/usePageTracking'

export default function EventDetail() {
  const { id } = useParams()
  const { isAuthed } = useAuth()
  const toast = useToast()
  const [evt, setEvt] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [regOpen, setRegOpen] = useState(false)
  const [ticketId, setTicketId] = useState('')
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    (async () => {
      const [e, t] = await Promise.allSettled([
        get(`/events/${id}`),
        get(`/events/${id}/tickets`),
      ])
      if (e.status === 'fulfilled') {
        const eventData = e.value.evt || e.value
        setEvt(eventData)
        if (e.value.isRegistered != null) setRegistered(e.value.isRegistered)
        reportEventView(eventData.id, eventData.name || eventData.title)
      }
      if (t.status === 'fulfilled') setTickets(t.value.data || [])
      setLoading(false)
    })()
  }, [id])

  const register = async () => {
    try {
      const body = { amountPaid: 0 }
      if (ticketId) body.ticketId = Number(ticketId)
      await post(`/events/${id}/register`, body)
      setRegistered(true)
      setRegOpen(false)
      toast.success('Registered! See you there.')
      reportRegisterEvent(id, evt?.name || evt?.title || 'Event')
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  if (loading) return <PageLoader />
  if (!evt) return <EmptyState title="Event not found" message="This event may have been removed." />

  const prediction = evt.predictedAttendance

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 900 }}>
      <Link to="/events" style={{ color: 'var(--text-dim)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 22 }}>
        <ArrowLeft size={15} /> Back to events
      </Link>

      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="event-detail-cover">
          {evt.coverImageUrl ? <img src={assetUrl(evt.coverImageUrl)} alt={evt.title} /> : <div className="event-detail-cover-fallback">{evt.title[0]}</div>}
        </div>
        <div style={{ padding: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <span className="badge badge-gold" style={{ marginBottom: 10 }}>{evt.category || 'Event'}</span>
              <h1 style={{ fontSize: 'clamp(24px,3.5vw,32px)' }}>{evt.title}</h1>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', color: 'var(--text-dim)', fontSize: 14, marginTop: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarRange size={15} /> {new Date(evt.startDate).toLocaleDateString()} {new Date(evt.startDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={15} /> {evt.isOnline ? 'Online event' : evt.location || 'TBD'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={15} /> {evt.currentAttendees}/{evt.maxAttendees} attendees</span>
              </div>
            </div>
            {prediction != null && (
              <span className="badge" style={{ alignSelf: 'flex-start' }}>
                <Sparkles size={13} /> AI predicts {prediction} attendees
              </span>
            )}
          </div>

          <div className="detail-block">
            <h3>About this event</h3>
            <p style={{ color: 'var(--text-dim)', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{evt.description || 'No description provided.'}</p>
          </div>

          {evt.isOnline && evt.onlineUrl && (
            <div className="detail-block">
              <h3>Online link</h3>
              <p style={{ color: 'var(--info)' }}>{evt.onlineUrl}</p>
            </div>
          )}

          {tickets.length > 0 && (
            <div className="detail-block">
              <h3>Available tickets</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tickets.map((t) => (
                  <div key={t.id} className="ticket-row">
                    <span style={{ fontWeight: 600 }}>{t.ticketType}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>{t.price ? `$${t.price}` : 'Free'} · {t.quantity - t.soldCount} left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {registered ? (
            <div className="apply-success">
              <Check size={22} color="#10B981" />
              <strong>You're registered for this event!</strong>
            </div>
          ) : (
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => (isAuthed ? setRegOpen(true) : toast.info('Please log in to register'))}>
              <Users2 size={17} /> Register for this event
            </button>
          )}

          <div style={{ marginTop: 10 }}>
            <SaveButton targetType="event" targetId={id} targetTitle={evt.title} block />
          </div>
        </div>
      </div>

      <Modal open={regOpen} onClose={() => setRegOpen(false)} title="Register for event">
        {tickets.length > 0 && (
          <div className="field">
            <label>Ticket type</label>
            <select value={ticketId} onChange={(e) => setTicketId(e.target.value)}>
              <option value="">General admission (free)</option>
              {tickets.map((t) => <option key={t.id} value={t.id}>{t.ticketType} {t.price ? `— $${t.price}` : '— Free'}</option>)}
            </select>
          </div>
        )}
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={register}>Confirm registration</button>
      </Modal>
    </div>
  )
}
