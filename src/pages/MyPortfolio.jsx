import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Trash2, Upload, Star, ArrowUp, ArrowDown, Images, Link2, Pencil, GripVertical, Eye, X } from 'lucide-react'
import { api, get, post, put, del, upload, errMsg, assetUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'

const mediaUrl = (m) => assetUrl(m.url || m.mediaUrl || m.filePath || m.fileUrl || '')
const isVideo = (m) => {
  const u = mediaUrl(m)
  return m.mediaType === 'Video' || m.type === 'Video' || /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(u)
}

export default function MyPortfolio() {
  const { user } = useAuth()
  const sub = useSubscription()
  const toast = useToast()
  const fileRef = useRef(null)
  const [portfolios, setPortfolios] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: '', tags: '', isPublic: true })
  const [preview, setPreview] = useState(null)

  const active = portfolios.find((p) => p.id === activeId) || portfolios[0] || null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await get('/portfolio', { pageSize: 50 })
      const list = Array.isArray(res) ? res : Array.isArray(res.data) ? res.data : res && res.id ? [res] : []
      setPortfolios(list)
      setActiveId((prev) => (list.find((p) => p.id === prev) ? prev : (list[0]?.id ?? null)))
    } catch { /* portfolio may not exist yet */ }
    setLoading(false)
  }, [])

  const loadDetail = useCallback(async (id) => {
    if (!id) { setMedia([]); return }
    try {
      const res = await get(`/portfolio/${id}`)
      setMedia(res.media || res.portfolio?.media || [])
    } catch { setMedia([]) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadDetail(activeId) }, [activeId, loadDetail])

  const openCreate = () => {
    setForm({ title: '', description: '', category: '', tags: '', isPublic: true })
    setFormOpen(true)
  }

  const openEdit = () => {
    setForm({
      title: active?.title || '',
      description: active?.description || '',
      category: active?.category || '',
      tags: active?.tags || '',
      isPublic: active?.isPublic !== false,
    })
    setFormOpen(true)
  }

  const savePortfolio = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { title: form.title, description: form.description, category: form.category, tags: form.tags, isPublic: form.isPublic }
      const res = active
        ? await put(`/portfolio/${active.id}`, body)
        : await post('/portfolio', body)
      toast.success(active ? 'Portfolio updated' : 'Portfolio created')
      setFormOpen(false)
      await load()
      if (!active) setActiveId(res.id)
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const deletePortfolio = async () => {
    if (!active) return
    if (!window.confirm('Delete this portfolio and all its media? This cannot be undone.')) return
    try {
      await del(`/portfolio/${active.id}`)
      toast.success('Portfolio deleted')
      await load()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const handleFiles = async (files) => {
    if (!active || !files?.length) return
    const lim = sub.remaining('portfolio-media')
    const slots = lim.limit === null ? Infinity : Math.max(0, lim.limit - media.length)
    if (slots <= 0) {
      toast.error('Media limit reached — upgrade your plan to store more items')
      return
    }
    if (files.length > slots) {
      toast.error(`Limit reached — you can add ${slots} more item${slots === 1 ? '' : 's'}`)
      files = Array.from(files).slice(0, slots)
      if (files.length === 0) return
    }
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    setUploading(true)
    try {
      await upload(`/portfolio/${active.id}/upload`, fd)
      sub.consume('portfolio-media', files.length)
      toast.success('Media uploaded')
      await loadDetail(active.id)
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setUploading(false)
    }
  }

  const setCover = async (m) => {
    try {
      await api.put(`/portfolio/media/${m.id}/cover`)
      toast.success('Cover updated')
      await loadDetail(activeId)
    } catch (err) { toast.error(errMsg(err)) }
  }

  const reorder = async (m, dir) => {
    const next = [...media]
    const idx = next.findIndex((x) => x.id === m.id)
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    try {
      await api.put(`/portfolio/media/${m.id}/reorder`, null, { params: { sortOrder: target + 1 } })
      await loadDetail(activeId)
    } catch (err) { toast.error(errMsg(err)) }
  }

  const removeMedia = async (m) => {
    if (!window.confirm('Remove this media item?')) return
    try {
      await del(`/portfolio/media/${m.id}`)
      toast.success('Media removed')
      await loadDetail(activeId)
    } catch (err) { toast.error(errMsg(err)) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8 }}>Portfolio</span>
          <h1 className="section-title">My <span className="grad-text">portfolio</span></h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Showcase your work — photos, videos and brand collabs.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {active && (
            <>
              <button className="btn btn-outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload size={16} /> {uploading ? 'Uploading…' : 'Upload media'}
              </button>
              <button className="btn btn-outline" onClick={openEdit}>
                <Pencil size={16} /> Edit portfolio
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New portfolio
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />

      {/* Portfolio tabs */}
      {portfolios.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {portfolios.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: p.id === active?.id ? 600 : 400,
                border: `1px solid ${p.id === active?.id ? 'var(--primary)' : 'var(--border)'}`,
                background: p.id === active?.id ? 'rgba(139,92,246,0.12)' : 'transparent',
                color: p.id === active?.id ? 'var(--primary)' : 'var(--text-dim)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {p.title || `Portfolio #${p.id}`}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!active ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <Images size={48} style={{ color: 'var(--text-faint)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>No portfolio yet</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Create a portfolio to showcase your work to brands and agencies.
          </p>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Create your first portfolio</button>
        </div>
      ) : (
        <>
          {/* Portfolio info card */}
          <div className="card" style={{ padding: 22, marginBottom: 24, borderLeft: '3px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>{active.title || 'Untitled portfolio'}</h2>
                  <span className={`badge ${active.isPublic ? 'badge-green' : 'badge-gray'}`}>{active.isPublic ? 'Public' : 'Private'}</span>
                </div>
                {active.description && <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>{active.description}</p>}
                <div style={{ display: 'flex', gap: 18, marginTop: 12, color: 'var(--text-faint)', fontSize: 13, flexWrap: 'wrap' }}>
                  <span><Images size={13} style={{ verticalAlign: -2 }} /> {active.mediaCount ?? media.length} items{(() => { const lim = sub.limit('portfolio-media'); return lim !== null ? ` / ${lim}` : '' })()}</span>
                  <span><Star size={13} style={{ verticalAlign: -2 }} /> {active.likesCount ?? 0} likes</span>
                  <span><Eye size={13} style={{ verticalAlign: -2 }} /> {active.viewsCount ?? 0} views</span>
                  {active.tags && <span><Link2 size={13} style={{ verticalAlign: -2 }} /> {active.tags}</span>}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={deletePortfolio}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>

          {/* Media grid */}
          {media.length === 0 ? (
            <div className="card" style={{ padding: 50, textAlign: 'center' }}>
              <Upload size={40} style={{ color: 'var(--text-faint)', marginBottom: 14 }} />
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>No media yet</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>Upload photos and videos to complete your portfolio.</p>
              <button className="btn btn-primary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Upload media</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
              {media.map((m, idx) => (
                <div key={m.id} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <div style={{ position: 'relative', aspectRatio: '3 / 4', background: 'var(--surface-2)' }}>
                    {isVideo(m) ? (
                      <video src={mediaUrl(m)} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img
                        src={mediaUrl(m)}
                        alt={m.altText || ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                        onClick={() => setPreview({ media, index: idx })}
                      />
                    )}
                    {m.isCover && (
                      <span style={{
                        position: 'absolute', top: 8, left: 8,
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        color: '#F59E0B', background: 'rgba(245,158,11,0.2)', backdropFilter: 'blur(8px)',
                      }}>
                        <Star size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Cover
                      </span>
                    )}
                    {isVideo(m) && !m.isCover && (
                      <span style={{
                        position: 'absolute', top: 8, left: 8,
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        color: '#3B82F6', background: 'rgba(59,130,246,0.2)', backdropFilter: 'blur(8px)',
                      }}>VIDEO</span>
                    )}
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                      color: 'var(--text-dim)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                    }}>#{idx + 1}</span>
                  </div>
                  <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button className="btn btn-ghost btn-sm" title="Move up" onClick={() => reorder(m, -1)} disabled={idx === 0} style={{ opacity: idx === 0 ? 0.3 : 1 }}>
                        <ArrowUp size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Move down" onClick={() => reorder(m, 1)} disabled={idx === media.length - 1} style={{ opacity: idx === media.length - 1 ? 0.3 : 1 }}>
                        <ArrowDown size={13} />
                      </button>
                      {!m.isCover && (
                        <button className="btn btn-ghost btn-sm" title="Set as cover" onClick={() => setCover(m)}>
                          <Star size={13} />
                        </button>
                      )}
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} title="Remove" onClick={() => removeMedia(m)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={active ? 'Edit portfolio' : 'Create portfolio'} width={540}>
        <form onSubmit={savePortfolio}>
          <div className="field">
            <label>Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Fashion portfolio 2026" required />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select…</option>
              {['Fashion', 'Commercial', 'Editorial', 'Runway', 'Fit Model', 'Swimwear', 'Lingerie', 'Cosmetics', 'Lifestyle', 'Sports', 'Agency'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell brands what makes this collection stand out…" />
          </div>
          <div className="field">
            <label>Tags (comma separated)</label>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="editorial, beach, minimal" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, color: 'var(--text-dim)', fontSize: 14 }}>
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
            Publicly visible on your profile
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Media preview lightbox */}
      {preview && (
        <div className="pf-lightbox" onClick={() => setPreview(null)}>
          <button className="pf-lightbox-close" onClick={() => setPreview(null)}><X size={20} /></button>
          {preview.index > 0 && (
            <button className="pf-lightbox-nav prev" onClick={(e) => { e.stopPropagation(); setPreview({ ...preview, index: preview.index - 1 }) }}><ChevronLeft size={22} /></button>
          )}
          <div className="pf-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {isVideo(preview.media[preview.index]) ? (
              <video src={mediaUrl(preview.media[preview.index])} controls autoPlay style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12 }} />
            ) : (
              <img src={mediaUrl(preview.media[preview.index])} alt="" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }} />
            )}
          </div>
          {preview.index < preview.media.length - 1 && (
            <button className="pf-lightbox-nav next" onClick={(e) => { e.stopPropagation(); setPreview({ ...preview, index: preview.index + 1 }) }}><ChevronRight size={22} /></button>
          )}
          <div className="pf-lightbox-counter">{preview.index + 1} / {preview.media.length}</div>
        </div>
      )}
    </div>
  )
}
