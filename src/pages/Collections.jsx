import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Plus, Trash2, Eye, Globe, Lock, Search, FolderOpen, ArrowRight } from 'lucide-react'
import { get, post, del, errMsg, assetUrl } from '../api/client'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'

const parseImg = (s) => {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v[0] : '' } catch { return s || '' }
}

const CATALOGS = [
  ['listing', '/enterprise/marketplace', '/marketplace'],
  ['casting', '/castings', '/casting'],
  ['campaign', '/campaigns', '/campaign'],
  ['event', '/events', '/event'],
]

export default function Collections() {
  const toast = useToast()
  const [cols, setCols] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', isPublic: true })
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(null)
  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [targets, setTargets] = useState([])
  const [targetType, setTargetType] = useState('listing')
  const [search, setSearch] = useState('')
  const [addingId, setAddingId] = useState(null)
  const [catalog, setCatalog] = useState({ listing: {}, casting: {}, campaign: {}, event: {} })

  const loadCatalog = async () => {
    const result = { listing: {}, casting: {}, campaign: {}, event: {} }
    await Promise.all(CATALOGS.map(async ([type, ep]) => {
      try {
        const r = await get(ep, { pageSize: 100 })
        const list = Array.isArray(r) ? r : r.data || []
        result[type] = Object.fromEntries(list.map((x) => [x.id, x]))
      } catch { }
    }))
    setCatalog(result)
  }

  const load = async () => {
    setLoading(true)
    try {
      const r = await get('/collections', { pageSize: 100 })
      setCols(Array.isArray(r) ? r : r.data || [])
    } catch { setCols([]) } finally { setLoading(false) }
  }
  useEffect(() => { load(); loadCatalog() }, [])

  const create = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Give the collection a name'); return }
    setCreating(true)
    try {
      await post('/collections', form)
      toast.success('Collection created')
      setForm({ name: '', description: '', isPublic: true })
      setCreateOpen(false)
      load()
    } catch (err) { toast.error(errMsg(err)) } finally { setCreating(false) }
  }

  const openCol = async (c) => {
    setOpen(c)
    setItemsLoading(true)
    setItems([])
    try {
      const r = await get(`/collections/${c.id}/items`)
      setItems(Array.isArray(r) ? r : r.data || [])
    } catch { setItems([]) } finally { setItemsLoading(false) }
  }

  const removeCol = async (c) => {
    if (!window.confirm(`Delete collection "${c.name}"?`)) return
    try { await del(`/collections/${c.id}`); toast.success('Collection deleted'); if (open?.id === c.id) setOpen(null); load() } catch (err) { toast.error(errMsg(err)) }
  }

  const loadTargets = async (type) => {
    setTargets([])
    const list = Object.values(catalog[type] || {})
    setTargets(list.map((x) => ({
      id: x.id,
      title: x.title || x.name || `#${x.id}`,
      img: type === 'listing' ? parseImg(x.imageUrls) : (x.coverImageUrl || x.imageUrl || ''),
    })))
  }

  const openAdd = async (type) => {
    setTargetType(type)
    setAddOpen(true)
    setSearch('')
    loadTargets(type)
  }

  const addItem = async (t) => {
    setAddingId(t.id)
    try {
      await post(`/collections/${open.id}/items`, { targetType, targetId: t.id, notes: '' })
      toast.success('Added to collection')
      openCol(open)
    } catch (err) { toast.error(errMsg(err)) } finally { setAddingId(null) }
  }

  const filteredTargets = targets.filter((t) => !search || String(t.title || '').toLowerCase().includes(search.toLowerCase()))

  const itemMeta = (it) => {
    const x = (catalog[it.targetType] || {})[it.targetId]
    if (!x) return { title: `${String(it.targetType || 'item')[0].toUpperCase() + String(it.targetType || 'item').slice(1)} #${it.targetId}`, img: '', route: null, desc: '', date: '' }
    return {
      title: x.title || x.name || `${it.targetType} #${it.targetId}`,
      img: it.targetType === 'listing' ? parseImg(x.imageUrls) : (x.coverImageUrl || x.imageUrl || ''),
      route: it.targetType === 'listing' ? '/marketplace' : `/${it.targetType}/${it.targetId}`,
      desc: x.description || x.objective || x.location || '',
      date: x.startDate || x.createdAt || '',
      price: x.price || x.budget || null,
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bookmark size={24} color="var(--gold)" />
          <div>
            <h1 className="section-title" style={{ marginBottom: 2 }}>Collections</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Save castings, campaigns, events and marketplace listings you want to keep.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={15} /> New collection</button>
      </div>

      {cols.length === 0 ? (
        <EmptyState title="No collections yet" message="Create a collection to organise the opportunities and listings you find." action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={15} /> Create collection</button>} />
      ) : (
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
          {cols.map((c) => (
            <div key={c.id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }} onClick={() => openCol(c)}>
              {c.coverImageUrl ? (
                <div style={{ aspectRatio: '16/10', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-soft)' }}>
                  <img src={assetUrl(c.coverImageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ aspectRatio: '16/10', borderRadius: 10, background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.05))', display: 'grid', placeItems: 'center' }}>
                  <FolderOpen size={34} color="#8B5CF6" />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</strong>
                {c.isPublic ? <Globe size={13} color="var(--text-faint)" title="Public" /> : <Lock size={13} color="var(--text-faint)" title="Private" />}
                <button className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.15)', color: '#FDA4AF' }} onClick={(e) => { e.stopPropagation(); removeCol(c) }} title="Delete"><Trash2 size={13} /></button>
              </div>
              <small style={{ color: 'var(--text-faint)' }}>{c.itemsCount || 0} items · {new Date(c.createdAt).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New collection">
        <form onSubmit={create}>
          <div className="field"><label>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dream castings" /></div>
          <div className="field"><label>Description (optional)</label><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this collection for?" /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
            <span style={{ fontSize: 13.5 }}>Make public</span>
          </label>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={creating} type="submit">{creating ? 'Creating…' : 'Create collection'}</button>
        </form>
      </Modal>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name || 'Collection'} width={680}>
        {itemsLoading ? <PageLoader /> : items.length === 0 ? (
          <EmptyState title="Nothing saved yet" message={`Add castings, campaigns, events or listings to "${open?.name}".`} action={<button className="btn btn-primary" onClick={() => openAdd('listing')}><Plus size={15} /> Add items</button>} />
        ) : (
          <>
            <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              {items.map((it) => {
                const meta = itemMeta(it)
                const typeColors = { listing: '#10B981', casting: '#F59E0B', campaign: '#3B82F6', event: '#8B5CF6' }
                const typeColor = typeColors[it.targetType] || '#6B7280'
                const body = (
                  <div style={{ padding: 0, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 100, position: 'relative', overflow: 'hidden' }}>
                      {meta.img ? <img src={assetUrl(meta.img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${typeColor}25, ${typeColor}08)`, display: 'grid', placeItems: 'center' }}>
                          <span style={{ fontSize: 28, fontWeight: 700, color: typeColor }}>{String(it.targetType)[0].toUpperCase()}</span>
                        </div>
                      )}
                      <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, color: typeColor, background: `${typeColor}25`, backdropFilter: 'blur(8px)' }}>
                        {String(it.targetType).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <strong style={{ fontSize: 13, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{meta.title}</strong>
                      {meta.desc && <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{meta.desc}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', paddingTop: 6, color: 'var(--text-faint)', fontSize: 11 }}>
                        {meta.price != null && <span style={{ color: '#10B981', fontWeight: 600 }}>${meta.price}</span>}
                        {meta.date && <span>{new Date(meta.date).toLocaleDateString()}</span>}
                        {meta.route && <ArrowRight size={11} style={{ marginLeft: 'auto', color: typeColor }} />}
                      </div>
                    </div>
                  </div>
                )
                return meta.route ? (
                  <Link key={it.id} to={meta.route} className="card" style={{ padding: 0, overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}>{body}</Link>
                ) : (
                  <div key={it.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>{body}</div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => openAdd('listing')}><Plus size={15} /> Add more</button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={`Add to "${open?.name}"`} width={620}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {[['listing', 'Listings'], ['casting', 'Castings'], ['campaign', 'Campaigns'], ['event', 'Events']].map(([id, label]) => (
            <button key={id} className={`badge ${targetType === id ? 'badge-gold' : ''}`} style={{ cursor: 'pointer', padding: '7px 14px' }} onClick={() => { setTargetType(id); setSearch(''); loadTargets(id) }}>{label}</button>
          ))}
        </div>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input style={{ paddingLeft: 36 }} placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filteredTargets.length === 0 ? <EmptyState title="Nothing found" message="No items in this category." /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflow: 'auto' }}>
            {filteredTargets.map((t) => (
              <div key={t.id} className="card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                {t.img ? <img src={assetUrl(t.img)} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} /> : <span style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg-soft)', display: 'grid', placeItems: 'center', color: 'var(--text-faint)', fontWeight: 700 }}>{String(t.title)[0]}</span>}
                <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>{t.title}</span>
                <button className="btn btn-primary btn-sm" onClick={() => addItem(t)} disabled={addingId === t.id}>{addingId === t.id ? 'Adding…' : <><Eye size={13} /> Add</>}</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
