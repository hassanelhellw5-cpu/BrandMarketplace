import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CalendarRange, DollarSign, Users, Check, X, Megaphone, Pencil, Trash2, Send, Save, Star, Ruler, MapPin, Award, CalendarPlus, FileText, Video, Eye, BarChart3 } from 'lucide-react'
import { get, post, put, del, errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'
import { reportCreateCampaign, reportEditCampaign, reportDeleteCampaign, reportAcceptApplication, reportRejectApplication, reportBookFromCampaign } from '../hooks/usePageTracking'

const campaignStatusConfig = {
  Draft: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  Active: { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  Open: { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  Completed: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  Cancelled: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  Pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  Accepted: { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  Shortlisted: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  Rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
}

const CampaignStatusBadge = ({ status, size = 'md' }) => {
  const config = campaignStatusConfig[status] || campaignStatusConfig.Draft
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

const parseList = (v) => {
  if (!v) return ''
  try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr[0] : '' } catch { return v }
}

export default function MyCampaigns() {
  const { hasRole } = useAuth()
  const sub = useSubscription()
  const toast = useToast()
  const isModel = hasRole('Model')
  const business = hasRole('Brand', 'Agency')
  const [loading, setLoading] = useState(true)
  const campRem = sub.remaining('unlimited-campaigns')
  const campBlocked = business && campRem.limit !== null && campRem.remaining <= 0
  const campAllowed = business && sub.can('unlimited-campaigns')

  const [filter, setFilter] = useState('')
  const [apps, setApps] = useState([])
  const [campaigns, setCampaigns] = useState([])
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

  const loadApps = useCallback(async () => {
    const params = { pageSize: 50, sortBy: 'createdAt', sortOrder: 'desc' }
    if (filter) params.status = filter
    try {
      const res = await get('/campaigns/my-applications', params)
      setApps(res.data || [])
    } catch { /* ignore */ }
  }, [filter])

  const loadMine = useCallback(async () => {
    try {
      const res = await get('/campaigns/my', { pageSize: 50 })
      setCampaigns(res.data || [])
    } catch { /* ignore */ }
  }, [])

  const [contractMap, setContractMap] = useState({})

  const loadContractMap = useCallback(async () => {
    try {
      const [mine, apps, bk, ct] = await Promise.allSettled([
        get('/campaigns/my', { pageSize: 50 }),
        isModel ? get('/campaigns/my-applications', { pageSize: 100 }) : Promise.resolve({ data: [] }),
        get('/bookings', { pageSize: 200 }),
        get('/contracts', { pageSize: 200 }),
      ])
      const names = {}
      if (mine.status === 'fulfilled') for (const c of (mine.value.data || [])) if (c?.name) names[c.id] = c.name.toLowerCase()
      if (apps.status === 'fulfilled') for (const a of (apps.value.data || [])) if (a?.campaign?.name && a.campaignId != null) names[a.campaignId] = a.campaign.name.toLowerCase()
      const map = {}
      if (bk.status === 'fulfilled' && ct.status === 'fulfilled') {
        for (const b of (bk.value.data || [])) {
          const contract = (ct.value.data || []).find((c) => String(c.bookingId) === String(b.id))
          if (!contract || !b.projectName) continue
          const matchId = Object.keys(names).find((id) => names[id] === b.projectName.toLowerCase())
          if (matchId) map[matchId] = contract.id
        }
      }
      setContractMap(map)
    } catch { /* optional */ }
  }, [isModel])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      if (isModel) await loadApps()
      if (business) await loadMine()
      await loadContractMap()
      setLoading(false)
    }
    run()
  }, [isModel, business, loadApps, loadMine, loadContractMap])

  const createCampaign = async (e, status) => {
    e.preventDefault()
    const rem = sub.remaining('unlimited-campaigns')
    if (rem.limit !== null && rem.remaining <= 0) {
      toast.error('Campaign limit reached — upgrade your plan to create more')
      setCreateOpen(false)
      return
    }
    if (!sub.can('unlimited-campaigns')) {
      toast.error('Campaigns are not included in your plan — upgrade to create campaigns')
      setCreateOpen(false)
      return
    }
    setSaving(true)
    try {
      await post('/campaigns', { ...form, status })
      reportCreateCampaign(null, form.title || form.name)
      sub.consume('unlimited-campaigns')
      toast.success(status === 'Draft' ? 'Campaign saved as draft' : 'Campaign published')
      setCreateOpen(false)
      setForm({})
      await loadMine()
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({
      name: c.name,
      description: c.description || '',
      objective: c.objective || '',
      creativeBrief: c.creativeBrief || '',
      budget: c.budget ?? '',
      currency: c.currency || 'USD',
      startDate: (c.startDate || '').slice(0, 10),
      endDate: (c.endDate || '').slice(0, 10),
      requiredModelTypes: parseList(c.requiredModelTypes),
      requiredModelsCount: c.requiredModelsCount || '',
      status: c.status || 'Active',
    })
    setEditOpen(true)
  }

  const updateCampaign = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await put(`/campaigns/${editing.id}`, { ...form, requiredModelTypes: form.requiredModelTypes || '', status: form.status || editing.status })
      reportEditCampaign(editing.id, form.title || editing.title)
      toast.success('Campaign updated')
      setEditOpen(false)
      setEditing(null)
      setForm({})
      await loadMine()
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (c, status, msg) => {
    try {
      await put(`/campaigns/${c.id}`, { status })
      toast.success(msg)
      await loadMine()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const removeCampaign = async (c) => {
    if (!window.confirm(`Delete "${c.name}" permanently?`)) return
    try {
      await del(`/campaigns/${c.id}`)
      reportDeleteCampaign(c.id, c.name || c.title)
      toast.success('Campaign deleted')
      await loadMine()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const openApps = async (c) => {
    setSelected(c)
    setFeedback({})
    setAppsOpen(true)
    try {
      const res = await get(`/campaigns/${c.id}/applications`, { pageSize: 100 })
      setSelApps(res.data || [])
    } catch (err) {
      toast.error(errMsg(err))
      setSelApps([])
    }
  }

  const decide = async (app, status) => {
    try {
      await put(`/campaigns/applications/${app.id}`, { status, feedback: feedback[app.id] || '' })
      if (status === 'Accepted') reportAcceptApplication(app.id, app.campaignTitle || 'Campaign application')
      else if (status === 'Rejected') reportRejectApplication(app.id, app.campaignTitle || 'Campaign application')
      toast.success(`Application ${status.toLowerCase()}`)
      setSelApps((list) => list.map((a) => (a.id === app.id ? { ...a, status } : a)))
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const openBooking = (app) => {
    setBookTarget(app)
    setBooking({
      projectName: selected?.name || '',
      startDate: (selected?.startDate || '').slice(0, 10),
      endDate: (selected?.endDate || '').slice(0, 10),
      agreedFee: app.proposedFee ?? selected?.budget ?? '',
    })
    setBookOpen(true)
  }

  const createBooking = async (e) => {
    e.preventDefault()
    setSavingBook(true)
    try {
      const body = {
        modelUserId: bookTarget.modelUserId,
        projectName: booking.projectName,
        description: selected?.description,
        startDate: booking.startDate ? new Date(booking.startDate).toISOString() : null,
        endDate: booking.endDate ? new Date(booking.endDate).toISOString() : null,
        agreedFee: booking.agreedFee ? Number(booking.agreedFee) : null,
        currency: selected?.currency || 'USD',
      }
      await post('/bookings', body)
      reportBookFromCampaign(selected?.name || selected?.title || 'Campaign', bookTarget?.displayName || 'Model')
      toast.success('Booking request sent to the model')
      setBookOpen(false)
      setSelApps((list) => list.map((a) => (a.id === bookTarget.id ? { ...a, status: 'Accepted' } : a)))
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSavingBook(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 980 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 26 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8 }}>Campaigns</span>
          <h1 className="section-title"><>My <span className="grad-text">campaigns</span></></h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
            {isModel ? 'Campaigns you applied to, all in one place.' : 'Launch, edit and publish campaigns — drafts stay hidden from models until published.'}
          </p>
        </div>
        {business && !campBlocked && campAllowed && (
          <button className="btn btn-primary" onClick={() => { setForm({}); setCreateOpen(true) }}>
            <Plus size={16} /> New campaign{campRem.limit !== null ? ` (${campRem.remaining} left)` : ''}
          </button>
        )}
        {business && (campBlocked || !campAllowed) && (
          <Link to="/plans" className="btn btn-primary"><Plus size={16} /> Upgrade to create campaigns</Link>
        )}
      </div>

      {isModel && (
        <>
          <div className="profile-tabs" style={{ marginBottom: 22 }}>
            {['', 'Pending', 'Shortlisted', 'Accepted', 'Rejected'].map((s) => (
              <button key={s} className={`profile-tab${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
                {s === '' ? 'All' : s}
              </button>
            ))}
          </div>

          {apps.length === 0 ? <EmptyState title="No campaign applications yet" message="Browse campaigns and apply to brand projects. Applications show your proposed fee and availability." action={<Link to="/campaigns" className="btn btn-primary">Browse campaigns</Link>} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {apps.map((a) => {
                const config = campaignStatusConfig[a.status] || campaignStatusConfig.Pending
                return (
                  <div key={a.id} className="card" style={{
                    padding: 0, overflow: 'hidden', borderLeft: `4px solid ${config.color}`,
                  }}>
                    <div style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Megaphone size={18} color={config.color} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Link to={`/campaigns/${a.campaignId}`} style={{ fontWeight: 700, fontSize: 15, textDecoration: 'none', color: 'inherit' }}>{a.campaign?.name || `Campaign #${a.campaignId}`}</Link>
                              {a.campaign?.status && <CampaignStatusBadge status={a.campaign.status} size="sm" />}
                            </div>
                          </div>
                          {a.proposal && <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 4, lineHeight: 1.6, paddingLeft: 50 }}>{a.proposal}</p>}
                          <div style={{ display: 'flex', gap: 16, color: 'var(--text-faint)', fontSize: 12.5, marginTop: 6, flexWrap: 'wrap', paddingLeft: 50 }}>
                            {a.campaign?.budget != null && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={12} /> {a.campaign.currency || '$'}{a.campaign.budget}</span>}
                            {a.campaign?.startDate && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarRange size={12} /> {new Date(a.campaign.startDate).toLocaleDateString()}</span>}
                            {a.proposedFee != null && <span style={{ color: '#10B981', fontWeight: 600 }}>Proposed: ${a.proposedFee}</span>}
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarRange size={12} /> Applied {new Date(a.createdAt).toLocaleDateString()}</span>
                          </div>
                          {a.feedback && <p style={{ color: 'var(--gold)', fontSize: 13, marginTop: 6, paddingLeft: 50, fontStyle: 'italic' }}>"{a.feedback}"</p>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                          <CampaignStatusBadge status={a.status} />
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {contractMap[a.campaignId] != null && (
                              <Link to="/contracts" className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', textDecoration: 'none' }}><FileText size={13} /> Contract</Link>
                            )}
                            <Link to={`/meeting/bm-campaign-${a.campaignId}`} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', textDecoration: 'none' }}><Video size={13} /> Meeting</Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {business && (
        <>
          {campaigns.length === 0 ? <EmptyState title="No campaigns yet" message="Create your first brand campaign to find models and talent." action={campAllowed && !campBlocked ? <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New campaign</button> : <Link to="/plans" className="btn btn-primary">Upgrade to create campaigns</Link>} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {campaigns.map((c) => {
                const config = campaignStatusConfig[c.status] || campaignStatusConfig.Draft
                return (
                  <div key={c.id} className="card" style={{
                    padding: 0, overflow: 'hidden', borderLeft: `4px solid ${config.color}`,
                  }}>
                    <div style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Megaphone size={18} color={config.color} />
                            </div>
                            <div>
                              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{c.name}</h3>
                              {c.objective && <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>{c.objective}</p>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 16, color: 'var(--text-faint)', fontSize: 12.5, marginTop: 8, flexWrap: 'wrap', paddingLeft: 50 }}>
                            {c.budget != null && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={12} /> ${c.budget}</span>}
                            {c.startDate && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarRange size={12} /> {new Date(c.startDate).toLocaleDateString()}</span>}
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> {c.filledPositions || 0}/{c.requiredModelsCount || '∞'} filled</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                          <CampaignStatusBadge status={c.status} />
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {c.status === 'Draft' && (
                              <button className="btn btn-primary btn-sm" onClick={() => changeStatus(c, 'Active', 'Campaign published — now visible to models')}><Send size={13} /> Publish</button>
                            )}
                            {c.status === 'Active' && (
                              <button className="btn btn-outline btn-sm" onClick={() => changeStatus(c, 'Completed', 'Campaign marked completed')}><Check size={13} /> Complete</button>
                            )}
                            <button className="btn btn-outline btn-sm" onClick={() => openApps(c)}><Eye size={13} /> Applications</button>
                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}><Pencil size={13} /> Edit</button>
                            <button className="btn btn-outline btn-sm" onClick={() => removeCampaign(c)} style={{ color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.4)' }}><Trash2 size={13} /> Delete</button>
                          </div>
                        </div>
                      </div>
                      {contractMap[c.id] != null && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingLeft: 50 }}>
                          <Link to="/contracts" className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', textDecoration: 'none' }}><FileText size={13} /> Contract</Link>
                          <Link to={`/meeting/bm-campaign-${c.id}`} className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', textDecoration: 'none' }}><Video size={13} /> Meeting</Link>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Create campaign modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a campaign" width={620}>
        <form onSubmit={(e) => createCampaign(e, 'Active')}>
          <div className="field"><label>Campaign name</label><input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Autumn fragrance launch" /></div>
          <div className="field"><label>Objective</label>
            <select value={form.objective || ''} onChange={(e) => setForm({ ...form, objective: e.target.value })}>
              <option value="">Select…</option>
              {['Brand awareness', 'Product launch', 'Seasonal campaign', 'Social content', 'Print / editorial', 'Runway show', 'Influencer collab'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="field"><label>Description</label><textarea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="field"><label>Creative brief</label><textarea rows={3} value={form.creativeBrief || ''} onChange={(e) => setForm({ ...form, creativeBrief: e.target.value })} placeholder="Concept, mood, deliverables…" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field"><label>Budget ($)</label><input type="number" value={form.budget || ''} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
            <div className="field"><label>Currency</label>
              <select value={form.currency || 'USD'} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {['USD', 'EUR', 'GBP', 'EGP', 'AED', 'SAR', 'TRY'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Start date</label><input type="date" value={(form.startDate || '').slice(0, 10)} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="field"><label>End date</label><input type="date" value={(form.endDate || '').slice(0, 10)} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            <div className="field"><label>Required model types</label><input value={form.requiredModelTypes || ''} onChange={(e) => setForm({ ...form, requiredModelTypes: e.target.value })} placeholder="Fashion, commercial…" /></div>
            <div className="field"><label>Models needed</label><input type="number" value={form.requiredModelsCount || ''} onChange={(e) => setForm({ ...form, requiredModelsCount: e.target.value })} /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-outline" disabled={saving} onClick={(e) => createCampaign(e, 'Draft')}><Save size={15} /> Save as draft</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Publish now'}</button>
          </div>
        </form>
      </Modal>

      {/* Edit campaign modal */}
      <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditing(null) }} title={`Edit campaign${editing ? ` — ${editing.name}` : ''}`} width={620}>
        <form onSubmit={updateCampaign}>
          <div className="field"><label>Campaign name</label><input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Objective</label>
            <select value={form.objective || ''} onChange={(e) => setForm({ ...form, objective: e.target.value })}>
              <option value="">Select…</option>
              {['Brand awareness', 'Product launch', 'Seasonal campaign', 'Social content', 'Print / editorial', 'Runway show', 'Influencer collab'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="field"><label>Description</label><textarea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="field"><label>Creative brief</label><textarea rows={3} value={form.creativeBrief || ''} onChange={(e) => setForm({ ...form, creativeBrief: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field"><label>Budget ($)</label><input type="number" value={form.budget || ''} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
            <div className="field"><label>Currency</label>
              <select value={form.currency || 'USD'} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {['USD', 'EUR', 'GBP', 'EGP', 'AED', 'SAR', 'TRY'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Start date</label><input type="date" value={(form.startDate || '').slice(0, 10)} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="field"><label>End date</label><input type="date" value={(form.endDate || '').slice(0, 10)} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            <div className="field"><label>Required model types</label><input value={form.requiredModelTypes || ''} onChange={(e) => setForm({ ...form, requiredModelTypes: e.target.value })} /></div>
            <div className="field"><label>Models needed</label><input type="number" value={form.requiredModelsCount || ''} onChange={(e) => setForm({ ...form, requiredModelsCount: e.target.value })} /></div>
            <div className="field"><label>Status</label>
              <select value={form.status || 'Active'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['Draft', 'Active', 'Completed', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => { setEditOpen(false); setEditing(null) }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Applications modal */}
      <Modal open={appsOpen} onClose={() => setAppsOpen(false)} title={selected?.name || 'Applications'} width={680}>
        {selApps.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: 30 }}>No applications yet.</p>
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
                          <CampaignStatusBadge status={a.status} size="sm" />
                        </div>
                        <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>Applied {new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>

                      <div style={{ display: 'flex', gap: 14, color: 'var(--text-dim)', fontSize: 12.5, marginTop: 8, flexWrap: 'wrap' }}>
                        {m.height != null && <span><Ruler size={12} /> {m.height} cm</span>}
                        {m.bodyType && <span>{m.bodyType}</span>}
                        {m.dressSize && <span>Dress {m.dressSize}</span>}
                        {m.shoeSize && <span>Shoe {m.shoeSize}</span>}
                        {m.ethnicity && <span>{m.ethnicity}</span>}
                        {m.city && <span><MapPin size={12} /> {[m.city, m.country].filter(Boolean).join(', ')}</span>}
                        {m.availableForTravel && <span className="badge badge-gold" style={{ fontSize: 11 }}>Travel ready</span>}
                      </div>

                      <div style={{ display: 'flex', gap: 14, color: 'var(--text-faint)', fontSize: 12, marginTop: 6, flexWrap: 'wrap' }}>
                        {m.experienceLevel && <span><Award size={12} /> {m.experienceLevel}{m.yearsOfExperience ? ` · ${m.yearsOfExperience} yrs` : ''}</span>}
                        {m.totalBookings > 0 && <span><Check size={12} /> {m.totalBookings} bookings</span>}
                        {m.averageRating > 0 && <span>★ {m.averageRating.toFixed(1)}</span>}
                        {m.socialMediaHandle && <span>@{m.socialMediaHandle}</span>}
                      </div>

                      {a.proposedFee != null && <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>Proposed fee: <strong>{a.proposedFee}</strong></p>}
                      {a.proposal && <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>{a.proposal}</p>}

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

      {/* Book model modal */}
      <Modal open={bookOpen} onClose={() => setBookOpen(false)} title="Book from campaign" width={520}>
        <form onSubmit={createBooking}>
          <div className="field">
            <label>Project name</label>
            <input required value={booking.projectName || ''} onChange={(e) => setBooking({ ...booking, projectName: e.target.value })} placeholder="e.g. Summer campaign shoot" />
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
            <label>Agreed fee ({selected?.currency || 'USD'})</label>
            <input type="number" required value={booking.agreedFee ?? ''} onChange={(e) => setBooking({ ...booking, agreedFee: e.target.value })} />
          </div>
          {bookTarget?.model && (
            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
              Booking: <strong>{bookTarget.model.displayName || [bookTarget.model.firstName, bookTarget.model.lastName].filter(Boolean).join(' ')}</strong> — the model will be asked to confirm, then payment protection activates.
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
