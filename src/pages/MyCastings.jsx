import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, MapPin, Clock, DollarSign, Users, Check, X, Pencil, Trash2, Send, Save, Star, CalendarPlus, Ruler, Award, Zap, FileText, Video, Search, SlidersHorizontal, Eye } from 'lucide-react'
import { get, post, put, del, errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'
import { reportCreateCasting, reportEditCasting, reportDeleteCasting, reportAcceptApplication, reportRejectApplication, reportBookFromCasting } from '../hooks/usePageTracking'

const statusBadge = (s) => {
  const map = { Draft: 'badge-gray', Open: 'badge-green', Closed: 'badge-gray', Cancelled: 'badge-red', Filled: 'badge', Pending: 'badge-gold', Accepted: 'badge-green', Shortlisted: 'badge', Rejected: 'badge-red', Withdrawn: 'badge-gray' }
  return `badge ${map[s] || 'badge-gray'}`
}

const parseCats = (c) => {
  if (!c) return ''
  try { const arr = JSON.parse(c); return Array.isArray(arr) ? arr[0] : '' } catch { return c }
}

export default function MyCastings() {
  const { hasRole } = useAuth()
  const sub = useSubscription()
  const toast = useToast()
  const isModel = hasRole('Model')
  const business = hasRole('Brand', 'Agency')
  const [loading, setLoading] = useState(true)
  const castingRem = sub.remaining('unlimited-castings')
  const castingBlocked = business && castingRem.limit !== null && castingRem.remaining <= 0
  const castingAllowed = business && sub.can('unlimited-castings')

  const [filter, setFilter] = useState('')
  const [apps, setApps] = useState([])
  const [castings, setCastings] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [selected, setSelected] = useState(null)
  const [selApps, setSelApps] = useState([])
  const [appsOpen, setAppsOpen] = useState(false)
  const [feedback, setFeedback] = useState({})
  const [bookOpen, setBookOpen] = useState(false)
  const [bookTarget, setBookTarget] = useState(null)
  const [booking, setBooking] = useState({})
  const [savingBook, setSavingBook] = useState(false)
  const [boosts, setBoosts] = useState({ data: [], weeklyLimit: 0, usedThisWeek: 0, remaining: 0 })
  const [search, setSearch] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState(null)

  const loadApps = useCallback(async () => {
    const params = { pageSize: 50, sortBy: 'createdAt', sortOrder: 'desc' }
    if (filter) params.status = filter
    try {
      const res = await get('/castings/my-applications', params)
      setApps(res.data || [])
    } catch { /* ignore */ }
  }, [filter])

  const loadMine = useCallback(async () => {
    try {
      const res = await get('/castings/my', { pageSize: 50 })
      setCastings(res.data || [])
    } catch { /* ignore */ }
  }, [])

  const [contractMap, setContractMap] = useState({})

  const loadContractMap = useCallback(async () => {
    try {
      const [bk, ct] = await Promise.allSettled([
        get('/bookings', { pageSize: 200 }),
        get('/contracts', { pageSize: 200 }),
      ])
      const map = {}
      if (bk.status === 'fulfilled' && ct.status === 'fulfilled') {
        for (const b of (bk.value.data || [])) {
          if (b.castingId == null) continue
          const contract = (ct.value.data || []).find((c) => String(c.bookingId) === String(b.id))
          if (contract) map[b.castingId] = contract.id
        }
      }
      setContractMap(map)
    } catch { /* optional */ }
  }, [])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      if (isModel) await loadApps()
      if (business) await loadMine()
      await loadContractMap()
      if (business) {
        try {
          const res = await get('/boosts/my')
          setBoosts(res || { data: [], weeklyLimit: 0, usedThisWeek: 0, remaining: 0 })
        } catch { /* ignore */ }
      }
      setLoading(false)
    }
    run()
  }, [isModel, business, loadApps, loadMine, loadContractMap])

  const boostCasting = async (c) => {
    try {
      await post('/boosts', { targetType: 'Casting', targetId: c.id })
      toast.success('Casting boosted — it now appears at the top of the feed')
      const res = await get('/boosts/my')
      setBoosts(res || boosts)
    } catch (err) { toast.error(errMsg(err)) }
  }

  const createCasting = async (e, status) => {
    e.preventDefault()
    const rem = sub.remaining('unlimited-castings')
    if (rem.limit !== null && rem.remaining <= 0) {
      toast.error('Casting limit reached — upgrade your plan to post more')
      setCreateOpen(false)
      return
    }
    setSaving(true)
    try {
      await post('/castings', { ...form, status })
      reportCreateCasting(null, form.title || form.name)
      sub.consume('unlimited-castings')
      toast.success(status === 'Draft' ? 'Casting saved as draft' : 'Casting published')
      setCreateOpen(false)
      setForm({})
      await loadMine()
    } catch (err) { toast.error(errMsg(err)) } finally { setSaving(false) }
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({
      title: c.title, description: c.description || '', requirements: c.requirements || '',
      categories: parseCats(c.categories), location: c.location || '', budget: c.budget ?? '',
      currency: c.currency || 'USD', applicationDeadline: (c.applicationDeadline || '').slice(0, 10),
      maxApplications: c.maxApplications || '', isPaid: !!c.isPaid, travelRequired: !!c.travelRequired, status: c.status || 'Open',
    })
    setEditOpen(true)
  }

  const updateCasting = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await put(`/castings/${editing.id}`, { ...form, categories: form.categories || '', status: form.status || editing.status })
      reportEditCasting(editing.id, form.title || editing.title)
      toast.success('Casting updated')
      setEditOpen(false)
      setEditing(null)
      setForm({})
      await loadMine()
    } catch (err) { toast.error(errMsg(err)) } finally { setSaving(false) }
  }

  const changeStatus = async (c, status, msg) => {
    try { await put(`/castings/${c.id}`, { status }); toast.success(msg); await loadMine() }
    catch (err) { toast.error(errMsg(err)) }
  }

  const removeCasting = async (c) => {
    if (!window.confirm(`Delete "${c.title}" permanently?`)) return
    try { await del(`/castings/${c.id}`); reportDeleteCasting(c.id, c.title); toast.success('Casting deleted'); await loadMine() }
    catch (err) { toast.error(errMsg(err)) }
  }

  const openApps = async (c) => {
    setSelected(c)
    setFeedback({})
    setAppsOpen(true)
    try { const res = await get(`/castings/${c.id}/applications`, { pageSize: 100 }); setSelApps(res.data || []) }
    catch (err) { toast.error(errMsg(err)); setSelApps([]) }
  }

  const decide = async (app, status) => {
    try {
      await put(`/castings/applications/${app.id}`, { status, feedback: feedback[app.id] || '' })
      if (status === 'Accepted') reportAcceptApplication(app.id, app.castingTitle || 'Casting application')
      else if (status === 'Rejected') reportRejectApplication(app.id, app.castingTitle || 'Casting application')
      toast.success(`Application ${status.toLowerCase()}`)
      setSelApps((list) => list.map((a) => (a.id === app.id ? { ...a, status } : a)))
    } catch (err) { toast.error(errMsg(err)) }
  }

  const openBooking = (app) => {
    setBookTarget(app)
    setBooking({ projectName: selected?.title || '', startDate: (selected?.startDate || '').slice(0, 10), endDate: (selected?.endDate || '').slice(0, 10), agreedFee: selected?.budget ?? '' })
    setBookOpen(true)
  }

  const createBooking = async (e) => {
    e.preventDefault()
    setSavingBook(true)
    try {
      await post(`/bookings/from-casting/${selected.id}/${bookTarget.id}`, {
        projectName: booking.projectName,
        startDate: booking.startDate ? new Date(booking.startDate).toISOString() : null,
        endDate: booking.endDate ? new Date(booking.endDate).toISOString() : null,
        agreedFee: booking.agreedFee ? Number(booking.agreedFee) : null,
      })
      reportBookFromCasting(selected?.title || 'Casting', bookTarget?.displayName || 'Model')
      toast.success('Booking request sent to the model')
      setBookOpen(false)
      setSelApps((list) => list.map((a) => (a.id === bookTarget.id ? { ...a, status: 'Accepted' } : a)))
    } catch (err) { toast.error(errMsg(err)) } finally { setSavingBook(false) }
  }

  const filteredApps = apps.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (a.casting?.title || '').toLowerCase().includes(q) || (a.casting?.location || '').toLowerCase().includes(q)
  })

  const filteredCastings = castings.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.title || '').toLowerCase().includes(q) || (c.location || '').toLowerCase().includes(q)
  })

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8 }}>{isModel ? 'Applications' : 'Castings'}</span>
          <h1 className="section-title">{isModel ? <>My <span className="grad-text">applications</span></> : <>My <span className="grad-text">castings</span></>}</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, maxWidth: 480 }}>
            {isModel ? 'Track every casting call you applied to and manage your opportunities.' : 'Post, edit and publish casting calls — drafts stay hidden from models until published.'}
          </p>
        </div>
        {business && !castingBlocked && (
          <button className="btn btn-primary" onClick={() => { setForm({}); setCreateOpen(true) }}>
            <Plus size={16} /> Post casting{castingRem.limit !== null ? ` (${castingRem.remaining} left)` : ''}
          </button>
        )}
        {business && castingBlocked && (
          <Link to="/plans" className="btn btn-primary"><Plus size={16} /> Limit reached — upgrade</Link>
        )}
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            style={{ paddingLeft: 38, width: '100%', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: '11px 14px 11px 38px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            placeholder={isModel ? 'Search castings...' : 'Search your castings...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isModel && (
          <div className="profile-tabs" style={{ marginBottom: 0 }}>
            {['', 'Pending', 'Shortlisted', 'Accepted', 'Rejected'].map((s) => (
              <button key={s} className={`profile-tab${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
                {s === '' ? 'All' : s}
              </button>
            ))}
          </div>
        )}
      </div>

      {isModel && (
        <>
          {filteredApps.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
                <Users size={24} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>No applications yet</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>Browse castings and apply to get started.</p>
              <Link to="/castings" className="btn btn-primary"><Search size={15} /> Browse castings</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredApps.map((a) => (
                <div key={a.id} className="card" style={{ padding: 18, display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'border-color 0.2s', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Users size={20} color="var(--primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                      <Link to={`/castings/${a.castingId}`} style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--text)' }} onClick={(e) => e.stopPropagation()}>
                        {a.casting?.title || `Casting #${a.castingId}`}
                      </Link>
                      {a.casting?.status && <span className="badge badge-gray" style={{ fontSize: 11 }}>{a.casting.status}</span>}
                      <span className={statusBadge(a.status)}>{a.status}</span>
                    </div>
                    {a.coverLetter && <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.6, margin: '4px 0 8px' }}>{a.coverLetter}</p>}
                    <div style={{ display: 'flex', gap: 16, color: 'var(--text-faint)', fontSize: 12.5, flexWrap: 'wrap' }}>
                      {a.casting?.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {a.casting.location}</span>}
                      {a.casting?.budget != null && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={12} /> {a.casting.currency || '$'}{a.casting.budget}</span>}
                      {a.casting?.applicationDeadline && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Deadline {new Date(a.casting.applicationDeadline).toLocaleDateString()}</span>}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarPlus size={12} /> Applied {new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                    {a.feedback && <p style={{ color: 'var(--gold)', fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} /> Feedback: {a.feedback}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {contractMap[a.castingId] != null && (
                      <Link to="/contracts" className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', textDecoration: 'none' }}><FileText size={13} /> Contract</Link>
                    )}
                    <Link to={`/meeting/bm-casting-${a.castingId}`} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', textDecoration: 'none' }}><Video size={13} /> Meeting</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {business && (
        <>
          {filteredCastings.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(236,72,153,0.1))', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
                <Users size={24} color="var(--gold)" />
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>No castings yet</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>Post your first casting call to attract models.</p>
              {castingAllowed && !castingBlocked ? (
                <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={15} /> Post a casting</button>
              ) : (
                <Link to="/plans" className="btn btn-primary">Upgrade to post castings</Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredCastings.map((c) => {
                const boosted = (boosts.data || []).some((b) => b.targetType === 'Casting' && b.targetId === c.id)
                return (
                  <div key={c.id} className="card" style={{ padding: 18, display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'border-color 0.2s', borderLeft: boosted ? '3px solid var(--gold)' : undefined }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = boosted ? 'var(--gold)' : 'var(--border)'}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(236,72,153,0.15))', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Users size={20} color="var(--gold)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                        <strong style={{ fontSize: 15.5 }}>{c.title}</strong>
                        {boosted && <span className="badge badge-gold" style={{ fontSize: 11 }}><Zap size={10} /> Spotlighted</span>}
                        <span className={statusBadge(c.status)}>{c.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, color: 'var(--text-faint)', fontSize: 12.5, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {c.location || 'Remote'}</span>
                        {c.budget != null && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={12} /> ${c.budget}</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {c.currentApplications || 0}/{c.maxApplications || '∞'} applied</span>
                        {c.publishedAt && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Published {new Date(c.publishedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {c.status === 'Draft' && <button className="btn btn-primary btn-sm" onClick={() => changeStatus(c, 'Open', 'Casting published')}><Send size={13} /> Publish</button>}
                      {c.status === 'Open' && <button className="btn btn-outline btn-sm" onClick={() => changeStatus(c, 'Closed', 'Casting closed')}><X size={13} /> Close</button>}
                      {c.status === 'Open' && !boosted && boosts.weeklyLimit > 0 && boosts.remaining > 0 && (
                        <button className="btn btn-outline btn-sm" onClick={() => boostCasting(c)}><Zap size={13} /> Spotlight ({boosts.remaining})</button>
                      )}
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}><Pencil size={13} /> Edit</button>
                      <button className="btn btn-outline btn-sm" onClick={() => removeCasting(c)} style={{ color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.4)' }}><Trash2 size={13} /></button>
                      <button className="btn btn-outline btn-sm" onClick={() => openApps(c)}><Eye size={13} /> Apps</button>
                      {contractMap[c.id] != null && <Link to="/contracts" className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', textDecoration: 'none' }}><FileText size={13} /></Link>}
                      <Link to={`/meeting/bm-casting-${c.id}`} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', textDecoration: 'none' }}><Video size={13} /></Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Create casting modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Post a casting call" width={620}>
        <form onSubmit={(e) => createCasting(e, 'Open')}>
          <div className="field"><label>Title</label><input required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer fashion editorial" /></div>
          <div className="field"><label>Description</label><textarea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="field"><label>Requirements</label><textarea rows={3} value={form.requirements || ''} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="Height range, experience, portfolio link…" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field"><label>Category</label>
              <select value={form.categories || ''} onChange={(e) => setForm({ ...form, categories: e.target.value })}>
                <option value="">Select…</option>
                {['Fashion', 'Commercial', 'Editorial', 'Runway', 'Fit Model', 'Swimwear', 'Cosmetics', 'Lifestyle', 'Sports'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Location</label><input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City or Remote" /></div>
            <div className="field"><label>Budget ($)</label><input type="number" value={form.budget || ''} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
            <div className="field"><label>Currency</label>
              <select value={form.currency || 'USD'} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {['USD', 'EUR', 'GBP', 'EGP', 'AED', 'SAR', 'TRY'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Application deadline</label><input type="date" value={(form.applicationDeadline || '').slice(0, 10)} onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })} /></div>
            <div className="field"><label>Max applications</label><input type="number" value={form.maxApplications || ''} onChange={(e) => setForm({ ...form, maxApplications: e.target.value })} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--text-dim)' }}>
            <input type="checkbox" checked={!!form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} /> Paid opportunity
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, color: 'var(--text-dim)' }}>
            <input type="checkbox" checked={!!form.travelRequired} onChange={(e) => setForm({ ...form, travelRequired: e.target.checked })} /> Travel required
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-outline" disabled={saving} onClick={(e) => createCasting(e, 'Draft')}><Save size={15} /> Draft</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Publishing…' : 'Publish now'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit casting modal */}
      <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditing(null) }} title={`Edit — ${editing?.title || ''}`} width={620}>
        <form onSubmit={updateCasting}>
          <div className="field"><label>Title</label><input required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="field"><label>Description</label><textarea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="field"><label>Requirements</label><textarea rows={3} value={form.requirements || ''} onChange={(e) => setForm({ ...form, requirements: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field"><label>Category</label>
              <select value={form.categories || ''} onChange={(e) => setForm({ ...form, categories: e.target.value })}>
                <option value="">Select…</option>
                {['Fashion', 'Commercial', 'Editorial', 'Runway', 'Fit Model', 'Swimwear', 'Cosmetics', 'Lifestyle', 'Sports'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Location</label><input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="field"><label>Budget ($)</label><input type="number" value={form.budget || ''} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
            <div className="field"><label>Currency</label>
              <select value={form.currency || 'USD'} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {['USD', 'EUR', 'GBP', 'EGP', 'AED', 'SAR', 'TRY'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Deadline</label><input type="date" value={(form.applicationDeadline || '').slice(0, 10)} onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })} /></div>
            <div className="field"><label>Max applications</label><input type="number" value={form.maxApplications || ''} onChange={(e) => setForm({ ...form, maxApplications: e.target.value })} /></div>
            <div className="field"><label>Status</label>
              <select value={form.status || 'Open'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['Draft', 'Open', 'Closed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--text-dim)' }}>
            <input type="checkbox" checked={!!form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} /> Paid opportunity
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, color: 'var(--text-dim)' }}>
            <input type="checkbox" checked={!!form.travelRequired} onChange={(e) => setForm({ ...form, travelRequired: e.target.checked })} /> Travel required
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => { setEditOpen(false); setEditing(null) }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Applications modal */}
      <Modal open={appsOpen} onClose={() => setAppsOpen(false)} title={selected?.title || 'Applications'} width={680}>
        {selApps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>No applications yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {selApps.map((a) => {
              const m = a.model || {}
              const name = m.displayName || [m.firstName, m.lastName].filter(Boolean).join(' ') || `Model #${a.modelUserId}`
              return (
                <div key={a.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {m.profilePictureUrl && (
                      <img src={m.profilePictureUrl} alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <Link to={`/u/${a.modelUserId}`} style={{ fontWeight: 700, fontSize: 14.5 }}>{name}</Link>
                          <span className={statusBadge(a.status)}>{a.status}</span>
                        </div>
                        <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>Applied {new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 14, color: 'var(--text-dim)', fontSize: 12.5, marginTop: 8, flexWrap: 'wrap' }}>
                        {m.height != null && <span><Ruler size={12} /> {m.height} cm</span>}
                        {m.bodyType && <span>{m.bodyType}</span>}
                        {m.dressSize && <span>Dress {m.dressSize}</span>}
                        {m.shoeSize && <span>Shoe {m.shoeSize}</span>}
                        {m.city && <span><MapPin size={12} /> {[m.city, m.country].filter(Boolean).join(', ')}</span>}
                        {m.availableForTravel && <span className="badge badge-gold" style={{ fontSize: 11 }}>Travel ready</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 14, color: 'var(--text-faint)', fontSize: 12, marginTop: 6, flexWrap: 'wrap' }}>
                        {m.experienceLevel && <span><Award size={12} /> {m.experienceLevel}{m.yearsOfExperience ? ` · ${m.yearsOfExperience} yrs` : ''}</span>}
                        {m.totalBookings > 0 && <span><Check size={12} /> {m.totalBookings} bookings</span>}
                        {m.averageRating > 0 && <span>★ {m.averageRating.toFixed(1)}</span>}
                      </div>
                      {m.specialties && (() => { try { const s = JSON.parse(m.specialties); return Array.isArray(s) && s.length ? <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{s.slice(0, 6).map((x) => <span key={x} className="badge">{x}</span>)}</div> : null } catch { return null } })()}
                      {a.coverLetter && <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>{a.coverLetter}</p>}
                      <div className="field" style={{ marginTop: 10 }}><input value={feedback[a.id] || ''} onChange={(e) => setFeedback((f) => ({ ...f, [a.id]: e.target.value }))} placeholder="Feedback (optional)…" /></div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {a.status !== 'Shortlisted' && a.status !== 'Accepted' && (
                          <button className="btn btn-outline btn-sm" onClick={() => decide(a, 'Shortlisted')}><Star size={14} /> Shortlist</button>
                        )}
                        {a.status !== 'Accepted' && (
                          <button className="btn btn-primary btn-sm" onClick={() => decide(a, 'Accepted')}><Check size={14} /> Accept</button>
                        )}
                        {a.status !== 'Rejected' && (
                          <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.4)' }} onClick={() => decide(a, 'Rejected')}><X size={14} /> Reject</button>
                        )}
                        {a.status === 'Shortlisted' && a.status !== 'Accepted' && (
                          <button className="btn btn-primary btn-sm" onClick={() => openBooking(a)}><CalendarPlus size={14} /> Book</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {/* Book from casting modal */}
      <Modal open={bookOpen} onClose={() => setBookOpen(false)} title="Book from casting" width={520}>
        <form onSubmit={createBooking}>
          <div className="field">
            <label>Project name</label>
            <input required value={booking.projectName || ''} onChange={(e) => setBooking({ ...booking, projectName: e.target.value })} placeholder="e.g. Summer campaign shoot" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field"><label>Start date</label><input type="date" required value={(booking.startDate || '').slice(0, 10)} onChange={(e) => setBooking({ ...booking, startDate: e.target.value })} /></div>
            <div className="field"><label>End date</label><input type="date" required value={(booking.endDate || '').slice(0, 10)} onChange={(e) => setBooking({ ...booking, endDate: e.target.value })} /></div>
          </div>
          <div className="field">
            <label>Agreed fee ({selected?.currency || 'USD'})</label>
            <input type="number" required value={booking.agreedFee ?? ''} onChange={(e) => setBooking({ ...booking, agreedFee: e.target.value })} />
          </div>
          {bookTarget?.model && (
            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
              Booking: <strong>{bookTarget.model.displayName || [bookTarget.model.firstName, bookTarget.model.lastName].filter(Boolean).join(' ')}</strong> — the model will be asked to confirm.
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setBookOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={savingBook}>{savingBook ? 'Sending…' : <><Send size={14} /> Send request</>}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
