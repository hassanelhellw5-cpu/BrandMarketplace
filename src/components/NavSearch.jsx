import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, Building2, Camera, Image, MessageSquareText } from 'lucide-react'
import { get, assetUrl } from '../api/client'
import './NavSearch.css'

const GROUP_ICONS = {
  models: User,
  brands: Building2,
  castings: Camera,
  portfolios: Image,
  posts: MessageSquareText,
}

const GROUP_LABELS = {
  models: 'Models',
  brands: 'Brands',
  castings: 'Castings',
  portfolios: 'Portfolios',
  posts: 'Posts',
}

export default function NavSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.trim().length < 2) { setResults(null); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await get('/search', { q: q.trim() })
        setResults(res)
        setOpen(true)
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [q])

  useEffect(() => {
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const go = (url) => {
    setOpen(false)
    setQ('')
    setResults(null)
    navigate(url)
  }

  const groups = Object.keys(GROUP_LABELS)

  const total = results ? groups.reduce((n, k) => n + (results[k]?.length || 0), 0) : 0

  return (
    <div className="nav-search" ref={wrapRef}>
      <Search size={16} className="nav-search-icon" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (q.trim().length >= 2) setOpen(true) }}
        placeholder="Search models, castings…"
        aria-label="Search"
      />
      {loading && <span className="nav-search-spin" />}

      {open && results && (
        <div className="nav-search-drop">
          {total === 0 && (
            <div className="nav-search-empty">No results for “{q.trim()}”</div>
          )}
          {groups.map((key) => {
            const items = results[key] || []
            if (!items.length) return null
            const Icon = GROUP_ICONS[key]
            return (
              <div key={key} className="nav-search-group">
                <div className="nav-search-group-label">
                  <Icon size={13} />
                  {GROUP_LABELS[key]}
                </div>
                {items.map((it, i) => (
                  <button
                    key={key + (it.id ?? it.userId ?? i)}
                    className="nav-search-item"
                    onClick={() => {
                      if (key === 'models' || key === 'brands' || key === 'agencies') go(`/u/${it.userId}`)
                      else if (key === 'castings') go(`/casting/${it.id}`)
                      else if (key === 'portfolios') go(`/portfolio/${it.userId}`)
                      else if (key === 'posts') go('/feed')
                      else go('/explore')
                    }}
                  >
                    {key === 'models' && (
                      it.profilePictureUrl
                        ? <img src={assetUrl(it.profilePictureUrl)} alt="" />
                        : <span className="nav-search-avatar"><User size={14} /></span>
                    )}
                    {key === 'brands' && <span className="nav-search-avatar"><Building2 size={14} /></span>}
                    {key === 'posts' && <span className="nav-search-avatar"><MessageSquareText size={14} /></span>}
                    <span className="nav-search-title">
                      {key === 'models' ? `${it.firstName ?? ''} ${it.lastName ?? ''}`.trim() || 'Model' : it.title || it.companyName || '—'}
                    </span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
