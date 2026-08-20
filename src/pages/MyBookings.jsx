import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Check, X, FileText, Clock, MapPin, Video, DollarSign, Calendar, Star, MessageSquare } from 'lucide-react'
import { get, post, put, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { reportConfirmBooking, reportCancelBooking, reportRateBooking } from '../hooks/usePageTracking'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'

const statusConfig = {
  Pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', icon: Clock },
  Confirmed: { color: '#10B981', bg: 'rgba(16,185,129,0.15)', icon: Check },
  InProgress: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', icon: Briefcase },
  Completed: { color: '#10B981', bg: 'rgba(16,185,129,0.15)', icon: Star },
  Cancelled: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', icon: X },
}

export default function MyBookings() {
  const toast = useToast()
  const [data, setData] = useState({ data: [] })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [booking, setBooking] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [rateForm, setRateForm] = useState({ rating: 5, review: '' })

  const load = async () => {
    setLoading(true)
    try {
      const params = { pageSize: 50, sortBy: 'createdAt', sortOrder: 'desc' }
      if (filter) params.status = filter
      const res = await get('/bookings', params)
      setData(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  const openDetail = async (id) => {
    try {
      const res = await get(`/bookings/${id}`)
      setBooking(res)
      setDetailOpen(true)
    } catch (err) { toast.error(errMsg(err)) }
  }

  const changeStatus = async (status, reason) => {
    try {
      await put(`/bookings/${booking.booking.id}/status`, { status, reason })
      if (status === 'Confirmed') reportConfirmBooking(booking.booking.id, booking.booking.projectName)
      else if (status === 'Cancelled') reportCancelBooking(booking.booking.id, booking.booking.projectName)
      toast.success(`Booking ${status}`)
      setDetailOpen(false)
      load()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const submitRate = async (e) => {
    e.preventDefault()
    try {
      await post(`/bookings/${booking.booking.id}/rate`, { rating: Number(rateForm.rating), review: rateForm.review })
      reportRateBooking(booking.booking.id, booking.booking.projectName, Number(rateForm.rating))
      toast.success('Rated!')
      setDetailOpen(false)
      load()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const StatusBadge = ({ status, size = 'md' }) => {
    const config = statusConfig[status] || { color: '#6B7280', bg: 'rgba(107,114,128,0.15)', icon: Briefcase }
    const Icon = config.icon
    const isSmall = size === 'sm'
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: isSmall ? '3px 8px' : '5px 12px',
        borderRadius: 20, fontSize: isSmall ? 11 : 12.5, fontWeight: 600, color: config.color, background: config.bg,
      }}>
        <Icon size={isSmall ? 11 : 13} /> {status}
      </span>
    )
  }

  if (loading) return <PageLoader />

  const b = booking?.booking
  const contract = booking?.contract

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 900 }}>
      <span className="badge" style={{ marginBottom: 10 }}>Bookings</span>
      <h1 className="section-title" style={{ marginBottom: 22 }}>My <span className="grad-text">bookings</span></h1>

      <div className="profile-tabs" style={{ marginBottom: 22 }}>
        {['', 'Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled'].map((s) => (
          <button key={s} className={`profile-tab${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
            {s === '' ? 'All' : s}
          </button>
        ))}
      </div>

      {data.data.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          message="When you book or get booked, it'll show up here. Bookings protect both parties with payment held in escrow until work is confirmed complete."
          action={<Link to="/explore" className="btn btn-primary">Browse talent</Link>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.data.map((bk) => {
            const config = statusConfig[bk.status] || statusConfig.Pending
            return (
              <div key={bk.id} className="card" style={{
                padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
                borderLeft: `4px solid ${config.color}`,
              }} onClick={() => openDetail(bk.id)}>
                <div style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Briefcase size={18} color={config.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{bk.projectName || `Booking #${bk.id}`}</h3>
                          {bk.description && <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bk.description}</p>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 16, color: 'var(--text-faint)', fontSize: 12.5, marginTop: 8, flexWrap: 'wrap', paddingLeft: 50 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {bk.location || (bk.isVirtual ? 'Virtual' : 'Location TBD')}</span>
                        {bk.startDate && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {new Date(bk.startDate).toLocaleDateString()}</span>}
                        {bk.agreedFee != null && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={12} /> {bk.currency || 'USD'} {bk.agreedFee}</span>}
                        {bk.status === 'Completed' && bk.rating && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} fill="#F59E0B" color="#F59E0B" /> {bk.rating}/5</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <StatusBadge status={bk.status} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={b?.projectName || 'Booking details'} width={580}>
        {b && (
          <div>
            <div className="detail-block">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <StatusBadge status={b.status} />
                {b.agreedFee != null && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', fontSize: 13, fontWeight: 600 }}>
                    <DollarSign size={14} /> {b.currency || 'USD'} {b.agreedFee}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7 }}>{b.description || 'No description provided.'}</p>
              <div className="mp-specs" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginTop: 16 }}>
                {b.location && <div className="mp-spec"><span>Location</span><strong>{b.location}</strong></div>}
                {b.startDate && <div className="mp-spec"><span>Start date</span><strong>{new Date(b.startDate).toLocaleDateString()}</strong></div>}
                {b.endDate && <div className="mp-spec"><span>End date</span><strong>{new Date(b.endDate).toLocaleDateString()}</strong></div>}
                {b.isVirtual && <div className="mp-spec"><span>Type</span><strong>Virtual meeting</strong></div>}
              </div>
            </div>

            {contract && (
              <div className="detail-block">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={16} /> Contract</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Status: <strong>{contract.status}</strong></p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {contract.status !== 'Signed' && b.status === 'Confirmed' && (
                    <button className="btn btn-primary btn-sm" onClick={() => post(`/contracts/${contract.id}/sign`).then(() => { toast.success('Contract signed'); setDetailOpen(false); load() }).catch((err) => toast.error(errMsg(err)))}>
                      <Check size={15} /> Sign contract
                    </button>
                  )}
                  <Link to={`/meeting/bm-contract-${contract.id}`} className="btn btn-outline btn-sm"><Video size={15} /> Online meeting</Link>
                </div>
              </div>
            )}

            {b.status === 'Pending' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={() => changeStatus('Confirmed')}><Check size={16} /> Confirm</button>
                <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.4)' }} onClick={() => changeStatus('Cancelled', 'Cancelled by user')}><X size={16} /> Cancel</button>
              </div>
            )}
            {b.status === 'Confirmed' && (
              <button className="btn btn-primary" onClick={() => changeStatus('InProgress')}>Start work</button>
            )}
            {b.status === 'InProgress' && (
              <button className="btn btn-primary" onClick={() => changeStatus('Completed')}><Check size={16} /> Mark completed</button>
            )}
            {b.status === 'Completed' && !b.rating && (
              <form onSubmit={submitRate}>
                <h3 style={{ marginBottom: 10 }}>Rate this booking</h3>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} onClick={() => setRateForm((f) => ({ ...f, rating: n }))}
                      style={{ background: 'none', border: 'none', fontSize: 24, color: n <= rateForm.rating ? 'var(--gold)' : 'rgba(255,255,255,0.15)' }}>★</button>
                  ))}
                </div>
                <div className="field"><textarea placeholder="Review (optional)…" value={rateForm.review} onChange={(e) => setRateForm({ ...rateForm, review: e.target.value })} /></div>
                <button className="btn btn-primary btn-sm" type="submit">Submit rating</button>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
