import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet, Briefcase, MessageCircle, Star, TrendingUp, ShieldCheck, Sparkles,
  ArrowUpRight, Search, BadgeCheck, Award, Megaphone, Camera, Lightbulb, Users, FileText, Bell, Lock, Crown, BrainCircuit,
} from 'lucide-react'
import { get, assetUrl } from '../api/client'
import { useAuth, displayName } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { PageLoader } from '../components/ui'
import './Dashboard.css'

export default function Dashboard() {
  const { user, hasRole } = useAuth()
  const sub = useSubscription()
  const [stats, setStats] = useState({ bookings: 0, activeBookings: 0, notifications: 0, unreadMsgs: 0, applications: 0, castings: 0, newApplications: 0 })
  const [rating, setRating] = useState(null)
  const [newAppsByCasting, setNewAppsByCasting] = useState([])
  const [bookings, setBookings] = useState([])
  const [advice, setAdvice] = useState([])
  const [matches, setMatches] = useState([])
  const [myCastings, setMyCastings] = useState([])
  const [openCastings, setOpenCastings] = useState([])
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)

  const isModel = hasRole('Model')
  const isBrand = hasRole('Brand')
  const isAgency = hasRole('Agency')
  const business = isBrand || isAgency

  useEffect(() => {
    const load = async () => {
      if (!user?.id) { setLoading(false); return }
      const profileType = isModel ? 'Model' : isBrand ? 'Brand' : isAgency ? 'Agency' : null
      try {
        const common = Promise.allSettled([
          get('/bookings', { pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
          get('/notifications', { pageSize: 5 }),
          get('/wallet').catch(() => null),
          get('/chat/conversations').catch(() => []),
          profileType ? get('/reviews', { targetUserId: user.id, targetType: profileType }).catch(() => null) : Promise.resolve(null),
        ])
        const roleCalls = isModel
          ? Promise.allSettled([
              get('/ai/career-advice'),
              get('/ai/model-matches', { count: 4 }),
              get('/castings/my-applications', { pageSize: 5 }),
              get('/castings', { pageSize: 4, status: 'Open' }),
            ])
          : business
            ? Promise.allSettled([
                get('/castings/my', { pageSize: 5 }),
                get('/campaigns/my', { pageSize: 5 }),
              ])
            : Promise.resolve()
        const [[b, n, w, conv, rev], role] = await Promise.all([common, roleCalls])
        if (b.status === 'fulfilled') {
          setBookings(b.value.data || [])
          setStats((s) => ({ ...s, bookings: b.value.total || 0, activeBookings: (b.value.data || []).filter((x) => ['Pending', 'Confirmed', 'InProgress'].includes(x.status)).length }))
        }
        if (n.status === 'fulfilled') setStats((s) => ({ ...s, notifications: n.value.total || 0 }))
        if (w.status === 'fulfilled' && w.value) setWallet(w.value)
        if (conv.status === 'fulfilled' && Array.isArray(conv.value)) {
          setStats((s) => ({ ...s, unreadMsgs: conv.value.reduce((sum, c) => sum + (c.unreadCount || 0), 0) }))
        }
        if (rev.status === 'fulfilled' && rev.value?.averageRating != null) setRating(rev.value.averageRating)
        if (role) {
          if (isModel) {
            if (role[0]?.status === 'fulfilled') setAdvice(role[0].value.data || [])
            if (role[1]?.status === 'fulfilled') setMatches(role[1].value.data || [])
            if (role[2]?.status === 'fulfilled') {
              setStats((s) => ({ ...s, applications: role[2].value.total || 0 }))
            }
            if (role[3]?.status === 'fulfilled') setOpenCastings(role[3].value.data || [])
          } else if (business) {
            if (role[0]?.status === 'fulfilled') {
              const mine = role[0].value.data || []
              setMyCastings(mine)
              setStats((s) => ({ ...s, castings: role[0].value.total || 0 }))
              const pendCalls = await Promise.allSettled(mine.slice(0, 5).map((c) => get(`/castings/${c.id}/applications`, { status: 'Pending', pageSize: 1 })))
              const newCount = pendCalls.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value.total || 0 : 0), 0)
              setStats((s) => ({ ...s, newApplications: newCount }))
              setNewAppsByCasting(mine.slice(0, 4).map((c, i) => ({ casting: c, pending: pendCalls[i]?.status === 'fulfilled' ? pendCalls[i].value.total || 0 : 0 })))
            }
          }
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, isModel, isBrand, isAgency, business])

  if (loading) return <PageLoader />
  if (!user) return <PageLoader />

  const statusBadge = (s) => {
    const map = { Pending: 'badge-gold', Confirmed: 'badge', InProgress: 'badge', Completed: 'badge-green', Cancelled: 'badge-red', Shortlisted: 'badge', Accepted: 'badge-green', Rejected: 'badge-red' }
    return `badge ${map[s] || 'badge-gray'}`
  }

  const balance = wallet?.balance ?? user.walletBalance ?? 0

  const statCards = isModel
    ? [
        { icon: Briefcase, label: 'My bookings', value: stats.bookings, to: '/my-bookings' },
        { icon: Camera, label: 'Castings applied', value: stats.applications, to: '/my-castings' },
        { icon: Star, label: 'My rating', value: rating != null ? `${rating} ★` : '—', to: '/profile' },
        { icon: MessageCircle, label: 'Unread messages', value: stats.unreadMsgs, to: '/messages' },
      ]
    : business
      ? [
          { icon: Camera, label: 'My castings', value: stats.castings, to: '/my-castings' },
          { icon: Users, label: 'New applications', value: stats.newApplications, to: '/my-castings' },
          { icon: Briefcase, label: 'Bookings', value: stats.bookings, to: '/my-bookings' },
          { icon: Star, label: 'My rating', value: rating != null ? `${rating} ★` : '—', to: '/profile' },
        ]
      : [
          { icon: Briefcase, label: 'Bookings', value: stats.bookings, to: '/my-bookings' },
          { icon: Bell, label: 'Notifications', value: stats.notifications, to: '/notifications' },
          { icon: MessageCircle, label: 'Unread messages', value: stats.unreadMsgs, to: '/messages' },
          { icon: Wallet, label: 'Wallet', value: `$${Number(balance || 0).toLocaleString()}`, to: '/wallet' },
        ]

  return (
    <div className="container" style={{ padding: '40px 24px 70px' }}>
      {/* Greeting */}
      <div className="dash-greet fade-up">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user.profilePictureUrl ? (
            <img src={assetUrl(user.profilePictureUrl)} alt={displayName(user)} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(139,92,246,0.4)', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--primary-2)', border: '3px solid rgba(139,92,246,0.4)', flexShrink: 0 }}>
              {displayName(user).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <span className="badge" style={{ marginBottom: 10 }}>Dashboard</span>
            <h1>Welcome back, <span className="grad-text">{displayName(user)}</span></h1>
            <p style={{ color: 'var(--text-dim)', marginTop: 6 }}>
              {isModel ? "Here's what's happening with your career — jobs, matches and AI coaching."
                : business ? "Here's your hiring hub — castings, talent and brand intelligence."
                : "Here's what's happening with your account today."}
            </p>
          </div>
        </div>
        <div className="dash-balance">
          <Wallet size={20} />
          <div>
            <small>Wallet balance</small>
            <strong>${Number(balance || 0).toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Plan banner */}
      <div className={`dash-plan ${sub.isActive ? 'on' : ''}`} style={{ margin: '22px 0 0' }}>
        <span className="dash-plan-icon">{sub.isActive ? <Crown size={18} /> : <Lock size={18} />}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {sub.status === 'pending' && (
            <>
              <strong style={{ fontSize: 15 }}>{sub.sub?.planName} subscription is under review</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 3 }}>Paid features unlock as soon as your payment is approved.</p>
            </>
          )}
          {sub.isActive && (
            <>
              <strong style={{ fontSize: 15 }}>{sub.plan?.name} plan active</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 3 }}>
                {sub.plan?.name === 'Starter' ? 'You are on the free plan — upgrade to unlock paid features.' : `All ${sub.plan?.name} features are unlocked. Renews ${new Date(sub.sub?.endDate || sub.sub?.expiresAt).toLocaleDateString()}.`}
              </p>
            </>
          )}
          {(sub.status === 'none' || sub.status === 'cancelled' || sub.status === 'expired') && (
            <>
              <strong style={{ fontSize: 15 }}>Free {sub.plan?.name} plan</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 3 }}>
                Unlock unlimited applications, Prediction Lab, Social Media Hub and more with a paid plan.
              </p>
            </>
          )}
        </div>
        {sub.isActive && sub.plan?.name !== 'Starter' && (
          <Link to="/plans" className="btn btn-ghost btn-sm">Manage plan</Link>
        )}
        {!sub.isActive && (
          <Link to="/plans" className="btn btn-primary btn-sm"><Sparkles size={14} /> Upgrade</Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid-auto grid-4" style={{ margin: '26px 0' }}>
        {statCards.map((s) => (
          <Link key={s.label} to={s.to} className="dash-stat">
            <span className="dash-stat-icon"><s.icon size={20} /></span>
            <div>
              <strong>{s.value}</strong>
              <small>{s.label}</small>
            </div>
            <ArrowUpRight size={16} className="dash-stat-arrow" />
          </Link>
        ))}
      </div>

      <div className="dash-grid">
        {/* Quick actions */}
        <div className="card dash-panel">
          <h2>Quick actions</h2>
          <div className="dash-actions">
            {isModel && (
              <>
                <Link to="/explore" className="dash-action"><Star size={18} /> Discover work</Link>
                <Link to="/castings" className="dash-action"><Briefcase size={18} /> Browse castings</Link>
                <Link to="/ai-predictions" className="dash-action"><BrainCircuit size={18} /> Prediction Lab</Link>
                <Link to="/my-portfolio" className="dash-action"><Camera size={18} /> Manage portfolio</Link>
              </>
            )}
            {business && (
              <>
                <Link to="/my-castings" className="dash-action"><Camera size={18} /> Post a casting</Link>
                <Link to="/my-campaigns" className="dash-action"><Megaphone size={18} /> Manage campaigns</Link>
                <Link to="/explore" className="dash-action"><Search size={18} /> Find talent</Link>
                <Link to="/ai-predictions" className="dash-action"><BrainCircuit size={18} /> Prediction Lab</Link>
              </>
            )}
            <Link to="/wallet" className="dash-action"><Wallet size={18} /> Wallet & payments</Link>
            <Link to="/messages" className="dash-action"><MessageCircle size={18} /> Messages</Link>
            <Link to="/profile" className="dash-action"><ShieldCheck size={18} /> Edit my profile</Link>
            <Link to="/marketplace" className="dash-action"><TrendingUp size={18} /> Marketplace</Link>
            <Link to="/support" className="dash-action"><FileText size={18} /> Support</Link>
          </div>
        </div>

        {/* Recent bookings */}
        <div className="card dash-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Recent bookings</h2>
            <Link to="/my-bookings" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {bookings.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '30px 0' }}>No bookings yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bookings.map((b) => (
                <div key={b.id} className="dash-booking">
                  <div>
                    <strong style={{ fontSize: 14.5 }}>{b.projectName || `Booking #${b.id}`}</strong>
                    <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12.5 }}>{b.location || '—'} · {b.agreedFee ? `$${b.agreedFee}` : 'Fee TBD'}</small>
                  </div>
                  <span className={statusBadge(b.status)}>{b.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Model: AI career advice */}
        {isModel && (
          <div className="card dash-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span className="dash-ai-icon"><Lightbulb size={20} /></span>
              <h2 style={{ margin: 0 }}>AI career coach</h2>
            </div>
            {advice.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 13.5, padding: '10px 0' }}>Your personalized advice will appear here.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {advice.slice(0, 4).map((a) => (
                  <div key={a.id} className="dash-booking">
                    <div>
                      <strong style={{ fontSize: 13.5 }}>{a.title}</strong>
                      <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{a.content}</small>
                    </div>
                    <span className="badge badge">{a.adviceCategory}</span>
                  </div>
                ))}
              </div>
            )}
            <Link to="/ai-predictions" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>Open Prediction Lab</Link>
          </div>
        )}

        {/* Model: matches */}
        {isModel && (
          <div className="card dash-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span className="dash-ai-icon" style={{ background: 'rgba(236,72,153,0.15)' }}><BadgeCheck size={20} /></span>
              <h2 style={{ margin: 0 }}>Best matches</h2>
            </div>
            {matches.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 13.5, padding: '10px 0' }}>No brand matches yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {matches.map((m) => (
                  <div key={m.id} className="dash-booking">
                    <div>
                      <strong style={{ fontSize: 13.5 }}>{m.brandName || m.brandUserId || 'Brand'}</strong>
                      <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{m.score != null ? `Match ${Math.round(m.score * 100)}%` : 'AI-ranked'}</small>
                    </div>
                    <span className="badge badge-green">{m.status || 'Match'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Business: my castings */}
        {business && (
          <div className="card dash-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span className="dash-ai-icon"><Camera size={20} /></span>
              <h2 style={{ margin: 0 }}>My castings</h2>
            </div>
            {myCastings.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 13.5, padding: '10px 0' }}>Post a casting call to find models.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myCastings.slice(0, 4).map((c) => (
                  <div key={c.id} className="dash-booking">
                    <div>
                      <strong style={{ fontSize: 13.5 }}>{c.title}</strong>
                      <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{c.currentApplications || 0}/{c.maxApplications || '∞'} applications</small>
                    </div>
                    <span className={statusBadge(c.status)}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
            <Link to="/my-castings" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>Manage castings</Link>
          </div>
        )}

        {/* Business: new applications */}
        {business && (
          <div className="card dash-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span className="dash-ai-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><Users size={20} /></span>
              <h2 style={{ margin: 0 }}>New applications</h2>
              {stats.newApplications > 0 && <span className="badge badge-gold">{stats.newApplications} pending</span>}
            </div>
            {newAppsByCasting.length === 0 || stats.newApplications === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 13.5, padding: '10px 0' }}>No pending applications right now.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {newAppsByCasting.filter((x) => x.pending > 0).map((x) => (
                  <div key={x.casting.id} className="dash-booking">
                    <div>
                      <strong style={{ fontSize: 13.5 }}>{x.casting.title}</strong>
                      <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{x.pending} new · review to shortlist</small>
                    </div>
                    <Link to="/my-castings" className="btn btn-outline btn-sm">Review</Link>
                  </div>
                ))}
              </div>
            )}
            <Link to="/my-castings" className="btn btn-outline btn-sm" style={{ marginTop: 14 }}>Review all applications</Link>
          </div>
        )}

        {/* Model: open castings */}
        {isModel && (
          <div className="card dash-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span className="dash-ai-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><Users size={20} /></span>
              <h2 style={{ margin: 0 }}>Fresh opportunities</h2>
            </div>
            {openCastings.length === 0 ? (
              <p style={{ color: 'var(--text-faint)', fontSize: 13.5, padding: '10px 0' }}>No open castings right now.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {openCastings.map((c) => (
                  <Link to={`/casting/${c.id}`} key={c.id} className="dash-booking" style={{ textDecoration: 'none' }}>
                    <div>
                      <strong style={{ fontSize: 13.5 }}>{c.title}</strong>
                      <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{c.location || 'Remote'} · {c.isPaid ? 'Paid' : 'Collab'}</small>
                    </div>
                    <span className="badge badge-green">Apply</span>
                  </Link>
                ))}
              </div>
            )}
            <Link to="/castings" className="btn btn-outline btn-sm" style={{ marginTop: 14 }}>Browse all</Link>
          </div>
        )}
      </div>

      {/* Bottom banner */}
      <div className="card dash-panel" style={{ marginTop: 24, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.08))', borderColor: 'rgba(139,92,246,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="dash-ai-icon"><Award size={22} /></span>
            <div>
              <strong style={{ fontSize: 15 }}>{isModel ? 'Your AI Prediction Lab is ready' : business ? 'Grow with AI-powered insights' : 'AI-powered platform'}</strong>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 2 }}>
                {isModel ? 'Portfolio score, match predictions, career growth and rate suggestions — powered by ML.'
                  : business ? 'Casting success, client risk, fraud detection and content scoring.'
                  : 'Everything is powered by ML models for ranking, pricing and fraud detection.'}
              </p>
            </div>
          </div>
          <Link to="/ai-predictions" className="btn btn-primary">Open Prediction Lab <ArrowUpRight size={16} /></Link>
        </div>
      </div>
    </div>
  )
}
