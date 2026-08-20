import { useState, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { BarChart3, Eye, MousePointerClick, Star, Users, Wallet, CheckCircle2, TrendingUp, DollarSign, Calendar, Zap, Target, ArrowUpRight, ArrowDownRight, Activity, Award, Clock, Globe, Camera, Megaphone, Briefcase } from 'lucide-react'
import { get } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PageLoader, EmptyState } from '../components/ui'

const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#F97316', '#06B6D4', '#EF4444']

function AnimatedNumber({ value, suffix = '', prefix = '' }) {
  const num = Number(value) || 0
  return <span style={{ fontWeight: 800, fontSize: 22 }}>{prefix}{num.toLocaleString()}{suffix && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-dim)' }}> {suffix}</span>}</span>
}

function StatCard({ icon: Icon, label, value, suffix, color, trend, trendLabel }) {
  const trendUp = trend > 0
  return (
    <div className="card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: `${color}08` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: `${color}15`, display: 'grid', placeItems: 'center', color }}>
          <Icon size={18} />
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{label}</span>
      </div>
      <AnimatedNumber value={value} suffix={suffix} />
      {trend != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, color: trendUp ? '#10B981' : '#EF4444' }}>
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{trendUp ? '+' : ''}{trend}%</span>
          {trendLabel && <span style={{ color: 'var(--text-faint)' }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}

function ChartCard({ title, children, height = 260 }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 15, margin: '0 0 16px' }}>{title}</h3>
      <div style={{ height }}>{children}</div>
    </div>
  )
}

function InsightCard({ icon: Icon, title, text, color = 'var(--primary)' }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 16px', borderRadius: 12, background: `${color}08`, border: `1px solid ${color}15` }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'grid', placeItems: 'center', color, flexShrink: 0 }}>
        <Icon size={16} />
      </span>
      <div>
        <strong style={{ fontSize: 13.5, display: 'block', marginBottom: 2 }}>{title}</strong>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>{text}</p>
      </div>
    </div>
  )
}

function FunnelStep({ label, value, prevValue, color, icon: Icon }) {
  const pct = prevValue && value ? Math.round((value / prevValue) * 100) : null
  return (
    <div style={{ textAlign: 'center', padding: '18px 12px', borderRadius: 14, background: `${color}08`, border: `1px solid ${color}15`, position: 'relative' }}>
      <Icon size={20} style={{ color, marginBottom: 8 }} />
      <div style={{ fontWeight: 800, fontSize: 24, color }}>{value != null ? Number(value).toLocaleString() : '—'}</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 12.5, marginTop: 4 }}>{label}</div>
      {pct != null && (
        <div style={{ fontSize: 11, color: pct >= 50 ? '#10B981' : '#F59E0B', marginTop: 6, fontWeight: 600 }}>
          {pct}% → next step
        </div>
      )}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, fontWeight: 600, color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { hasRole } = useAuth()
  const isModel = hasRole('Model')
  const isBrand = hasRole('Brand') || hasRole('Agency')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    get('/analytics/my', { days })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [days])

  if (loading) return <PageLoader />
  if (!data) return <EmptyState title="Analytics unavailable" message="We could not load your analytics right now. Try again in a moment." />

  const labels = data.labels || []
  const chart = (values, name) => (values || []).map((v, i) => ({ date: labels[i] || '', [name || 'value']: v }))

  const profileViews = data.profileViewsTotal || data.profileViews || 0
  const applications = data.applicationsSent || 0
  const bookings = data.bookingsTotal || 0
  const rating = data.averageRating || 0
  const followers = data.followersTotal || 0

  const engagementRate = profileViews > 0 ? ((applications / profileViews) * 100).toFixed(1) : 0
  const conversionRate = applications > 0 ? ((bookings / applications) * 100).toFixed(1) : 0

  const viewsData = chart(data.profileViewsTrend, 'views')
  const appsData = chart(data.applicationsTrend, 'applications')
  const bookingsData = chart(data.bookingsTrend, 'bookings')
  const earningsData = data.earningsTrend ? chart(data.earningsTrend, 'earnings') : null

  const pieData = isModel ? [
    { name: 'Casting apps', value: data.castingAppsTotal || 0 },
    { name: 'Campaign apps', value: data.campaignAppsTotal || 0 },
    { name: 'Bookings', value: bookings },
  ] : [
    { name: 'Castings posted', value: data.castingsTotal || 0 },
    { name: 'Campaigns', value: data.campaignsTotal || 0 },
    { name: 'Bookings', value: bookings },
  ]

  const insights = []
  if (conversionRate > 20) insights.push({ icon: Zap, title: 'Strong conversion rate', text: `Your ${conversionRate}% application-to-booking rate is excellent. Keep applying to similar castings.`, color: '#10B981' })
  else if (conversionRate > 0) insights.push({ icon: Target, title: 'Room to improve conversion', text: `Your ${conversionRate}% conversion rate can be improved. Focus on castings that match your profile closely.`, color: '#F59E0B' })
  if (rating >= 4.5) insights.push({ icon: Award, title: 'Outstanding rating', text: `Your ${rating}★ rating is in the top tier. Brands notice this.`, color: '#8B5CF6' })
  if (profileViews > 10) insights.push({ icon: Eye, title: 'Growing visibility', text: `${profileViews} profile views in ${days} days. Your profile is getting attention.`, color: '#3B82F6' })
  if (bookings > 3) insights.push({ icon: Briefcase, title: 'Active bookings', text: `${bookings} bookings in ${days} days — you're in demand.`, color: '#EC4899' })
  if (insights.length === 0) insights.push({ icon: Activity, title: 'Building momentum', text: 'Keep optimizing your profile and applying to castings to grow your numbers.', color: '#8B5CF6' })

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 26 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8 }}>Analytics</span>
          <h1 className="section-title">Your <span className="grad-text">performance</span></h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
            {isModel ? 'Track your profile views, applications, bookings and career growth.' : 'Monitor your castings, campaigns, applicants and spending.'}
          </p>
        </div>
        <div className="profile-tabs" style={{ marginBottom: 0 }}>
          {[7, 30, 90].map((d) => (
            <button key={d} className={`profile-tab${days === d ? ' active' : ''}`} onClick={() => setDays(d)}>{d}d</button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {isModel ? (
          <>
            <StatCard icon={Eye} label="Profile views" value={profileViews} color="#3B82F6" />
            <StatCard icon={MousePointerClick} label="Applications" value={applications} color="#8B5CF6" />
            <StatCard icon={CheckCircle2} label="Shortlisted" value={data.castingAppsShortlisted} color="#F59E0B" />
            <StatCard icon={Briefcase} label="Bookings" value={bookings} color="#10B981" />
            <StatCard icon={Star} label="Rating" value={rating} suffix="★" color="#F59E0B" />
            <StatCard icon={Users} label="Followers" value={followers} color="#EC4899" />
          </>
        ) : (
          <>
            <StatCard icon={Camera} label="Castings" value={data.castingsTotal} color="#EC4899" />
            <StatCard icon={Eye} label="Casting views" value={data.castingsViews} color="#3B82F6" />
            <StatCard icon={MousePointerClick} label="Applicants" value={data.castingApplicants} color="#8B5CF6" />
            <StatCard icon={CheckCircle2} label="Accepted" value={data.castingAccepted} color="#10B981" />
            <StatCard icon={Briefcase} label="Bookings" value={bookings} color="#F59E0B" />
            <StatCard icon={DollarSign} label="Total spend" value={data.bookingsSpend} prefix="$" color="#10B981" />
          </>
        )}
      </div>

      {/* Key metrics bar */}
      <div className="card" style={{ padding: 18, marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.05))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={16} color="var(--primary)" />
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Engagement:</span>
          <strong style={{ fontSize: 14 }}>{engagementRate}%</strong>
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} color="#10B981" />
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Conversion:</span>
          <strong style={{ fontSize: 14, color: '#10B981' }}>{conversionRate}%</strong>
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Star size={16} color="#F59E0B" />
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Rating:</span>
          <strong style={{ fontSize: 14, color: '#F59E0B' }}>{rating}★</strong>
        </div>
        {isModel && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="#8B5CF6" />
              <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Shortlist rate:</span>
              <strong style={{ fontSize: 14, color: '#8B5CF6' }}>{applications > 0 ? ((data.castingAppsShortlisted / applications) * 100).toFixed(0) : 0}%</strong>
            </div>
          </>
        )}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Profile views trend">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={viewsData}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} interval={Math.max(Math.floor(labels.length / 6), 0)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} width={35} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2} fill="url(#viewsGrad)" name="Views" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Applications trend">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={appsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} interval={Math.max(Math.floor(labels.length / 6), 0)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} width={35} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="applications" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Applications" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Bookings trend">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bookingsData}>
              <defs>
                <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} interval={Math.max(Math.floor(labels.length / 6), 0)} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} width={35} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="bookings" stroke="#10B981" strokeWidth={2} fill="url(#bookGrad)" name="Bookings" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {earningsData ? (
          <ChartCard title="Earnings trend">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} interval={Math.max(Math.floor(labels.length / 6), 0)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickLine={false} axisLine={false} width={35} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="earnings" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Earnings ($)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartCard title="Activity distribution">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData.filter((d) => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.filter((d) => d.value > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Funnel */}
      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}><Target size={16} /> Conversion funnel</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {isModel ? (
            <>
              <FunnelStep label="Profile views" value={profileViews} color="#3B82F6" icon={Eye} />
              <FunnelStep label="Applications" value={applications} prevValue={profileViews} color="#8B5CF6" icon={MousePointerClick} />
              <FunnelStep label="Shortlisted" value={data.castingAppsShortlisted} prevValue={applications} color="#F59E0B" icon={CheckCircle2} />
              <FunnelStep label="Bookings" value={bookings} prevValue={data.castingAppsShortlisted} color="#10B981" icon={Briefcase} />
            </>
          ) : (
            <>
              <FunnelStep label="Casting views" value={data.castingsViews} color="#3B82F6" icon={Eye} />
              <FunnelStep label="Applicants" value={data.castingApplicants} prevValue={data.castingsViews} color="#8B5CF6" icon={MousePointerClick} />
              <FunnelStep label="Shortlisted" value={data.castingShortlisted} prevValue={data.castingApplicants} color="#F59E0B" icon={CheckCircle2} />
              <FunnelStep label="Bookings" value={bookings} prevValue={data.castingShortlisted} color="#10B981" icon={Briefcase} />
            </>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} color="var(--gold)" /> AI Insights
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
        </div>
      </div>

      {/* Top castings (Brand) */}
      {isBrand && data.topCastings?.length > 0 && (
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 15, margin: '0 0 14px' }}>Top performing castings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.topCastings.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: i < 3 ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))' : 'var(--bg-soft)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: i < 3 ? 'var(--gold)' : 'var(--text-faint)' }}>#{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 13.5 }}>{c.title || `Casting #${c.id}`}</strong>
                  <div style={{ display: 'flex', gap: 14, color: 'var(--text-faint)', fontSize: 12, marginTop: 3 }}>
                    <span><Eye size={11} /> {c.views || 0}</span>
                    <span><MousePointerClick size={11} /> {c.applicants || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
