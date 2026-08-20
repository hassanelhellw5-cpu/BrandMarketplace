import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Users, Star, Globe, Building2, CalendarDays, Megaphone, Briefcase, Check, MessageCircle, ArrowRight, CalendarRange, DollarSign, Eye, Heart } from 'lucide-react'
import { get, post, errMsg, assetUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState, StarRating } from '../components/ui'
import Modal from '../components/Modal'
import './ModelProfile.css'

const statusBadge = (s) => {
  const map = { Draft: 'badge-gray', Open: 'badge-green', Active: 'badge-green', Closed: 'badge-gray', Completed: 'badge', Cancelled: 'badge-red', Published: 'badge-green', SoldOut: 'badge-gold' }
  return `badge ${map[s] || 'badge-gray'}`
}

const parseCats = (c) => {
  if (!c) return []
  try { const arr = JSON.parse(c); return Array.isArray(arr) ? arr : [] } catch { return c ? [c] : [] }
}

export default function BrandProfile() {
  const { userId } = useParams()
  const { isAuthed, user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [role, setRole] = useState('')
  const [castings, setCastings] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [events, setEvents] = useState([])
  const [posts, setPosts] = useState([])
  const [reviews, setReviews] = useState([])
  const [follows, setFollows] = useState({ following: false, followers: 0, followingCount: 0 })
  const [followModal, setFollowModal] = useState(null)
  const [followList, setFollowList] = useState([])
  const [followLoading, setFollowLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [brand, agency] = await Promise.allSettled([
        get('/profiles/brand', { userId }),
        get('/profiles/agency', { userId }),
      ])
      if (brand.status === 'fulfilled') { setData(brand.value); setRole('Brand') }
      else if (agency.status === 'fulfilled') { setData(agency.value); setRole('Agency') }

      const [cast, camp, evs, pos, rev] = await Promise.allSettled([
        get('/castings', { brandUserId: userId, pageSize: 30 }),
        get('/campaigns', { brandUserId: userId, pageSize: 30 }),
        get('/events', { brandUserId: userId, pageSize: 30 }),
        get('/posts', { userId, pageSize: 30 }),
        get('/reviews', { targetUserId: userId, pageSize: 10 }),
      ])
      if (cast.status === 'fulfilled') setCastings(cast.value.data || [])
      if (camp.status === 'fulfilled') setCampaigns(camp.value.data || [])
      if (evs.status === 'fulfilled') setEvents(evs.value.data || [])
      if (pos.status === 'fulfilled') setPosts(pos.value.data || [])
      if (rev.status === 'fulfilled') setReviews(rev.value.data || [])

      const [c, fl] = await Promise.allSettled([
        get('/follows/counts', { userId }),
        isAuthed ? get('/follows/following', { userId }) : Promise.resolve(null),
      ])
      const counts = c.status === 'fulfilled' ? c.value : { followers: 0, following: 0 }
      const followingList = fl.status === 'fulfilled' && fl.value ? fl.value : []
      setFollows({ following: isAuthed && followingList.includes(user.id), followers: counts.followers || 0, followingCount: counts.following || 0 })
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [userId, isAuthed, user])

  useEffect(() => { load() }, [load])

  const toggleFollow = async () => {
    if (!isAuthed) { toast.info('Log in to follow this profile'); return }
    try {
      const res = await post(`/follows/${userId}`)
      setFollows((f) => ({ ...f, following: res.following, followers: f.followers + (res.following ? 1 : -1) }))
      toast.success(res.following ? 'Following' : 'Unfollowed')
    } catch (err) { toast.error(errMsg(err)) }
  }

  const openFollowList = async (kind) => {
    if (!isAuthed) { toast.info('Log in to view followers'); return }
    setFollowModal(kind)
    setFollowList([])
    setFollowLoading(true)
    try {
      const res = await get(`/follows/${kind}`, { userId })
      const ids = res || []
      const users = await Promise.allSettled(ids.map((id) => get(`/users/${id}`)))
      setFollowList(users.filter((x) => x.status === 'fulfilled').map((x) => x.value))
    } catch (err) { toast.error(errMsg(err)) } finally { setFollowLoading(false) }
  }

  if (loading) return <PageLoader />
  if (!data) return <EmptyState title="Profile not found" message="This brand profile doesn't exist." />

  const profile = data.profile
  const u = data.user
  const displayName = u?.displayName || profile?.companyName || profile?.agencyName || role
  const city = profile?.city || ''
  const country = profile?.country || ''
  const description = profile?.description || u?.bio || ''
  const avatarUrl = u?.profilePictureUrl || profile?.logoUrl
  const coverUrl = u?.coverImageUrl || profile?.coverImageUrl
  const isOwn = isAuthed && user?.id === userId
  const reviewList = reviews || []
  const website = profile?.website

  return (
    <div className="mp">
      <div className="mp-cover">
        {coverUrl ? <img src={assetUrl(coverUrl)} alt="" /> : <div className="mp-cover-fallback" />}
      </div>

      <div className="container">
        <div className="mp-head">
          <div className="mp-avatar-wrap">
            {avatarUrl ? <img src={assetUrl(avatarUrl)} alt={displayName} /> : <span>{displayName?.[0]}</span>}
          </div>
          <div className="mp-head-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1>{displayName}</h1>
              <span className="badge">{role}</span>
              {u?.verificationLevel === 'IdentityVerified' && <span className="badge badge-green"><Check size={13} /> Verified</span>}
            </div>
            <p style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <MapPin size={14} /> {city || '—'}{country ? `, ${country}` : ''}
              {profile?.industry ? ` · ${profile.industry}` : ''}
            </p>
            <div className="mp-stats">
              <span><Users size={16} /> {follows.followers} followers</span>
              <button className="mp-stat-link" onClick={() => openFollowList('following')}><Users size={16} /> {follows.followingCount} following</button>
              <span><Briefcase size={16} /> {castings.length} castings</span>
              <span><Megaphone size={16} /> {campaigns.length} campaigns</span>
            </div>
          </div>
          <div className="mp-actions">
            {!isOwn && (
              <>
                <button className="btn btn-outline" onClick={toggleFollow}>
                  {follows.following ? <><Check size={16} /> Following</> : 'Follow'}
                </button>
                <Link to={isAuthed ? `/messages?to=${userId}` : '/login'} className="btn btn-outline"><MessageCircle size={16} /> Message</Link>
              </>
            )}
            {isOwn && <Link to="/profile" className="btn btn-primary">Edit profile</Link>}
          </div>
        </div>

        <div className="mp-body">
          <div className="mp-main">
            <section className="mp-card">
              <h2>About</h2>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7 }}>{description || `A ${role.toLowerCase()} on BrandMarketplace.`}</p>
              <div className="mp-specs">
                {[
                  ['Industry', profile?.industry || '—'],
                  ['Founded', profile?.yearFounded || '—'],
                  ['Company size', profile?.companySize ? `${profile.companySize} people` : '—'],
                ].map(([l, v]) => (
                  <div key={l} className="mp-spec"><span>{l}</span><strong>{v}</strong></div>
                ))}
              </div>
              {website && (
                <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ marginTop: 14 }}>
                  <Globe size={14} /> {website}
                </a>
              )}
            </section>

            <section className="mp-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Castings</h2>
                {castings.length > 0 && <Link to="/castings" className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>}
              </div>
              {castings.length === 0 ? <EmptyState title="No castings yet" message="This brand hasn't posted any casting calls." /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {castings.slice(0, 8).map((c) => (
                    <Link key={c.id} to={`/casting/${c.id}`} className="booking-row" style={{ textDecoration: 'none', color: 'inherit', alignItems: 'flex-start' }}>
                      <span className="booking-icon"><Briefcase size={17} /></span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 15 }}>{c.title}</strong>
                        <div style={{ display: 'flex', gap: 16, color: 'var(--text-faint)', fontSize: 12.5, marginTop: 4, flexWrap: 'wrap' }}>
                          <span><MapPin size={12} /> {c.location || 'Remote'}</span>
                          {c.budget != null && <span><DollarSign size={12} /> ${c.budget}</span>}
                          <span><Users size={12} /> {c.currentApplications || 0} applied</span>
                        </div>
                      </div>
                      <span className={statusBadge(c.status)}>{c.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="mp-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Campaigns</h2>
                {campaigns.length > 0 && <Link to="/campaigns" className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>}
              </div>
              {campaigns.length === 0 ? <EmptyState title="No campaigns yet" message="This brand hasn't launched any campaigns." /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {campaigns.slice(0, 8).map((c) => (
                    <Link key={c.id} to={`/campaign/${c.id}`} className="booking-row" style={{ textDecoration: 'none', color: 'inherit', alignItems: 'flex-start' }}>
                      <span className="booking-icon"><Megaphone size={17} /></span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 15 }}>{c.name}</strong>
                        {c.objective && <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4 }}>{c.objective}</p>}
                        <div style={{ display: 'flex', gap: 16, color: 'var(--text-faint)', fontSize: 12.5, marginTop: 4, flexWrap: 'wrap' }}>
                          {c.budget != null && <span><DollarSign size={12} /> ${c.budget}</span>}
                          <span><Users size={12} /> {c.filledPositions || 0}/{c.requiredModelsCount || '∞'} filled</span>
                        </div>
                      </div>
                      <span className={statusBadge(c.status)}>{c.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="mp-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Events</h2>
                {events.length > 0 && <Link to="/events" className="btn btn-ghost btn-sm">View all <ArrowRight size={14} /></Link>}
              </div>
              {events.length === 0 ? <EmptyState title="No events yet" message="This brand hasn't organized any events." /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {events.slice(0, 8).map((e) => (
                    <Link key={e.id} to={`/event/${e.id}`} className="booking-row" style={{ textDecoration: 'none', color: 'inherit', alignItems: 'flex-start' }}>
                      <span className="booking-icon"><CalendarDays size={17} /></span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 15 }}>{e.title}</strong>
                        <div style={{ display: 'flex', gap: 16, color: 'var(--text-faint)', fontSize: 12.5, marginTop: 4, flexWrap: 'wrap' }}>
                          {e.startDate && <span><CalendarRange size={12} /> {new Date(e.startDate).toLocaleDateString()}</span>}
                          {e.location && <span><MapPin size={12} /> {e.location}</span>}
                        </div>
                      </div>
                      <span className={statusBadge(e.status)}>{e.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="mp-card">
              <h2>Posts</h2>
              {posts.length === 0 ? <EmptyState title="No posts yet" message="This brand hasn't published any posts." /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {posts.slice(0, 10).map((p) => (
                    <div key={p.id} className="card" style={{ padding: 14 }}>
                      <p style={{ color: 'var(--text-dim)', fontSize: 14.5, lineHeight: 1.6 }}>{p.content || <em style={{ color: 'var(--text-faint)' }}>(media post)</em>}</p>
                      {p.mediaUrls && parseCats(p.mediaUrls).length > 0 && (
                        <img src={assetUrl(parseCats(p.mediaUrls)[0])} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 10, marginTop: 10 }} />
                      )}
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

            <section className="mp-card">
              <h2>Reviews</h2>
              {reviewList.length === 0 ? <EmptyState title="No reviews yet" message="No one has reviewed this brand yet." /> : (
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

          <div className="mp-side">
            <div className="mp-card">
              <h2>Details</h2>
              <ul className="mp-info-list">
                <li><span><Building2 size={16} /> Type</span><strong>{role}</strong></li>
                <li><span><Globe size={16} /> Website</span><strong>{website || '—'}</strong></li>
                <li><span><MapPin size={16} /> Location</span><strong>{city || '—'}{country ? `, ${country}` : ''}</strong></li>
                <li><span><Users size={16} /> Followers</span><strong>{follows.followers}</strong></li>
                <li><span><Star size={16} /> Rating</span><strong>{reviewList.length ? `${(reviewList.reduce((a, r) => a + (r.rating || 0), 0) / reviewList.length).toFixed(1)} ★` : 'New'}</strong></li>
              </ul>
            </div>
            <div className="mp-card">
              <h2>Followers</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginBottom: 12 }}>See who follows this {role.toLowerCase()} and who they follow.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openFollowList('followers')}>{follows.followers} followers</button>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openFollowList('following')}>{follows.followingCount} following</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Followers / following modal */}
      <Modal open={!!followModal} onClose={() => setFollowModal(null)} title={followModal === 'followers' ? 'Followers' : 'Following'} width={460}>
        {followLoading ? <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: 24 }}>Loading…</p>
          : followList.length === 0 ? <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: 24 }}>No users yet.</p>
            : (
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
