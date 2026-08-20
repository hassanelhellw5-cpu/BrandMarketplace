import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, Star, Search, Camera, ShieldCheck, Users, Briefcase, Bot } from 'lucide-react'
import { useState, useEffect } from 'react'
import { get, assetUrl } from '../api/client'
import './Home.css'

const stats = [
  { icon: Users, value: '…', label: 'Models on the platform' },
  { icon: Briefcase, value: '…', label: 'Open castings right now' },
  { icon: ShieldCheck, value: 'Escrow', label: 'Protected payments' },
  { icon: Bot, value: 'AI', label: 'Insights built in' },
]

const features = [
  { icon: Search, title: 'Smart Talent Search', desc: 'Filter 20+ attributes with AI-re-ranked results to find the perfect talent in seconds.' },
  { icon: Camera, title: 'Castings & Campaigns', desc: 'Post castings, run campaigns, and shortlist applications with AI success probability.' },
  { icon: ShieldCheck, title: 'Escrow Protection', desc: 'Money is held securely and released only when work is completed to satisfaction.' },
  { icon: Bot, title: 'AI-Powered Insights', desc: 'Price suggestions, profile quality scores, engagement prediction and churn risk — all built in.' },
]

const howItWorks = [
  { n: '01', title: 'Create your profile', desc: 'Join as a model, brand, or agency. Build a portfolio with AI quality scoring.' },
  { n: '02', title: 'Discover & connect', desc: 'Browse the directory, apply to castings, or shortlist talent for your campaign.' },
  { n: '03', title: 'Book with confidence', desc: 'Escrow holds the payment, contracts are signed digitally, and reviews build trust.' },
]

const testimonials = [
  { name: 'Layla M.', role: 'Fashion Model', text: 'Landing booked campaigns through BrandMarketplace changed my career. The AI price suggestion actually matched what agencies offered.' },
  { name: 'Omar K.', role: 'Brand Manager', text: 'We shortlisted 40 models in one afternoon. The engagement and success probability scores saved us weeks of guesswork.' },
  { name: 'Sara A.', role: 'Agency Owner', text: 'Escrow means nobody gets burned. Our models get paid on time, every time. It is the trust layer our industry needed.' },
]

export default function Home() {
  const [models, setModels] = useState([])
  const [castings, setCastings] = useState([])
  const [modelCount, setModelCount] = useState(null)
  const [castingCount, setCastingCount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [m, c] = await Promise.allSettled([
          get('/profiles/search', { pageSize: 6, sortBy: 'rating', sortOrder: 'desc' }),
          get('/castings', { pageSize: 4, status: 'Open' }),
        ])
        if (m.status === 'fulfilled') { setModels(m.value.data || []); setModelCount(m.value.total ?? null) }
        if (c.status === 'fulfilled') { setCastings(c.value.data || []); setCastingCount(c.value.total ?? null) }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = [
    { icon: Users, value: modelCount != null ? modelCount.toLocaleString() : '…', label: 'Models on the platform' },
    { icon: Briefcase, value: castingCount != null ? castingCount.toLocaleString() : '…', label: 'Open castings right now' },
    { icon: ShieldCheck, value: 'Escrow', label: 'Protected payments' },
    { icon: Bot, value: 'AI', label: 'Insights built in' },
  ]

  return (
    <div>
      {/* ---- HERO ---- */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy fade-up">
            <span className="badge" style={{ marginBottom: 20 }}>
              <Sparkles size={13} /> AI-powered talent marketplace
            </span>
            <h1>
              Where talent meets its <span className="grad-text">biggest stage</span>
            </h1>
            <p>
              Models, brands, and agencies — connect, book, and grow on the marketplace
              built for the modern creator economy. Castings, campaigns, contracts and
              protected payments in one place.
            </p>
            <div className="hero-cta">
              <Link to="/signup" className="btn btn-primary btn-lg">Get started free <ArrowRight size={18} /></Link>
              <Link to="/explore" className="btn btn-outline btn-lg">Explore talent</Link>
            </div>
            <div className="hero-trust">
              <span><Star size={14} color="var(--gold)" /> 4.9/5 from 2,300+ users</span>
              <span><ShieldCheck size={14} color="var(--success)" /> Escrow protected payments</span>
            </div>
          </div>

          <div className="hero-visual fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="hero-card hero-card-main">
              <div className="hero-card-head">
                <span className="hero-avatar">LM</span>
                <div>
                  <strong>Layla M.</strong>
                  <small>Fashion Model · Cairo</small>
                </div>
                <span className="badge badge-green">Top rated</span>
              </div>
              <div className="hero-chart">
                <div className="hero-bar" style={{ height: '30%' }} />
                <div className="hero-bar" style={{ height: '50%' }} />
                <div className="hero-bar" style={{ height: '38%' }} />
                <div className="hero-bar" style={{ height: '70%' }} />
                <div className="hero-bar" style={{ height: '55%' }} />
                <div className="hero-bar" style={{ height: '85%' }} />
                <div className="hero-bar" style={{ height: '65%' }} />
                <div className="hero-bar" style={{ height: '100%' }} />
              </div>
              <div className="hero-card-foot">
                <div><small>Profile quality</small><strong>92<span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/100</span></strong></div>
                <div><small>Avg. rate</small><strong>$1,200<span style={{ fontSize: 13, color: 'var(--text-dim)' }}>/day</span></strong></div>
              </div>
            </div>

            <div className="hero-card hero-card-float">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--grad)', display: 'grid', placeItems: 'center' }}>
                  <Bot size={18} color="#fff" />
                </span>
                <div>
                  <strong style={{ fontSize: 14 }}>AI Insight</strong>
                  <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>Live</small>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8 }}>
                Your next booking has <strong style={{ color: 'var(--success)' }}>87%</strong> success probability.
              </p>
            </div>

            <div className="hero-card hero-card-float hero-card-2">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'grid', placeItems: 'center' }}>
                  <ShieldCheck size={18} color="#10B981" />
                </span>
                <div>
                  <strong style={{ fontSize: 14 }}>Escrow released</strong>
                  <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>Booking #4821</small>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8 }}>
                <strong style={{ color: '#fff' }}>$2,400</strong> sent to the model
              </p>
            </div>
          </div>
        </div>

        <div className="hero-stats container">
          {stats.map((s, i) => (
            <div key={s.label} className="hero-stat fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <s.icon size={22} style={{ color: 'var(--primary-2)' }} />
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- FEATURES ---- */}
      <section className="container" style={{ padding: '90px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span className="badge" style={{ marginBottom: 14 }}>Everything you need</span>
          <h2 className="section-title">One platform, <span className="grad-text">endless opportunity</span></h2>
          <p className="section-sub" style={{ maxWidth: 560, margin: '0 auto' }}>Built for the way modern talent gets discovered and brands get results.</p>
        </div>
        <div className="grid-auto grid-4">
          {features.map((f, i) => (
            <div key={f.title} className="feature-card fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
              <span className="feature-icon"><f.icon size={22} /></span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- TOP MODELS ---- */}
      <section className="container" style={{ padding: '40px 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 30, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <span className="badge" style={{ marginBottom: 12 }}>Talent spotlight</span>
            <h2 className="section-title">Top-rated <span className="grad-text">models</span></h2>
          </div>
          <Link to="/explore" className="btn btn-outline">View all talent <ArrowRight size={16} /></Link>
        </div>
        <div className="grid-auto grid-3">
          {loading ? [1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 300 }} />)
            : models.map((m) => (
              <Link key={m.userId} to={`/u/${m.userId}`} className="model-card">
                <div className="model-card-cover">
                  {m.profilePictureUrl ? <img src={assetUrl(m.profilePictureUrl)} alt={m.displayName} /> : <span className="model-avatar">{m.firstName?.[0]}{m.lastName?.[0]}</span>}
                  <span className="model-rate">{m.dailyRate ? `$${m.dailyRate}/day` : 'Rate on request'}</span>
                </div>
                <div className="model-card-body">
                  <h3>{m.firstName} {m.lastName}</h3>
                  <p>{m.city}{m.country ? `, ${m.country}` : ''}</p>
                  <div className="model-meta">
                    <span><Star size={13} color="var(--gold)" /> {m.averageRating?.toFixed(1) || 'New'}</span>
                    <span>{m.totalBookings || 0} bookings</span>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>

      {/* ---- CASTINGS TEASER ---- */}
      <section className="container" style={{ padding: '0 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 30, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <span className="badge badge-gold" style={{ marginBottom: 12 }}>Live opportunities</span>
            <h2 className="section-title">Fresh <span className="grad-text">castings</span></h2>
          </div>
          <Link to="/castings" className="btn btn-outline">Browse castings <ArrowRight size={16} /></Link>
        </div>
        <div className="grid-auto grid-4">
          {loading ? [1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 180 }} />)
            : castings.map((c) => (
              <Link key={c.id} to={`/casting/${c.id}`} className="casting-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                  <h3>{c.title}</h3>
                  <span className="badge">{c.isPaid ? 'Paid' : 'Collab'}</span>
                </div>
                <p>{c.description?.slice(0, 90) || 'Apply now and get discovered.'}</p>
                <div className="casting-meta">
                  <span>{c.location || 'Remote'}</span>
                  <span>{c.applicationDeadline ? `Closes ${new Date(c.applicationDeadline).toLocaleDateString()}` : 'Open'}</span>
                </div>
              </Link>
            ))}
        </div>
      </section>

      {/* ---- HOW IT WORKS ---- */}
      <section style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '80px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="badge" style={{ marginBottom: 14 }}>Simple process</span>
            <h2 className="section-title">How it <span className="grad-text">works</span></h2>
          </div>
          <div className="grid-auto grid-3">
            {howItWorks.map((s) => (
              <div key={s.n} className="step-card">
                <span className="step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- TESTIMONIALS ---- */}
      <section className="container" style={{ padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span className="badge" style={{ marginBottom: 14 }}>Loved by creators</span>
          <h2 className="section-title">Real people, <span className="grad-text">real results</span></h2>
        </div>
        <div className="grid-auto grid-3">
          {testimonials.map((t) => (
            <div key={t.name} className="testimonial-card">
              <div style={{ color: 'var(--gold)', fontSize: 15, marginBottom: 14 }}>{'★'.repeat(5)}</div>
              <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>“{t.text}”</p>
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="t-avatar">{t.name.split(' ').map((x) => x[0]).join('')}</span>
                <div>
                  <strong style={{ fontSize: 14.5 }}>{t.name}</strong>
                  <small style={{ display: 'block', color: 'var(--text-faint)' }}>{t.role}</small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="container" style={{ padding: '0 24px 90px' }}>
        <div className="cta-banner">
          <div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700 }}>Ready to take your career <span className="grad-text">to the next level?</span></h2>
            <p style={{ color: 'var(--text-dim)', marginTop: 8, maxWidth: 520 }}>Join thousands of models and brands already growing on BrandMarketplace.</p>
          </div>
          <Link to="/signup" className="btn btn-primary btn-lg">Create free account <ArrowRight size={18} /></Link>
        </div>
      </section>
    </div>
  )
}
