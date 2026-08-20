import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Star, Filter, MapPin, ChevronDown } from 'lucide-react'
import { get, assetUrl, parseList } from '../api/client'
import { Pagination, EmptyState } from '../components/ui'
import './Explore.css'

const sortOptions = [
  ['dailyRate', 'Daily rate'],
  ['rating', 'Highest rated'],
  ['experience', 'Most experienced'],
  ['bookings', 'Most booked'],
  ['name', 'Name'],
  ['createdAt', 'Newest'],
]

export default function Explore() {
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({ gender: '', city: '', experienceLevel: '', sortBy: 'rating', sortOrder: 'desc' })
  const [showFilters, setShowFilters] = useState(false)
  const [data, setData] = useState({ data: [], total: 0 })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize, sortBy: filters.sortBy, sortOrder: filters.sortOrder }
      if (q.trim()) params.q = q.trim()
      if (filters.gender) params.gender = filters.gender
      if (filters.city) params.city = filters.city
      if (filters.experienceLevel) params.experienceLevel = filters.experienceLevel
      const res = await get('/profiles/search', params)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [q, filters, page, pageSize])

  useEffect(() => { load() }, [load])

  const applyFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }))
    setPage(1)
  }

  return (
    <div>
      <section className="explore-hero">
        <div className="container">
          <h1 className="fade-up">Discover top <span className="grad-text">talent</span></h1>
          <p className="fade-up" style={{ animationDelay: '0.1s' }}>Search models by look, experience, and rate — with AI-ranked results.</p>
          <form className="explore-search fade-up" style={{ animationDelay: '0.15s' }} onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
            <Search size={19} />
            <input placeholder="Search by name, city, specialty…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-primary btn-sm" type="submit">Search</button>
          </form>
          <button className="explore-toggle" onClick={() => setShowFilters((s) => !s)}>
            <Filter size={16} /> Filters <ChevronDown size={15} style={{ transform: showFilters ? 'rotate(180deg)' : '' }} />
          </button>
          {showFilters && (
            <div className="explore-filters fade-in">
              <select value={filters.gender} onChange={(e) => applyFilter('gender', e.target.value)}>
                <option value="">Any gender</option><option>Female</option><option>Male</option><option>Non-binary</option>
              </select>
              <select value={filters.city} onChange={(e) => applyFilter('city', e.target.value)}>
                <option value="">Any city</option>
                {['Cairo', 'Alexandria', 'Dubai', 'Riyadh', 'Jeddah', 'Beirut', 'Amman', 'Kuwait City', 'London', 'Paris', 'New York', 'Los Angeles', 'Miami', 'Istanbul'].map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={filters.experienceLevel} onChange={(e) => applyFilter('experienceLevel', e.target.value)}>
                <option value="">Any experience</option>
                {['Newcomer', 'Beginner', 'Intermediate', 'Professional', 'Expert', 'Veteran'].map((x) => <option key={x}>{x}</option>)}
              </select>
              <select value={filters.sortBy} onChange={(e) => applyFilter('sortBy', e.target.value)}>
                {sortOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
        </div>
      </section>

      <section className="container" style={{ padding: '40px 24px' }}>
        <p style={{ color: 'var(--text-dim)', marginBottom: 22, fontSize: 14.5 }}>
          {loading ? 'Searching…' : `${data.total} model${data.total === 1 ? '' : 's'} found`}
        </p>

        <div className="grid-auto grid-3">
          {loading ? [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 330 }} />)
            : data.data.map((m) => (
              <Link key={m.userId} to={`/u/${m.userId}`} className="model-card">
                <div className="model-card-cover" style={{ height: 240 }}>
                  {m.profilePictureUrl ? <img src={assetUrl(m.profilePictureUrl)} alt={m.displayName} /> : <span className="model-avatar">{m.firstName?.[0]}{m.lastName?.[0]}</span>}
                  <span className="model-rate">{m.dailyRate ? `$${m.dailyRate}/day` : 'Rate on request'}</span>
                </div>
                <div className="model-card-body">
                  <h3>{m.firstName} {m.lastName}</h3>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {m.city}{m.country ? `, ${m.country}` : ''}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {m.specialties && parseList(m.specialties).slice(0, 3).map((s) => <span key={s} className="badge badge-gray" style={{ fontSize: 11 }}>{s}</span>)}
                  </div>
                  <div className="model-meta">
                    <span><Star size={13} color="var(--gold)" /> {m.averageRating?.toFixed(1) || 'New'}</span>
                    <span>{m.totalBookings || 0} bookings</span>
                  </div>
                </div>
              </Link>
            ))}
        </div>

        {!loading && data.data.length === 0 && (
          <EmptyState title="No models found" message="Try adjusting your filters or search query." />
        )}

        <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} />
      </section>
    </div>
  )
}
