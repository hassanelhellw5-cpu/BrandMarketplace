import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Star, Users, Briefcase, Eye, Heart, Calendar, MessageCircle, Share2, Check, Camera, ArrowRight, Zap } from 'lucide-react'
import { get, post, del, errMsg, assetUrl, parseList } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState, StarRating } from '../components/ui'
import Modal from '../components/Modal'
import './ModelProfile.css'

export default function ModelProfile() {
  const { userId } = useParams()
  const { isAuthed, user, hasRole } = useAuth()
  const sub = useSubscription()
  const isBusiness = hasRole('Brand', 'Agency')
  const isAgency = hasRole('Agency')
  const toast = useToast()
  const [data, setData] = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [reviews, setReviews] = useState(null)
  const [posts, setPosts] = useState([])
  const [follows, setFollows] = useState({ following: false, followers: 0, followingCount: 0 })
  const [followModal, setFollowModal] = useState(null)
  const [followList, setFollowList] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookModal, setBookModal] = useState(false)
  const [bookForm, setBookForm] = useState({ projectName: '', description: '', startDate: '', endDate: '', location: '', agreedFee: '', isVirtual: false })
  const [booking, setBooking] = useState(null)
  const [revForm, setRevForm] = useState({ rating: 5, title: '', comment: '' })
  const [inRoster, setInRoster] = useState(false)
  const [rosterBusy, setRosterBusy] = useState(false)
  const [boosted, setBoosted] = useState(false)
  const [boostRemaining, setBoostRemaining] = useState(0)

  useEffect(() => {
    if (!isAuthed || user?.id !== userId) return
    get('/boosts/my').then((res) => {
      setBoosted((res?.data || []).some((b) => b.targetType === 'Profile'))
      setBoostRemaining(res?.remaining || 0)
    }).catch(() => {})
  }, [isAuthed, user?.id, userId])

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

  useEffect(() => {
    if (!isAgency || !user?.id || user.id === userId) return
    get(`/roster/check/${userId}`).then((res) => setInRoster(!!res?.inRoster)).catch(() => {})
  }, [isAgency, user?.id, userId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [prof, port, rev, pos] = await Promise.allSettled([
        get('/profiles/model', { userId }),
        get('/portfolio', { userId, pageSize: 9 }),
        get('/reviews', { targetUserId: userId, pageSize: 10 }),
        get('/posts', { userId, pageSize: 10 }),
      ])
      if (prof.status === 'fulfilled') setData(prof.value)
      if (port.status === 'fulfilled') setPortfolio(port.value)
      if (rev.status === 'fulfilled') setReviews(rev.value)
      if (pos.status === 'fulfilled') setPosts(pos.value.data || [])
      if (isAuthed) {
        try {
          const [c, fl] = await Promise.allSettled([
            get('/follows/counts', { userId }),
            get('/follows/following', { userId }),
          ])
          const followers = c.status === 'fulfilled' ? c.value.followers : 0
          const followingCount = c.status === 'fulfilled' ? c.value.following : 0
          const followingList = fl.status === 'fulfilled' ? fl.value : []
          setFollows({ followers, followingCount, following: followingList.includes(user.id) })
        } catch { /* ignore */ }
      }
    } finally {
      setLoading(false)
    }
  }, [userId, isAuthed, user])

  useEffect(() => { load() }, [load])

  const toggleFollow = async () => {
    try {
      const res = await post(`/follows/${userId}`)
      setFollows((f) => ({ ...f, following: res.following, followers: f.followers + (res.following ? 1 : -1) }))
      toast.success(res.following ? 'Following' : 'Unfollowed')
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const openFollowList = async (kind) => {
    if (!isAuthed) { toast.info('Log in to view followers'); return }
    setFollowModal(kind)
    setFollowList([])
    try {
      const res = await get(`/follows/${kind}`, { userId })
      const users = await Promise.allSettled((res || []).map((id) => get(`/users/${id}`)))
      setFollowList(users.filter((x) => x.status === 'fulfilled').map((x) => x.value))
    } catch (err) { toast.error(errMsg(err)) }
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
      setBookModal(false)
      toast.success('Booking request sent!')
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    try {
      await post('/reviews', { targetUserId: userId, targetType: 'Model', rating: Number(revForm.rating), title: revForm.title, comment: revForm.comment })
      toast.success('Review submitted')
      load()
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  if (loading) return <PageLoader />
  if (!data) return <EmptyState title="Profile not found" message="This model profile doesn't exist." />

  const toggleRoster = async () => {
    if (!user?.id || !profile || rosterBusy) return
    setRosterBusy(true)
    try {
      if (inRoster) {
        await del(`/roster/${userId}`)
        setInRoster(false)
        toast.success('Removed from roster')
      } else {
        const limit = sub.limit('roster')
        if (limit !== null) {
          const cnt = await get('/roster/count')
          if (cnt?.count >= limit) {
            toast.error(`Roster limit (${limit}) reached — upgrade your plan for more`)
            return
          }
        }
        await post('/roster', { modelUserId: userId })
        setInRoster(true)
        toast.success('Added to roster')
      }
    } catch (err) { toast.error(errMsg(err)) } finally { setRosterBusy(false) }
  }

  const profile = data.profile
  const modelUser = data.user
  const spec = parseList(profile.specialties)
  const langs = parseList(profile.languages)
  const portfolioItems = portfolio?.data || []
  const reviewList = reviews?.data || []
  const isOwn = isAuthed && user.id === profile.userId

  return (
    <div className="mp">
      {/* Cover */}
      <div className="mp-cover">
        {modelUser.coverImageUrl ? <img src={assetUrl(modelUser.coverImageUrl)} alt="" /> : <div className="mp-cover-fallback" />}
      </div>

      <div className="container">
        <div className="mp-head">
          <div className="mp-avatar-wrap">
            {modelUser.profilePictureUrl ? <img src={assetUrl(modelUser.profilePictureUrl)} alt={modelUser.displayName} /> : <span>{profile.firstName?.[0]}{profile.lastName?.[0]}</span>}
          </div>
          <div className="mp-head-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1>{profile.firstName} {profile.lastName}</h1>
              {modelUser.verificationLevel === 'IdentityVerified' && <span className="badge badge-green"><Check size={13} /> Verified</span>}
            </div>
            <p style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <MapPin size={14} /> {profile.city}{profile.country ? `, ${profile.country}` : ''} · {profile.experienceLevel || 'Model'}
            </p>
            <div className="mp-stats">
              <span><Star size={16} color="var(--gold)" /> {profile.averageRating?.toFixed(1) || 'New'} <small>({profile.reviewCount || 0} reviews)</small></span>
              <span><Briefcase size={16} /> {profile.totalBookings || 0} bookings</span>
              <span><Eye size={16} /> {profile.portfolioViews || 0} views</span>
              <button className="mp-stat-link" onClick={() => openFollowList('followers')}><Users size={16} /> {follows.followers} followers</button>
              <button className="mp-stat-link" onClick={() => openFollowList('following')}><Users size={16} /> {follows.followingCount} following</button>
            </div>
          </div>
          <div className="mp-actions">
            {!isOwn && (
              <>
                <button className="btn btn-outline" onClick={toggleFollow}>
                  {follows.following ? <><Check size={16} /> Following</> : 'Follow'}
                </button>
                <Link to={isAuthed ? `/messages?to=${userId}` : '/login'} className="btn btn-outline"><MessageCircle size={16} /> Message</Link>
                {isAgency && (
                  <button className={`btn ${inRoster ? 'btn-ghost' : 'btn-outline'}`} onClick={toggleRoster} disabled={rosterBusy}>
                    {rosterBusy ? '…' : inRoster ? <><Check size={16} /> In roster</> : <><Users size={16} /> Add to roster</>}
                  </button>
                )}
                {isBusiness && <button className="btn btn-primary" onClick={() => setBookModal(true)}>Book now</button>}
              </>
            )}
            {isOwn && (
              <>
                {sub.can('boost') && (
                  <button className="btn btn-outline" onClick={boostProfile} disabled={boosted}>
                    <Zap size={16} /> {boosted ? 'Spotlighted' : `Spotlight profile${boostRemaining > 0 ? ` (${boostRemaining} left)` : ''}`}
                  </button>
                )}
                <Link to="/profile" className="btn btn-primary">Edit profile</Link>
              </>
            )}
          </div>
        </div>

        <div className="mp-body">
          {/* Left column */}
          <div className="mp-main">
            <section className="mp-card">
              <h2>About</h2>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7 }}>
                {modelUser.bio || `${profile.firstName} is a ${profile.experienceLevel || 'professional'} model based in ${profile.city || '—'} specializing in ${spec.join(', ') || 'a range of styles'}.`}
              </p>
              <div className="mp-specs">
                {[
                  ['Height', profile.height ? `${profile.height} cm` : '—'],
                  ['Weight', profile.weight ? `${profile.weight} kg` : '—'],
                  ['Eye color', profile.eyeColor || '—'],
                  ['Hair', profile.hairColor || '—'],
                  ['Body type', profile.bodyType || '—'],
                  ['Experience', `${profile.yearsOfExperience || 0} yrs`],
                ].map(([l, v]) => (
                  <div key={l} className="mp-spec"><span>{l}</span><strong>{v}</strong></div>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                {spec.map((s) => <span key={s} className="badge">{s}</span>)}
              </div>
              {langs.length > 0 && (
                <p style={{ color: 'var(--text-faint)', fontSize: 13.5, marginTop: 14 }}>Languages: {langs.join(', ')}</p>
              )}
            </section>

            {/* Rate */}
            <section className="mp-card">
              <h2>Rates</h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  ['Daily rate', profile.dailyRate],
                  ['Hourly rate', profile.hourlyRate],
                ].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l} className="rate-box">
                    <span>{l}</span>
                    <strong>{v} <small>{profile.currency || 'USD'}</small></strong>
                  </div>
                ))}
                <div className="rate-box rate-box-travel">
                  <span>Travel</span>
                  <strong>{profile.availableForTravel ? 'Available' : 'Not available'}</strong>
                </div>
              </div>
            </section>

            {/* Portfolio */}
            <section className="mp-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Portfolio</h2>
                <Link to={`/portfolio/${profile.userId}`} className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>
              </div>
              {portfolioItems.length === 0 ? (
                <EmptyState title="No portfolio yet" message="This model hasn't published any work." />
              ) : (
                <div className="mp-port-grid">
                  {portfolioItems.slice(0, 6).map((p) => (
                    <Link key={p.id} to={`/portfolio/${profile.userId}`} className="mp-port-item">
                      {p.media?.length > 0 ? <img src={assetUrl(p.media[0].url || p.media[0].filePath)} alt={p.title} /> : <span className="mp-port-fallback">{p.title[0]}</span>}
                      <div className="mp-port-overlay">
                        <span><Heart size={14} /> {p.likesCount}</span>
                        <span><Eye size={14} /> {p.viewsCount}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Posts */}
            <section className="mp-card">
              <h2>Posts</h2>
              {posts.length === 0 ? (
                <EmptyState title="No posts yet" message="This model hasn't published any posts." />
              ) : (
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
              )}
            </section>

            {/* Reviews */}
            <section className="mp-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Reviews</h2>
                {!isOwn && <button className="btn btn-outline btn-sm" onClick={() => isAuthed ? setRevForm((f) => ({ ...f, open: true })) : toast.info('Log in to review')}>Write a review</button>}
              </div>
              {revForm.open && (
                <form className="rev-form" onSubmit={submitReview}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button type="button" key={n} onClick={() => setRevForm((f) => ({ ...f, rating: n }))}
                        style={{ background: 'none', border: 'none', fontSize: 22, color: n <= revForm.rating ? 'var(--gold)' : 'rgba(255,255,255,0.15)' }}>★</button>
                    ))}
                  </div>
                  <div className="field"><input placeholder="Review title" value={revForm.title} onChange={(e) => setRevForm({ ...revForm, title: e.target.value })} /></div>
                  <div className="field"><textarea placeholder="Share your experience…" value={revForm.comment} onChange={(e) => setRevForm({ ...revForm, comment: e.target.value })} /></div>
                  <button className="btn btn-primary btn-sm">Submit review</button>
                </form>
              )}
              {reviewList.length === 0 ? (
                <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>No reviews yet.</p>
              ) : (
                reviewList.map((r) => (
                  <div key={r.id} className="rev-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong style={{ fontSize: 14.5 }}>{r.title || 'Review'}</strong>
                      <StarRating rating={r.rating} />
                    </div>
                    <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{r.comment}</p>
                    <small style={{ color: 'var(--text-faint)', fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString()}</small>
                  </div>
                ))
              )}
            </section>
          </div>

          {/* Right column */}
          <div className="mp-side">
            <div className="mp-card">
              <h2>Booking info</h2>
              <ul className="mp-info-list">
                <li><span><Camera size={16} /> Experience</span><strong>{profile.experienceLevel || '—'}</strong></li>
                <li><span><Calendar size={16} /> Work region</span><strong>{profile.workRegion || '—'}</strong></li>
                <li><span><Check size={16} /> Agency rep</span><strong>{profile.agencyRepresentation ? 'Yes' : 'No'}</strong></li>
                <li><span><MapPin size={16} /> Travel</span><strong>{profile.availableForTravel ? 'Yes' : 'No'}</strong></li>
              </ul>
              {isBusiness && (
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setBookModal(true)}>
                  <Calendar size={16} /> Request booking
                </button>
              )}
            </div>
            <div className="mp-card">
              <h2>Share</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {[Share2, MessageCircle, Heart].map((I, i) => (
                  <button key={i} className="mp-share-btn"><I size={17} /></button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking modal */}
      <Modal open={bookModal} onClose={() => setBookModal(false)} title={`Book ${profile.firstName}`}>
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

      {/* Followers / following modal */}
      <Modal open={!!followModal} onClose={() => setFollowModal(null)} title={followModal === 'followers' ? 'Followers' : 'Following'} width={460}>
        {followList.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: 24 }}>No users yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {followList.map((u2) => (
              <Link key={u2.id} to={`/u/${u2.id}`} onClick={() => setFollowModal(null)} className="booking-row" style={{ textDecoration: 'none', color: 'inherit', padding: '8px 0' }}>
                <span className="booking-icon">{u2.profilePictureUrl ? <img src={assetUrl(u2.profilePictureUrl)} alt="" style={{ width: 34, height: 34, borderRadius: 50, objectFit: 'cover' }} /> : <Users size={16} />}</span>
                <div style={{ flex: 1 }}><strong style={{ fontSize: 14 }}>{u2.displayName || u2.userName}</strong></div>
              </Link>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
