import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileSignature, FileText, FileDown, ExternalLink, ShieldCheck, Clock, Video, UserRound, Building2, BadgeCheck, Megaphone, Calendar } from 'lucide-react'
import { get, post, errMsg, assetUrl } from '../api/client'
import { reportGenerateContract, reportSignContract } from '../hooks/usePageTracking'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'

const money = (n) => (n == null ? '' : `$${Number(n).toLocaleString()}`)
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString() : '—')
const fmtDateT = (s) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—')

const STATUS_TONE = {
  Draft: 'badge-gray', Drafting: 'badge-gray',
  Pending: 'badge-blue', PendingSignature: 'badge-blue',
  Active: 'badge-green', Signed: 'badge-green', Completed: 'badge-green',
  Cancelled: 'badge-red', Rejected: 'badge-red', Expired: 'badge-red',
}

const signOf = (c) => {
  if (!c) return '—'
  const raw = c.signatureStatus || c.signStatus || (c.signedBy ? 'Signed' : null)
  return raw || (c.status || 'Draft')
}

const roomFor = (id) => `bm-contract-${id}`

export default function Contracts() {
  const toast = useToast()
  const [data, setData] = useState({ data: [] })
  const [bookingMeta, setBookingMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [busy, setBusy] = useState(null)
  const [view, setView] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [sigList, setSigList] = useState([])
  const [booking, setBooking] = useState(null)
  const [parties, setParties] = useState({ model: null, brand: null })

  const load = async () => {
    setLoading(true)
    try {
      const r = await get('/contracts', { pageSize: 50 })
      setData(r)
      try {
        const b = await get('/bookings', { pageSize: 200 })
        const map = {}
        for (const bk of (b.data || [])) {
          map[bk.id] = bk.castingId ? 'Casting' : 'Booking'
        }
        setBookingMeta(map)
      } catch { /* types stay default */ }
    } catch { setData({ data: [] }) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openDetail = async (c) => {
    setView(c)
    setViewLoading(true)
    setSigList([])
    setBooking(null)
    setParties({ model: null, brand: null })
    try {
      const r = await get(`/contracts/${c.id}`)
      const ct = r?.contract || r?.data || r || c
      setView(ct)
      setSigList(r?.signatures || [])
      if (ct.bookingId) {
        try {
          const bk = await get(`/bookings/${ct.bookingId}`)
          const b = bk?.booking || bk
          setBooking(b)
          const [model, brand] = await Promise.allSettled([
            b.modelUserId ? get(`/users/${b.modelUserId}`) : Promise.resolve(null),
            b.brandUserId ? get(`/users/${b.brandUserId}`) : Promise.resolve(null),
          ])
          setParties({
            model: model.status === 'fulfilled' ? model.value : null,
            brand: brand.status === 'fulfilled' ? brand.value : null,
          })
        } catch { /* booking optional */ }
      }
    } catch { /* keep list row */ } finally { setViewLoading(false) }
  }

  const generate = async (c) => {
    setBusy(`gen-${c.id}`)
    try {
      const res = await post(`/contracts/${c.id}/generate`)
      reportGenerateContract(c.id, c.title || c.name)
      const url = res?.url || res?.fileUrl || res?.downloadUrl || res?.documentUrl || res?.contract?.pdfUrl
      if (url) { const a = document.createElement('a'); a.href = assetUrl(url); a.target = '_blank'; a.rel = 'noreferrer'; a.click() }
      else toast.success('Contract document generated')
    } catch (err) { toast.error(errMsg(err)) } finally { setBusy(null) }
  }

  const sign = async (c) => {
    if (!window.confirm(`Sign contract ${c.title || c.contractNumber || `#${c.id}`}? This is a legally binding confirmation.`)) return
    setBusy(`sign-${c.id}`)
    try {
      await post(`/contracts/${c.id}/sign`)
      reportSignContract(c.id, c.title || c.name)
      toast.success('Contract signed')
      if (view?.id === c.id) openDetail(c)
      load()
    } catch (err) { toast.error(errMsg(err)) } finally { setBusy(null) }
  }

  const sorted = [...(data.data || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  const isSigned = (c) => ['Signed', 'Active', 'Completed'].includes(signOf(c))

  const typeOf = (c) => {
    if (c.contractType === 'Campaign' || c.campaignId) return 'Campaign'
    if (c.contractType === 'Event' || c.eventId) return 'Event'
    return bookingMeta[c.bookingId] || c.contractType || c.type || 'Booking'
  }
  const filtered = sorted.filter((c) => !typeFilter || typeOf(c) === typeFilter)
  const counts = {
    '': sorted.length,
    Booking: sorted.filter((c) => typeOf(c) === 'Booking').length,
    Casting: sorted.filter((c) => typeOf(c) === 'Casting').length,
    Campaign: sorted.filter((c) => typeOf(c) === 'Campaign').length,
    Event: sorted.filter((c) => typeOf(c) === 'Event').length,
  }

  const sigLabel = (s) => {
    const uid = String(s.userId)
    if (booking && String(booking.modelUserId) === uid) return 'Model signature'
    if (booking && String(booking.brandUserId) === uid) return 'Brand signature'
    if (booking && booking.agencyUserId && String(booking.agencyUserId) === uid) return 'Agency signature'
    return 'Party signature'
  }

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <FileSignature size={24} color="var(--gold)" />
        <div>
          <h1 className="section-title" style={{ marginBottom: 2 }}>Contracts</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Review, generate and sign agreements for your bookings, campaigns, and collaborations.</p>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden', marginTop: 20 }}>
        <div className="profile-tabs" style={{ padding: '14px 14px 0', borderBottom: '1px solid var(--border)', gap: 6, flexWrap: 'wrap' }}>
          {[['', `All (${counts['']})`], ['Booking', `Bookings (${counts.Booking})`], ['Casting', `Castings (${counts.Casting})`], ['Campaign', `Campaigns (${counts.Campaign})`], ['Event', `Events (${counts.Event})`]].map(([k, label]) => (
            <button key={k} className={`profile-tab${typeFilter === k ? ' active' : ''}`} onClick={() => setTypeFilter(k)}>
              {label}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="No contracts yet" message="When a brand books you and you confirm, or you book a model and they confirm, a contract is created automatically with all the project details. It appears here for both sides to review and sign." />
        ) : (
          <table className="admin-table">
            <thead><tr><th>Contract</th><th>Type</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((c) => {
                const s = signOf(c)
                return (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.title || c.contractNumber || `Contract #${c.id}`}</strong>
                      {c.counterpartyName && <small style={{ display: 'block', color: 'var(--text-dim)' }}>{c.counterpartyName}</small>}
                    </td>
                    <td><span className="badge badge-gray">{typeOf(c)}</span></td>
                    <td><span className={`badge ${STATUS_TONE[s] || 'badge-gray'}`}>{s}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }} onClick={() => openDetail(c)}><FileText size={13} /> View</button>
                        {!isSigned(c) && <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,0.15)', color: '#FCD34D' }} onClick={() => sign(c)} disabled={busy === `sign-${c.id}`}><FileSignature size={13} /> Sign</button>}
                        <Link to={`/meeting/${roomFor(c.id)}`} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', textDecoration: 'none' }}><Video size={13} /> Meeting</Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.title || view?.contractNumber || 'Contract'} width={720}>
        {view ? (viewLoading ? <PageLoader /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className={`badge ${STATUS_TONE[signOf(view)] || 'badge-gray'}`}>{signOf(view)}</span>
              {(view.contractType || view.type) && <span className="badge badge-gray">{view.contractType || view.type}</span>}
              {(view.amount ?? booking?.agreedFee) != null && <span className="badge badge-gold">{money(view.amount ?? booking?.agreedFee)}</span>}
              {booking?.currency && <span className="badge badge-gray">{booking.currency}</span>}
            </div>

            {(parties.model || parties.brand) && (
              <div className="grid-auto grid-2" style={{ gap: 10 }}>
                {parties.brand && (
                  <Link to={`/u/${booking?.brandUserId}`} className="card" style={{ padding: 12, textDecoration: 'none', color: 'inherit' }}>
                    <small style={{ color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 5 }}><Building2 size={12} /> Brand</small>
                    <strong style={{ display: 'block', fontSize: 14, marginTop: 3 }}>{parties.brand.displayName || parties.brand.userName}</strong>
                    {parties.brand.email && <small style={{ color: 'var(--text-dim)' }}>{parties.brand.email}</small>}
                  </Link>
                )}
                {parties.model && (
                  <Link to={`/u/${booking?.modelUserId}`} className="card" style={{ padding: 12, textDecoration: 'none', color: 'inherit' }}>
                    <small style={{ color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 5 }}><UserRound size={12} /> Model</small>
                    <strong style={{ display: 'block', fontSize: 14, marginTop: 3 }}>{parties.model.displayName || parties.model.userName}</strong>
                    {parties.model.email && <small style={{ color: 'var(--text-dim)' }}>{parties.model.email}</small>}
                  </Link>
                )}
              </div>
            )}

            {booking && (
              <div>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Project details</h3>
                <div className="grid-auto grid-2" style={{ gap: 10 }}>
                  {[
                    ['Project', booking.projectName],
                    ['Location', booking.location || (booking.isVirtual ? 'Virtual' : null)],
                    ['Start', fmtDate(booking.startDate)],
                    ['End', fmtDate(booking.endDate)],
                    ['Fee', booking.agreedFee != null ? `${booking.currency || 'USD'} ${money(booking.agreedFee)}` : null],
                  ].filter(([, v]) => v != null && v !== '' && v !== '—').map(([k, v]) => (
                    <div key={k} className="card" style={{ padding: 12 }}>
                      <small style={{ color: 'var(--text-faint)' }}>{k}</small>
                      <strong style={{ display: 'block', fontSize: 13.5, marginTop: 2 }}>{v}</strong>
                    </div>
                  ))}
                </div>
                {booking.description && <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>{booking.description}</p>}
              </div>
            )}

            <div>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Contract</h3>
              <div className="grid-auto grid-2" style={{ gap: 10 }}>
                {[
                  ['Contract ID', view.contractNumber || `#${view.id}`],
                  ['Effective from', fmtDate(view.effectiveDate)],
                  ['Expires', fmtDate(view.expiryDate)],
                  ['Signed by model', fmtDateT(view.signedByModelAt)],
                  ['Signed by brand', fmtDateT(view.signedByBrandAt)],
                  ['Created', fmtDate(view.createdAt)],
                ].filter(([, v]) => v != null && v !== '' && v !== '—').map(([k, v]) => (
                  <div key={k} className="card" style={{ padding: 12 }}>
                    <small style={{ color: 'var(--text-faint)' }}>{k}</small>
                    <strong style={{ display: 'block', fontSize: 13.5, marginTop: 2 }}>{v}</strong>
                  </div>
                ))}
              </div>
              {view.content && <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>{view.content}</p>}
            </div>

            {sigList.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, marginBottom: 8 }}>Signatures</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sigList.map((s) => (
                    <div key={s.id} className="card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <BadgeCheck size={17} color="#10B981" />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13.5 }}>{sigLabel(s)}</strong>
                        <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{fmtDateT(s.createdAt)}</small>
                      </div>
                      {s.isValid === false && <span className="badge badge-red">Invalid</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {view.pdfUrl || view.documentUrl || view.generatedUrl ? (
                <a className="btn btn-primary" href={assetUrl(view.pdfUrl || view.documentUrl || view.generatedUrl)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open document</a>
              ) : (
                <button className="btn btn-outline" onClick={() => generate(view)} disabled={busy === `gen-${view.id}`}><FileDown size={15} /> {busy === `gen-${view.id}` ? 'Generating…' : 'Generate document'}</button>
              )}
              <Link to={`/meeting/${roomFor(view.id)}`} className="btn btn-primary" style={{ textDecoration: 'none' }}><Video size={15} /> Online meeting</Link>
            </div>

            {!isSigned(view) && (
              <button className="btn btn-danger" onClick={() => sign(view)} disabled={busy === `sign-${view.id}`}><ShieldCheck size={15} /> {busy === `sign-${view.id}` ? 'Signing…' : 'Sign contract'}</button>
            )}
            <small style={{ color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={12} /> Both parties sign, then the agreement is complete and you can start work. Use the meeting button above if you'd like a quick video call first.</small>
          </div>
        )) : null}
      </Modal>
    </div>
  )
}
