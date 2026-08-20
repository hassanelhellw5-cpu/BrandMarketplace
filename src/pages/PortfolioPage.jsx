import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Heart, Eye, Image as ImageIcon, Layers, ChevronLeft, ChevronRight, X, ArrowUpRight } from 'lucide-react'
import { get, assetUrl } from '../api/client'
import { PageLoader, EmptyState } from '../components/ui'
import './PortfolioPage.css'

export default function PortfolioPage() {
  const { userId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('All')
  const [viewing, setViewing] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [userProfile, setUserProfile] = useState(null)

  useEffect(() => {
    get('/portfolio', { userId, pageSize: 100 }).then(setData).catch(() => {}).finally(() => setLoading(false))
    get(`/profiles/${userId}`).then(setUserProfile).catch(() => {})
  }, [userId])

  const categories = useMemo(() => {
    if (!data) return []
    return ['All', ...new Set((data.data || []).map((p) => p.category).filter(Boolean))]
  }, [data])

  const items = useMemo(() => {
    if (!data) return []
    return (cat === 'All' ? data.data : data.data.filter((p) => p.category === cat)) || []
  }, [data, cat])

  const openPortfolio = async (p) => {
    setViewing({ ...p, media: [] })
    setViewLoading(true)
    try {
      const res = await get(`/portfolio/${p.id}`)
      setViewing({ ...p, ...res.portfolio, media: res.media || [] })
    } catch {
      setViewing({ ...p, media: [] })
    } finally {
      setViewLoading(false)
    }
  }

  const openLightbox = useCallback((media, index) => {
    setLightbox({ media, index })
  }, [])

  const closeLightbox = useCallback(() => setLightbox(null), [])

  const navLightbox = useCallback((dir) => {
    setLightbox((prev) => {
      if (!prev) return prev
      const next = prev.index + dir
      if (next < 0 || next >= prev.media.length) return prev
      return { ...prev, index: next }
    })
  }, [])

  const getUserPhoto = () => {
    if (userProfile?.profilePictureUrl) {
      const url = userProfile.profilePictureUrl
      return url.startsWith('http') ? url : `https://brandmarketplace.runasp.net${url.startsWith('/') ? url : '/' + url}`
    }
    return null
  }

  const getUserName = () => {
    return userProfile?.displayName || userProfile?.userName || ''
  }

  if (loading) return <PageLoader />
  if (!data || data.data.length === 0) return <EmptyState title="No portfolio yet" message="This user hasn't published any work." />

  return (
    <div>
      {/* Hero section */}
      <section className="pf-hero">
        {getUserPhoto() && <img src={getUserPhoto()} alt={getUserName()} className="pf-hero-avatar" />}
        <h1 className="pf-hero-name">{getUserName() || 'Portfolio'}</h1>
        {userProfile?.bio && <p className="pf-hero-subtitle">{userProfile.bio}</p>}
        <div className="pf-hero-stats">
          <span><Layers size={14} /> {data.data.length} portfolio{data.data.length === 1 ? '' : 's'}</span>
          <span><Eye size={14} /> {data.data.reduce((s, p) => s + (p.viewsCount || 0), 0).toLocaleString()} views</span>
          <span><Heart size={14} /> {data.data.reduce((s, p) => s + (p.likesCount || 0), 0).toLocaleString()} likes</span>
        </div>
        <div className="pf-hero-divider" />
        <Link to={`/u/${userId}`} style={{ marginTop: 20, fontSize: 13, color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowUpRight size={14} /> View full profile
        </Link>
      </section>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="pf-cats">
          {categories.map((c) => (
            <button key={c} className={`pf-cat${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      )}

      {/* Masonry gallery */}
      {items.length === 0 ? (
        <div style={{ padding: '40px 24px' }}><EmptyState title="Nothing here" message="No works in this category yet." /></div>
      ) : (
        <div className="pf-gallery">
          {items.map((p, idx) => (
            <div key={p.id} className="pf-item" onClick={() => openPortfolio(p)}>
              {p.coverMediaUrl ? (
                <img src={assetUrl(p.coverThumbnailUrl || p.coverMediaUrl)} alt={p.title} loading="lazy" />
              ) : (
                <div style={{ aspectRatio: '3/4', display: 'grid', placeItems: 'center', background: 'var(--grad-soft)', color: 'var(--text-faint)' }}>
                  <ImageIcon size={32} />
                </div>
              )}
              {p.mediaCount > 1 && (
                <span className="pf-item-badge"><Layers size={11} /> {p.mediaCount}</span>
              )}
              <div className="pf-item-overlay">
                <div className="pf-item-title">{p.title}</div>
                <div className="pf-item-meta">
                  <span><Eye size={12} /> {p.viewsCount || 0}</span>
                  <span><Heart size={12} /> {p.likesCount || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 80 }} />

      {/* Portfolio detail modal — full screen */}
      {viewing && (
        <div className="pf-lightbox" onClick={() => setViewing(null)}>
          <button className="pf-lightbox-close" onClick={() => setViewing(null)}><X size={20} /></button>
          <div className="pf-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: '#fff' }}>{viewing.title}</h2>
            {viewing.category && <span className="badge" style={{ marginBottom: 14 }}>{viewing.category}</span>}
            {viewing.description && <p style={{ color: 'var(--text-dim)', fontSize: 14, maxWidth: 600, textAlign: 'center', marginBottom: 16 }}>{viewing.description}</p>}
            {viewLoading ? (
              <PageLoader text="Loading…" />
            ) : viewing.media?.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, width: '100%', maxHeight: '70vh', overflowY: 'auto', padding: '0 4px' }}>
                {viewing.media.map((m, i) => (
                  m.mediaType === 'Video' ? (
                    <video key={m.id} src={assetUrl(m.url || m.filePath)} controls style={{ width: '100%', borderRadius: 10, background: '#000', cursor: 'pointer' }} onClick={() => openLightbox(viewing.media, i)} />
                  ) : (
                    <img key={m.id} src={assetUrl(m.url || m.filePath)} alt={m.altText || ''} style={{ width: '100%', borderRadius: 10, cursor: 'pointer' }} onClick={() => openLightbox(viewing.media, i)} loading="lazy" />
                  )
                ))}
              </div>
            ) : (
              <EmptyState title="No media" message="This portfolio has no media files." />
            )}
          </div>
        </div>
      )}

      {/* Full-screen lightbox */}
      {lightbox && (
        <div className="pf-lightbox" onClick={closeLightbox}>
          <button className="pf-lightbox-close" onClick={closeLightbox}><X size={20} /></button>
          {lightbox.index > 0 && (
            <button className="pf-lightbox-nav prev" onClick={(e) => { e.stopPropagation(); navLightbox(-1) }}><ChevronLeft size={22} /></button>
          )}
          <div className="pf-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {lightbox.media[lightbox.index]?.mediaType === 'Video' ? (
              <video src={assetUrl(lightbox.media[lightbox.index]?.url || lightbox.media[lightbox.index]?.filePath)} controls autoPlay style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12 }} />
            ) : (
              <img src={assetUrl(lightbox.media[lightbox.index]?.url || lightbox.media[lightbox.index]?.filePath)} alt="" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }} />
            )}
            {lightbox.media[lightbox.index]?.altText && (
              <div className="pf-lightbox-info">{lightbox.media[lightbox.index].altText}</div>
            )}
          </div>
          {lightbox.index < lightbox.media.length - 1 && (
            <button className="pf-lightbox-nav next" onClick={(e) => { e.stopPropagation(); navLightbox(1) }}><ChevronRight size={22} /></button>
          )}
          <div className="pf-lightbox-counter">{lightbox.index + 1} / {lightbox.media.length}</div>
        </div>
      )}
    </div>
  )
}
