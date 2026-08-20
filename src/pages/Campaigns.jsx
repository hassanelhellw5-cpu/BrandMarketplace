import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, DollarSign, Users, Target, ArrowRight } from 'lucide-react'
import { get } from '../api/client'
import { Pagination, EmptyState } from '../components/ui'
import './Campaigns.css'

export default function Campaigns() {
  const [data, setData] = useState({ data: [], total: 0 })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await get('/campaigns', { page, pageSize, sortBy: 'createdAt', sortOrder: 'desc' })
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <section className="explore-hero">
        <div className="container">
          <h1 className="fade-up">Brand <span className="grad-text">campaigns</span></h1>
          <p className="fade-up" style={{ animationDelay: '0.1s' }}>Apply to join exciting brand campaigns and collaborations.</p>
        </div>
      </section>

      <section className="container" style={{ padding: '40px 24px' }}>
        <div className="grid-auto grid-3">
          {loading ? [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 230 }} />)
            : data.data.map((c) => (
              <Link key={c.id} to={`/campaign/${c.id}`} className="campaign-card">
                <div className="campaign-head">
                  <span className="campaign-icon"><Sparkles size={20} /></span>
                  <span className="badge badge-green">{c.status}</span>
                </div>
                <h3>{c.name}</h3>
                <p>{c.description?.slice(0, 110) || 'Join this campaign and get discovered.'}</p>
                <div className="campaign-info">
                  <span><Target size={14} /> {c.objective || 'General'}</span>
                  <span><Users size={14} /> {c.filledPositions || 0}/{c.requiredModelsCount || 0} filled</span>
                  <span className="campaign-budget"><DollarSign size={14} /> {c.budget ? `$${c.budget.toLocaleString()}` : 'Budget N/A'}</span>
                </div>
                <div className="campaign-foot">
                  <span>{c.endDate ? `Ends ${new Date(c.endDate).toLocaleDateString()}` : 'Open'}</span>
                  <span className="campaign-view-link">View <ArrowRight size={13} /></span>
                </div>
              </Link>
            ))}
        </div>
        {!loading && data.data.length === 0 && <EmptyState title="No campaigns yet" message="Brands will post campaigns here." />}
        <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} />
      </section>
    </div>
  )
}
