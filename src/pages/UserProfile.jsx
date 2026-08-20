import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Star, Users, Briefcase, Eye, Heart, Calendar, MessageCircle, Check, Camera, ArrowRight, Zap, Flag, Building2, Handshake, Plus, Trash2, X, Image as ImageIcon, Pencil, TrendingUp } from 'lucide-react'
import { get, post, put, del, upload, errMsg, assetUrl, parseList, asArray } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'
import StoryViewer from '../components/StoryViewer'
import { reportProfileView, reportStoryView, reportFollow, reportRequestBooking, reportReportUser } from '../hooks/usePageTracking'
import './ModelProfile.css'

const ROLE_LABELS = { Model: 'Model', Brand: 'Brand', Agency: 'Agency' }
const HL_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#8f6b1e']

export default function UserProfile({ userId: userIdProp }) {
  const { userId: routeUserId } = useParams()
  const userId = userIdProp ?? routeUserId
  const { isAuthed, user, hasRole } = useAuth()
  const sub = useSubscription()
  const isBusiness = hasRole('Brand', 'Agency')
  const toast = useToast()
  const [data, setData] = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [posts, setPosts] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [highlights, setHighlights] = useState({ data: [], stories: [] })
  const [loading, setLoading] = useState(true)
  const [bookModal, setBookModal] = useState(false)
  const [bookForm, setBookForm] = useState({ projectName: '', description: '', startDate: '', endDate: '', location: '', agreedFee: '', isVirtual: false })
  const [booking, setBooking] = useState(null)
  const [reportModal, setReportModal] = useState(false)
  const [reportForm, setReportForm] = useState({ reason: '', description: '', linkUrl: '', evidence: null })
  const [submitting, setSubmitting] = useState(false)
  const [storyViewer, setStoryViewer] = useState(null)
  const [boosted, setBoosted] = useState(false)
  const [boostRemaining, setBoostRemaining] = useState(0)
  const [hlModal, setHlModal] = useState(false)
  const [hlForm, setHlForm] = useState({ title: '', coverColor: '#8B5CF6' })
  const [hlStoryIds, setHlStoryIds] = useState([])
  const [hlCoverFile, setHlCoverFile] = useState(null)
  const [hlCoverUrl, setHlCoverUrl] = useState('')
  const [myStories, setMyStories] = useState([])
  const [hlBusy, setHlBusy] = useState(false)
  const [deletingHl] = useState(null)
  const [hlEdit, setHlEdit] = useState(null)
  const [hlEditForm, setHlEditForm] = useState({ title: '', coverColor: '#8B5CF6' })
  const [hlEditStoryIds, setHlEditStoryIds] = useState([])
  const [hlEditCoverFile, setHlEditCoverFile] = useState(null)
  const [hlEditCoverUrl, setHlEditCoverUrl] = useState('')
  const [hlEditBusy, setHlEditBusy] = useState(false)
  const [followList, setFollowList] = useState(null)
  const [flSearch, setFlSearch] = useState('')
  const flTimer = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [prof, port, pos, camp, hl] = await Promise.allSettled([
        get('/profiles/by-user/' + userId),
        get('/portfolio', { userId, pageSize: 9 }),
        get('/posts', { userId, pageSize: 10 }),
        get('/campaigns', { brandUserId: userId, pageSize: 6 }),
        get(`/profiles/${userId}/highlights`),
      ])
      if (prof.status === 'fulfilled') setData(prof.value)
      if (port.status === 'fulfilled') setPortfolio(port.value)
      if (pos.status === 'fulfilled') setPosts(pos.value.data || [])
      if (camp.status === 'fulfilled') setCampaigns(camp.value.data || [])
      if (hl.status === 'fulfilled') {
        const v = hl.value || {}
        setHighlights({ data: Array.isArray(v.data) ? v.data.filter(Boolean) : [], stories: Array.isArray(v.stories) ? v.stories : [] })
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  // Report profile view for tracking
  useEffect(() => {
    if (data && data.displayName && user?.id !== userId) {
      const profileType = data.roles?.includes('Brand') ? 'brand' : data.roles?.includes('Agency') ? 'agency' : 'model'
      reportProfileView(userId, data.displayName, profileType)
    }
  }, [data, userId, user?.id])

  useEffect(() => {
    if (!isAuthed || user?.id !== userId) return
    get('/boosts/my').then((res) => {
      setBoosted((res?.data || []).some((b) => b.targetType === 'Profile'))
      setBoostRemaining(res?.remaining || 0)
    }).catch(() => {})
  }, [isAuthed, user?.id, userId])

  useEffect(() => {
    if (!isAuthed || user?.id !== userId) return
    get('/stories/my').then((res) => setMyStories(asArray(res))).catch(() => {})
  }, [isAuthed, user?.id, userId])

  useEffect(() => () => clearTimeout(flTimer.current), [])

  // ---- Followers / following list ----
  const openFollowList = (mode) => {
    if (!isAuthed) { toast.info('Log in to see followers'); return }
    setFlSearch('')
    setFollowList({ mode, data: [], total: 0, loading: true })
    loadFollowList(mode, '')
  }

  const loadFollowList = async (mode, search) => {
    try {
      const res = await get(`/follows/${mode}`, { userId, search: search || undefined, page: 1, pageSize: 100 })
      setFollowList((f) => (f && f.mode === mode ? { ...f, data: res.data || [], total: res.total || 0, loading: false } : f))
    } catch {
      setFollowList((f) => (f && f.mode === mode ? { ...f, loading: false } : f))
    }
  }

  const onFlSearch = (value) => {
    setFlSearch(value)
    setFollowList((f) => (f ? { ...f, loading: true } : f))
    clearTimeout(flTimer.current)
    flTimer.current = setTimeout(() => loadFollowList(followList?.mode || 'followers', value), 400)
  }

  const followInList = async (person) => {
    try {
      const res = await post(`/follows/${person.id}`)
      setFollowList((f) => (f ? { ...f, data: f.data.map((u) => (u.id === person.id ? { ...u, isFollowing: res.following } : u)) } : f))
    } catch (err) { toast.error(errMsg(err)) }
  }

  const openHlModal = () => {
    setHlForm({ title: '', coverColor: '#8B5CF6' })
    setHlStoryIds([])
    setHlCoverFile(null)
    setHlCoverUrl('')
    setHlModal(true)
  }

  const submitHighlight = async (e) => {
    e.preventDefault()
    setHlBusy(true)
    try {
      let coverMediaUrl = hlCoverUrl
      if (hlCoverFile) {
        const fd = new FormData()
        fd.append('files', hlCoverFile)
        const up = await upload('/uploads?folder=highlights', fd)
        coverMediaUrl = up.files?.[0]?.url || ''
      }
      await post('/profiles/highlights', {
        title: hlForm.title,
        coverColor: hlForm.coverColor,
        coverMediaUrl: coverMediaUrl || undefined,
        storyIds: hlStoryIds,
      })
      toast.success('Highlight created!')
      setHlModal(false)
      load()
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setHlBusy(false)
    }
  }

  const deleteHighlight = async (id) => {
    try {
      await del(`/profiles/highlights/${id}`)
      toast.success('Highlight deleted')
      setStoryViewer(null)
      setHlEdit(null)
      load()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const openHlEdit = (h) => {
    setHlEdit(h)
    setHlEditForm({ title: h?.title || '', coverColor: h?.coverColor || '#8B5CF6' })
    setHlEditCoverFile(null)
    setHlEditCoverUrl(h?.coverMediaUrl || '')
    let ids = []
    try { ids = JSON.parse(h?.stories || '[]').map(Number) } catch { ids = [] }
    setHlEditStoryIds(ids)
    get('/stories/my').then((res) => setMyStories(asArray(res))).catch(() => {})
  }

  const toggleHlEditStory = (id) => {
    setHlEditStoryIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  const saveHlEdit = async (e) => {
    e.preventDefault()
    if (!hlEdit) return
    setHlEditBusy(true)
    try {
      let coverMediaUrl = hlEditCoverUrl
      if (hlEditCoverFile) {
        const fd = new FormData()
        fd.append('files', hlEditCoverFile)
        const up = await upload('/uploads?folder=highlights', fd)
        coverMediaUrl = up.files?.[0]?.url || ''
      }
      await put(`/profiles/highlights/${hlEdit.id}`, {
        title: hlEditForm.title,
        coverColor: hlEditForm.coverColor,
        coverMediaUrl: coverMediaUrl || undefined,
        storyIds: hlEditStoryIds,
      })
      toast.success('Highlight updated')
      setHlEdit(null)
      setStoryViewer(null)
      load()
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setHlEditBusy(false)
    }
  }

  const boostProfile = async () => {
    try {
      await post('/boosts', { targetType: 'Profile', targetId: 0 })
      setBoosted(true)
      toast.success('Your profile is spotlighted — it now appears at the top of Explore')
      const res = await get('/boosts/my')
      setBoostRemaining(res?.remaining || 0)
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const toggleFollow = async () => {
    if (!isAuthed) { toast.info('Log in to follow'); return }
    try {
      const res = await post(`/follows/${userId}`)
      setData((d) => ({
        ...d,
        isFollowing: res.following,
        stats: { ...d.stats, followers: d.stats.followers + (res.following ? 1 : -1) },
      }))
      reportFollow(userId, data?.displayName || name)
      toast.success(res.following ? 'Following' : 'Unfollowed')
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const submitBooking = async (e) => {
    e.preventDefault()
    try {
      const body = { modelUserId: userId, projectName: bookForm.projectName, description: bookForm.description, location: bookForm.location, isVirtual: bookForm.isVirtual }
      if (bookForm.startDate) body.startDate = bookForm.startDate
      if (bookForm.endDate) body.endDate = bookForm.endDate
      if (bookForm.agreedFee) body.agreedFee = Number(bookForm.agreedFee)
      const res = await post('/bookings', body)
      setBooking(res.booking)
      reportRequestBooking(null, data?.displayName || name)
      setBookModal(false)
      toast.success('Booking request sent!')
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const submitReport = async (e) => {
    e.preventDefault()
    if (!isAuthed) { toast.info('Log in to report'); return }
    setSubmitting(true)
    try {
      let evidence = []
      if (reportForm.evidence) {
        const fd = new FormData()
        fd.append('files', reportForm.evidence)
        const up = await upload('/uploads?folder=reports', fd)
        evidence = (up.files || []).map((f) => f.url)
      }
      await post('/reports', {
        targetType: 'User',
        targetUserId: userId,
        reason: reportForm.reason,
        description: reportForm.description || undefined,
        linkUrl: reportForm.linkUrl || undefined,
        evidenceUrls: evidence.length ? evidence : undefined,
      })
      reportReportUser(userId, data?.displayName || name, reportForm.reason)
      toast.success('Report submitted. Our team will review it shortly.')
      setReportModal(false)
      setReportForm({ reason: '', description: '', linkUrl: '', evidence: null })
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSubmitting(false)
    }
  }

  const storyOf = (h) => {
    let ids = []
    try { ids = JSON.parse(h.stories || '[]').map(Number) } catch { ids = [] }
    return (highlights.stories || []).filter((s) => ids.includes(s.id))
  }

  if (loading) return <PageLoader />
  if (!data) return <EmptyState title="Profile not found" message="This profile doesn't exist or is no longer available." />

  const { user: pu, primaryRole, model, brand, agency, stats, isFollowing } = data
  const isOwn = isAuthed && user?.id === pu.id
  const profile = model || brand || agency
  const roleLabel = ROLE_LABELS[primaryRole] || 'Member'
  const name = model ? `${model.firstName || ''} ${model.lastName || ''}`.trim()
    : brand ? (brand.companyName || pu.displayName) : agency ? (agency.agencyName || pu.displayName) : (pu.displayName || pu.userName || 'User')
  const location = model ? `${model.city || ''}${model.city && model.country ? ', ' : ''}${model.country || ''}`
    : brand ? `${brand.city || ''}${brand.city && brand.country ? ', ' : ''}${brand.country || ''}`
    : agency ? `${agency.city || ''}${agency.city && agency.country ? ', ' : ''}${agency.country || ''}` : ''
  const spec = parseList(model?.specialties)
  const portfolioItems = portfolio?.data || []
  const isModel = primaryRole === 'Model'
  const isBizProfile = primaryRole === 'Brand' || primaryRole === 'Agency'

  return (
    <div className="mp">
      <div className="mp-cover">
        {pu.coverImageUrl ? <img src={assetUrl(pu.coverImageUrl)} alt="" /> : profile?.coverImageUrl ? <img src={assetUrl(profile.coverImageUrl)} alt="" /> : <div className="mp-cover-fallback" />}
      </div>

      <div className="container">
        <div className="mp-head">
          <div className="mp-avatar-wrap">
            {pu.profilePictureUrl ? <img src={assetUrl(pu.profilePictureUrl)} alt={name} /> : profile?.logoUrl ? <img src={assetUrl(profile.logoUrl)} alt={name} /> : <span>{name.charAt(0)}</span>}
          </div>
          <div className="mp-head-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1>{name}</h1>
              <span className={`badge ${isModel ? 'badge-blue' : isBizProfile ? 'badge-amber' : 'badge-green'}`}>{roleLabel}</span>
              {pu.verificationLevel === 'IdentityVerified' && <span className="badge badge-green"><Check size={13} /> Verified</span>}
              {pu.isFeatured && <span className="badge badge-amber"><Zap size={13} /> Featured</span>}
            </div>
            {(location || (model && model.experienceLevel)) && (
              <p style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {location && <><MapPin size={14} /> {location}</>}
                {location && model?.experienceLevel ? ' · ' : ''}
                {model?.experienceLevel || ''}
              </p>
            )}
            {!isModel && profile?.industry && <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{profile.industry}</p>}
            <div className="mp-stats">
              {stats.reviewCount > 0 && <span><Star size={16} color="var(--gold)" /> {stats.averageRating.toFixed(1)} <small>({stats.reviewCount} reviews)</small></span>}
              <span><Briefcase size={16} /> {stats.bookings || 0} bookings</span>
              <span><Eye size={16} /> {stats.portfolioViews || 0} views</span>
              <button className="mp-stat-btn" onClick={() => openFollowList('followers')}><Users size={16} /> {stats.followers} followers</button>
              <button className="mp-stat-btn" onClick={() => openFollowList('following')}><Users size={16} /> {stats.following} following</button>
            </div>
          </div>
          <div className="mp-actions">
            {!isOwn && (
              <>
                <button className="btn btn-outline" onClick={toggleFollow}>
                  {isFollowing ? <><Check size={16} /> Following</> : 'Follow'}
                </button>
                <Link to={isAuthed ? `/messages?to=${userId}` : '/login'} className="btn btn-outline"><MessageCircle size={16} /> Message</Link>
                {isModel && isBusiness && <button className="btn btn-primary" onClick={() => setBookModal(true)}>Book now</button>}
                <button className="btn btn-ghost" onClick={() => setReportModal(true)} style={{ borderColor: 'var(--border)' }}><Flag size={16} /> Report</button>
              </>
            )}
            {isOwn && (
              <>
                {sub.can('boost') && (
                  <button className="btn btn-outline" onClick={boostProfile} disabled={boosted}>
                    <Zap size={16} /> {boosted ? 'Spotlighted' : `Spotlight profile${boostRemaining > 0 ? ` (${boostRemaining} left)` : ''}`}
                  </button>
                )}
                <Link to="/profile/edit" className="btn btn-primary"><Pencil size={15} /> Edit profile</Link>
              </>
            )}
          </div>
        </div>

        {(highlights.data.length > 0 || isOwn) && (
          <div className="mp-highlights">
            {isOwn && (
              <button className="mp-highlight" onClick={openHlModal}>
                <span className="mp-highlight-ring mp-highlight-add"><Plus size={22} /></span>
                <small>New</small>
              </button>
            )}
            {highlights.data.map((h) => {
              const storyCount = (() => { try { return JSON.parse(h.stories || '[]').length } catch { return 0 } })()
              return (
                <button key={h.id} className="mp-highlight" onClick={() => { if (storyCount === 0) { if (isOwn) { openHlEdit(h) } else { toast.info('This highlight has no stories yet') } return } setStoryViewer(h) }}>
                  <span className="mp-highlight-ring">
                    {h.coverMediaUrl ? <img src={assetUrl(h.coverMediaUrl)} alt="" /> : <span style={{ background: h.coverColor || 'linear-gradient(135deg,#c9a227,#8f6b1e)' }}>{(h.title || 'H')[0]}</span>}
                  </span>
                  <small>{h.title || 'Highlight'}</small>
                  {storyCount > 0 && <span style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{storyCount}</span>}
                </button>
              )
            })}
          </div>
        )}

        <div className="mp-body">
          <div className="mp-main">
            <section className="mp-card">
              <h2>About</h2>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7 }}>
                {pu.bio || profile?.description || `${name} is a member of the BrandMarketplace community.`}
              </p>
              {model && (
                <>
                  <div className="mp-specs">
                    {[
                      ['Height', model.height ? `${model.height} cm` : '—'],
                      ['Weight', model.weight ? `${model.weight} kg` : '—'],
                      ['Eye color', model.eyeColor || '—'],
                      ['Hair', model.hairColor || '—'],
                      ['Body type', model.bodyType || '—'],
                      ['Experience', `${model.yearsOfExperience || 0} yrs`],
                    ].map(([l, v]) => (
                      <div key={l} className="mp-spec"><span>{l}</span><strong>{v}</strong></div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                    {spec.map((s) => <span key={s} className="badge">{s}</span>)}
                  </div>
                </>
              )}
              {(brand?.website || agency?.website) && (
                <p style={{ marginTop: 12 }}>
                  <a href={brand?.website || agency?.website} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                    Visit website <ArrowRight size={13} />
                  </a>
                </p>
              )}
            </section>

            {model && (model.dailyRate || model.hourlyRate) && (
              <section className="mp-card">
                <h2>Rates</h2>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[['Daily rate', model.dailyRate], ['Hourly rate', model.hourlyRate]].filter(([, v]) => v).map(([l, v]) => (
                    <div key={l} className="rate-box">
                      <span>{l}</span>
                      <strong>{v} <small>{model.currency || 'USD'}</small></strong>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {portfolioItems.length > 0 && (
              <section className="mp-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <h2 style={{ margin: 0 }}>Portfolio</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="mp-port-count">{portfolioItems.length} {portfolioItems.length === 1 ? 'work' : 'works'}</span>
                    {stats.hasPortfolio && <Link to={`/portfolio/${userId}`} className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>}
                  </div>
                </div>
                <div className="mp-port-grid">
                  {portfolioItems.slice(0, 6).map((p) => (
                    <Link key={p.id} to={`/portfolio/${userId}`} className="mp-port-card" title={p.title}>
                      {p.coverMediaUrl ? (
                        <img src={assetUrl(p.coverThumbnailUrl || p.coverMediaUrl)} alt={p.title} loading="lazy" />
                      ) : (
                        <span className="mp-port-fallback">{p.title.charAt(0)}</span>
                      )}
                      {p.mediaCount > 1 && (
                        <span className="mp-port-count-badge"><ImageIcon size={12} /> {p.mediaCount}</span>
                      )}
                      <div className="mp-port-overlay">
                        <strong>{p.title}</strong>
                        <span className="mp-port-stats">
                          <span><Heart size={14} /> {p.likesCount}</span>
                          <span><Eye size={14} /> {p.viewsCount}</span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {posts.length > 0 && (
              <section className="mp-card">
                <h2>Posts</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {posts.map((p) => (
                    <div key={p.id} className="card" style={{ padding: 14 }}>
                      <p style={{ color: 'var(--text-dim)', fontSize: 14.5, lineHeight: 1.6 }}>{p.content || <em style={{ color: 'var(--text-faint)' }}>(media post)</em>}</p>
                      {p.mediaUrls && (() => { try { const m = JSON.parse(p.mediaUrls); return Array.isArray(m) && m[0] ? <img src={assetUrl(m[0])} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 10, marginTop: 10 }} /> : null } catch { return null } })()}
                      <div style={{ display: 'flex', gap: 16, color: 'var(--text-faint)', fontSize: 12.5, marginTop: 8 }}>
                        <span><Heart size={12} /> {p.likesCount || 0}</span>
                        <span><Eye size={12} /> {p.viewsCount || 0}</span>
                        <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {isBizProfile && campaigns.length > 0 && (
              <section className="mp-card">
                <h2>Open campaigns</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {campaigns.map((c) => (
                    <Link key={c.id} to={`/campaign/${c.id}`} className="dash-booking" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>{c.Title || c.title}</strong>
                        <small style={{ display: 'block', color: 'var(--text-faint)' }}>{c.Objective || c.objective || ''} · {new Date(c.EndDate || c.endDate || c.CreatedAt || c.createdAt).toLocaleDateString()}</small>
                      </div>
                      <strong style={{ fontFamily: 'var(--font-head)' }}>${c.Budget ?? c.budget ?? 0}</strong>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="mp-side">
            {model && (
              <div className="mp-card">
                <h2>Booking info</h2>
                <ul className="mp-info-list">
                  <li><span><Camera size={16} /> Experience</span><strong>{model.experienceLevel || '—'}</strong></li>
                  <li><span><Calendar size={16} /> Work region</span><strong>{model.workRegion || '—'}</strong></li>
                  <li><span><Check size={16} /> Agency rep</span><strong>{model.agencyRepresentation ? 'Yes' : 'No'}</strong></li>
                  <li><span><MapPin size={16} /> Travel</span><strong>{model.availableForTravel ? 'Yes' : 'No'}</strong></li>
                </ul>
                {isBusiness && (
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setBookModal(true)}>
                    <Calendar size={16} /> Request booking
                  </button>
                )}
              </div>
            )}
            {isBizProfile && (
              <div className="mp-card">
                <h2>{primaryRole === 'Agency' ? 'Agency info' : 'Company info'}</h2>
                <ul className="mp-info-list">
                  <li><span>{primaryRole === 'Agency' ? <Handshake size={16} /> : <Building2 size={16} />} Location</span><strong>{location || '—'}</strong></li>
                  {agency && <li><span><Users size={16} /> Models</span><strong>{agency.totalModels || 0}</strong></li>}
                  {agency?.specialties && <li><span><Star size={16} /> Specialties</span><strong>{agency.specialties}</strong></li>}
                  {agency?.yearsInBusiness > 0 && <li><span><Calendar size={16} /> Years active</span><strong>{agency.yearsInBusiness}</strong></li>}
                  {agency?.commissionRate != null && <li><span><TrendingUp size={16} /> Commission</span><strong>{agency.commissionRate}%</strong></li>}
                  {brand && <li><span><Building2 size={16} /> Size</span><strong>{brand.companySize > 0 ? `${brand.companySize} people` : '—'}</strong></li>}
                  <li><span><Briefcase size={16} /> Campaigns</span><strong>{stats.bookings || 0}</strong></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking modal */}
      <Modal open={bookModal} onClose={() => setBookModal(false)} title={`Book ${name}`}>
        {booking ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <span style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(16,185,129,0.15)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}><Check size={26} color="#10B981" /></span>
            <h3>Booking requested!</h3>
            <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>The model will review your request. Track it in your dashboard.</p>
            <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 18 }}>Go to dashboard</Link>
          </div>
        ) : (
          <form onSubmit={submitBooking}>
            <div className="field"><label>Project name *</label><input required value={bookForm.projectName} onChange={(e) => setBookForm({ ...bookForm, projectName: e.target.value })} placeholder="e.g. Spring lookbook" /></div>
            <div className="field"><label>Description</label><textarea value={bookForm.description} onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field"><label>Start date</label><input type="date" value={bookForm.startDate} onChange={(e) => setBookForm({ ...bookForm, startDate: e.target.value })} /></div>
              <div className="field"><label>End date</label><input type="date" value={bookForm.endDate} onChange={(e) => setBookForm({ ...bookForm, endDate: e.target.value })} /></div>
            </div>
            <div className="field"><label>Location</label><input value={bookForm.location} onChange={(e) => setBookForm({ ...bookForm, location: e.target.value })} placeholder="Studio, city, or virtual" /></div>
            <div className="field"><label>Agreed fee (USD)</label><input type="number" min="0" value={bookForm.agreedFee} onChange={(e) => setBookForm({ ...bookForm, agreedFee: e.target.value })} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, color: 'var(--text-dim)', fontSize: 14 }}>
              <input type="checkbox" checked={bookForm.isVirtual} onChange={(e) => setBookForm({ ...bookForm, isVirtual: e.target.checked })} /> Virtual session
            </label>
            <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Send booking request</button>
          </form>
        )}
      </Modal>

      {/* Report modal */}
      <Modal open={reportModal} onClose={() => setReportModal(false)} title="Report profile">
        <form onSubmit={submitReport}>
          <div className="field">
            <label>Reason *</label>
            <select required value={reportForm.reason} onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}>
              <option value="" disabled>Select a reason</option>
              {['Fake profile', 'Scam or fraud attempt', 'Inappropriate content', 'Harassment', 'Impersonation', 'Copyright violation', 'Other'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="field"><label>Details</label><textarea rows={4} value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} placeholder="Describe what happened…" /></div>
          <div className="field"><label>Related link (optional)</label><input value={reportForm.linkUrl} onChange={(e) => setReportForm({ ...reportForm, linkUrl: e.target.value })} placeholder="https://…" /></div>
          <div className="field"><label>Evidence (optional)</label><input type="file" accept="image/*" onChange={(e) => setReportForm({ ...reportForm, evidence: e.target.files[0] })} /></div>
          <button className="btn btn-danger" style={{ width: '100%' }} type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit report'}</button>
        </form>
      </Modal>

      {/* Highlight story viewer */}
      <StoryViewer
        open={!!storyViewer}
        groups={storyViewer ? [{ userId: pu.id, items: storyOf(storyViewer) }] : []}
        onClose={() => setStoryViewer(null)}
        getAuthor={() => ({ displayName: name, profilePictureUrl: pu.profilePictureUrl })}
        renderAuthor={(item) => (
          <div className="story-viewer-author">
            <span className="story-viewer-avatar">
              {pu.profilePictureUrl ? <img src={assetUrl(pu.profilePictureUrl)} alt="" /> : <span>{name.charAt(0)}</span>}
            </span>
            <div>
              <strong>{name}</strong>
              <span>{storyViewer?.title} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</span>
            </div>
          </div>
        )}
        renderActions={() => (isOwn ? (
          <>
            <button className="story-viewer-hl" onClick={(e) => { e.stopPropagation(); openHlEdit(storyViewer) }}><Pencil size={15} /> Edit</button>
            <button className="story-viewer-del" onClick={(e) => { e.stopPropagation(); deleteHighlight(storyViewer.id) }} disabled={deletingHl === storyViewer.id}>
              <Trash2 size={15} /> Delete
            </button>
          </>
        ) : null)}
      />

      {/* Edit highlight modal */}
      <Modal open={!!hlEdit} onClose={() => setHlEdit(null)} title="Edit highlight">
        {hlEdit && (
          <form onSubmit={saveHlEdit}>
            <div className="field"><label>Title *</label><input required maxLength={40} value={hlEditForm.title} onChange={(e) => setHlEditForm({ ...hlEditForm, title: e.target.value })} placeholder="e.g. Photoshoots" /></div>
            <div className="field">
              <label>Cover</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {HL_COLORS.map((c) => (
                  <button type="button" key={c} onClick={() => setHlEditForm({ ...hlEditForm, coverColor: c })}
                    style={{ width: 34, height: 34, borderRadius: '50%', background: c, border: hlEditForm.coverColor === c ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
                <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', marginLeft: 4 }}>
                  {hlEditCoverUrl || hlEditCoverFile ? 'Change' : 'Upload'} <Camera size={13} />
                  <input type="file" accept="image/*" hidden onChange={(e) => { setHlEditCoverFile(e.target.files?.[0] || null); setHlEditCoverUrl('') }} />
                </label>
              </div>
              {(hlEditCoverFile || hlEditCoverUrl) && (
                <div style={{ marginTop: 10, display: 'inline-block', position: 'relative' }}>
                  <img src={hlEditCoverFile ? URL.createObjectURL(hlEditCoverFile) : assetUrl(hlEditCoverUrl)} alt="" style={{ width: 74, height: 74, borderRadius: '50%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => { setHlEditCoverFile(null); setHlEditCoverUrl('') }} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#111', color: '#fff', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={13} /></button>
                </div>
              )}
            </div>
            <div className="field">
              <label>Stories — tap to add or remove (any time)</label>
              {myStories.length === 0 ? (
                <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>No stories yet — post stories from the Feed to add them to highlights.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {myStories.map((s) => (
                    <button type="button" key={s.id} onClick={() => toggleHlEditStory(s.id)}
                      style={{ position: 'relative', border: hlEditStoryIds.includes(s.id) ? '3px solid var(--gold)' : '3px solid transparent', borderRadius: 12, cursor: 'pointer', padding: 0, background: 'none' }}>
                      <img src={assetUrl(s.mediaUrl)} alt="" style={{ width: 58, height: 80, borderRadius: 9, objectFit: 'cover', display: 'block' }} />
                      {hlEditStoryIds.includes(s.id) && <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--gold)', color: '#111', borderRadius: '50%', width: 18, height: 18, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-danger btn-sm" type="button" onClick={() => deleteHighlight(hlEdit.id)} disabled={hlEditBusy || deletingHl === hlEdit.id}>
                <Trash2 size={14} /> Delete
              </button>
              <button className="btn btn-primary btn-sm" type="submit" disabled={hlEditBusy} style={{ marginLeft: 'auto' }}>
                {hlEditBusy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create highlight modal */}
      <Modal open={hlModal} onClose={() => setHlModal(false)} title="New highlight">
        <form onSubmit={submitHighlight}>
          <div className="field"><label>Title *</label><input required maxLength={40} value={hlForm.title} onChange={(e) => setHlForm({ ...hlForm, title: e.target.value })} placeholder="e.g. Photoshoots" /></div>
          <div className="field">
            <label>Cover</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#8f6b1e'].map((c) => (
                <button type="button" key={c} onClick={() => setHlForm({ ...hlForm, coverColor: c })}
                  style={{ width: 34, height: 34, borderRadius: '50%', background: c, border: hlForm.coverColor === c ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer' }} />
              ))}
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', marginLeft: 4 }}>
                {hlCoverUrl || hlCoverFile ? 'Change' : 'Upload'} <Camera size={13} />
                <input type="file" accept="image/*" hidden onChange={(e) => { setHlCoverFile(e.target.files?.[0] || null); setHlCoverUrl('') }} />
              </label>
            </div>
            {(hlCoverFile || hlCoverUrl) && (
              <div style={{ marginTop: 10, display: 'inline-block', position: 'relative' }}>
                <img src={hlCoverFile ? URL.createObjectURL(hlCoverFile) : assetUrl(hlCoverUrl)} alt="" style={{ width: 74, height: 74, borderRadius: '50%', objectFit: 'cover' }} />
                <button type="button" onClick={() => { setHlCoverFile(null); setHlCoverUrl('') }} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#111', color: '#fff', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={13} /></button>
              </div>
            )}
          </div>
          <div className="field">
            <label>Stories</label>
            {myStories.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>No stories yet — post stories from the Feed to add them to highlights.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {myStories.map((s) => (
                  <button type="button" key={s.id} onClick={() => setHlStoryIds((ids) => ids.includes(s.id) ? ids.filter((x) => x !== s.id) : [...ids, s.id])}
                    style={{ position: 'relative', border: hlStoryIds.includes(s.id) ? '3px solid var(--gold)' : '3px solid transparent', borderRadius: 12, cursor: 'pointer', padding: 0, background: 'none' }}>
                    <img src={assetUrl(s.mediaUrl)} alt="" style={{ width: 58, height: 80, borderRadius: 9, objectFit: 'cover', display: 'block' }} />
                    {hlStoryIds.includes(s.id) && <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--gold)', color: '#111', borderRadius: '50%', width: 18, height: 18, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit" disabled={hlBusy}>{hlBusy ? 'Creating…' : 'Create highlight'}</button>
        </form>
      </Modal>

      {/* Followers / following list */}
      <Modal open={!!followList} onClose={() => setFollowList(null)} title={followList?.mode === 'followers' ? 'Followers' : 'Following'} width={480}>
        {followList && (
          <div>
            <input
              className="field"
              placeholder="Search by name…"
              value={flSearch}
              onChange={(e) => onFlSearch(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            {followList.loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>Loading…</div>
            ) : followList.data.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: 16 }}>
                {flSearch ? 'No matches found.' : 'No people here yet.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 420, overflowY: 'auto' }}>
                {followList.data.map((u) => (
                  <div key={u.id} className="mp-follow-row">
                    <Link to={`/u/${u.id}`} className="mp-follow-user">
                      <span className="mp-follow-avatar">
                        {u.profilePictureUrl ? <img src={assetUrl(u.profilePictureUrl)} alt="" /> : <span>{(u.displayName || u.userName || '?')[0]}</span>}
                      </span>
                      <div>
                        <strong>{u.displayName || u.userName}</strong>
                        {u.verificationLevel === 'IdentityVerified' && <span className="badge badge-green" style={{ marginLeft: 6 }}>✓ Verified</span>}
                      </div>
                    </Link>
                    {u.id !== user?.id && (
                      <button className={`btn btn-sm ${u.isFollowing ? 'btn-outline' : 'btn-primary'}`} onClick={() => followInList(u)}>
                        {u.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
