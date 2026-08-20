import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Clock, ArrowRight, Search } from 'lucide-react'
import { get } from '../api/client'
import { Pagination, EmptyState } from '../components/ui'
import './Castings.css'

export default function Castings() {
  const [q, setQ] = useState('')
  const [location, setLocation] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [data, setData] = useState({ data: [], total: 0 })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize, sortBy, sortOrder: 'desc' }
      if (q.trim()) params.category = q.trim()
      if (location) params.location = location
      const res = await get('/castings', params)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [q, location, sortBy, page, pageSize])

  useEffect(() => { load() }, [load])

  const statusColor = (s) => {
    if (s === 'Open') return 'badge-green'
    if (s === 'Closed') return 'badge-gray'
    if (s === 'Filled') return 'badge'
    return 'badge'
  }

  return (
    <div>
      <section className="explore-hero">
        <div className="container">
          <h1 className="fade-up">Casting <span className="grad-text">calls</span></h1>
          <p className="fade-up" style={{ animationDelay: '0.1s' }}>Find your next audition — paid jobs, brand campaigns, and collabs.</p>
          <form className="explore-search fade-up" style={{ animationDelay: '0.15s' }} onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
            <Search size={19} />
            <input placeholder="Search by category (fashion, commercial, editorial…)…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-primary btn-sm" type="submit">Search</button>
          </form>
          <div className="explore-filters fade-in" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 560 }}>
            <input style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '11px 12px', color: 'var(--text)', fontSize: 14 }} placeholder="Location…" value={location} onChange={(e) => { setLocation(e.target.value); setPage(1); }} />
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}>
              <option value="createdAt">Newest</option>
              <option value="budget">Highest budget</option>
              <option value="deadline">Closing soon</option>
            </select>
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: '40px 24px' }}>
        <p style={{ color: 'var(--text-dim)', marginBottom: 22, fontSize: 14.5 }}>{loading ? 'Loading…' : `${data.total} casting${data.total === 1 ? '' : 's'} found`}</p>
        <div className="grid-auto grid-3">
          {loading ? [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 220 }} />)
            : data.data.map((c) => (
              <Link key={c.id} to={`/casting/${c.id}`} className="casting-card-lg">
                <div className="casting-card-top">
                  <span className={`badge ${statusColor(c.status)}`}>{c.status}</span>
                  {c.budget ? <span className="casting-budget">${c.budget.toLocaleString()}</span> : null}
                </div>
                <h3>{c.title}</h3>
                <p>{c.description?.slice(0, 100) || 'Apply now to be considered for this project.'}</p>
                <div className="casting-card-meta">
                  <span><MapPin size={14} /> {c.location || 'Remote'}</span>
                  <span><Clock size={14} /> {c.applicationDeadline ? new Date(c.applicationDeadline).toLocaleDateString() : 'Open'}</span>
                </div>
                <div className="casting-card-footer">
                  <span>{c.currentApplications || 0}/{c.maxApplications || '∞'} applied</span>
                  <span className="casting-view-link">View <ArrowRight size={13} /></span>
                </div>
              </Link>
            ))}
        </div>
        {!loading && data.data.length === 0 && <EmptyState title="No castings found" message="Check back soon or adjust your filters." />}
        <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} />
      </section>
    </div>
  )
}
