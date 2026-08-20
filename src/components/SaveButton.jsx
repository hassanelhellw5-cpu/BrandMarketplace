import { useState } from 'react'
import { Bookmark, BookmarkCheck, Plus, Check, FolderPlus } from 'lucide-react'
import { get, post, errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import Modal from './Modal'
import { PageLoader } from './ui'

export default function SaveButton({ targetType, targetId, targetTitle, size, block, variant }) {
  const { isAuthed } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cols, setCols] = useState([])
  const [savedIn, setSavedIn] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const scanCollections = async (list) => {
    const found = {}
    await Promise.all((list || []).map(async (c) => {
      try {
        const ir = await get(`/collections/${c.id}/items`)
        const its = Array.isArray(ir) ? ir : ir.data || []
        if (its.some((x) => String(x.targetType) === targetType && Number(x.targetId) === Number(targetId))) found[c.id] = true
      } catch { }
    }))
    return found
  }

  const openPicker = async () => {
    if (!isAuthed) { toast.info('Please log in to save'); return }
    setOpen(true)
    setLoading(true)
    try {
      const r = await get('/collections', { pageSize: 100 })
      const list = Array.isArray(r) ? r : r.data || []
      setCols(list)
      setSavedIn(await scanCollections(list))
    } catch (e) { toast.error(errMsg(e)) } finally { setLoading(false) }
  }

  const addTo = async (c) => {
    if (savedIn[c.id]) return
    setSavingId(c.id)
    try {
      await post(`/collections/${c.id}/items`, { targetType, targetId: Number(targetId), notes: targetTitle || '' })
      setSavedIn((s) => ({ ...s, [c.id]: true }))
      toast.success(`Saved to "${c.name}"`)
    } catch (e) { toast.error(errMsg(e)) } finally { setSavingId(null) }
  }

  const createAndAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) { toast.error('Name the collection'); return }
    setCreating(true)
    try {
      const c = await post('/collections', { name: newName.trim(), description: targetTitle ? `Saved from ${targetTitle}` : '', isPublic: false })
      const r = await get('/collections', { pageSize: 100 })
      setCols(Array.isArray(r) ? r : r.data || [])
      await post(`/collections/${c.id}/items`, { targetType, targetId: Number(targetId), notes: targetTitle || '' })
      setSavedIn((s) => ({ ...s, [c.id]: true }))
      setNewName('')
      toast.success(`Saved to "${c.name}"`)
    } catch (err) { toast.error(errMsg(err)) } finally { setCreating(false) }
  }

  const anySaved = Object.keys(savedIn).length > 0

  return (
    <>
      <button
        className={`btn ${anySaved ? 'btn-ghost' : variant || 'btn-outline'}${size ? ` ${size}` : ''}`}
        style={block ? { width: '100%' } : undefined}
        onClick={openPicker}
      >
        {anySaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        {anySaved ? 'Saved' : 'Save'}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Save to collection" width={520}>
        {loading ? <PageLoader /> : cols.length === 0 ? (
          <div>
            <p style={{ color: 'var(--text-dim)', marginBottom: 18, fontSize: 14 }}>You don't have any collections yet — create one to save this.</p>
            <form onSubmit={createAndAdd} style={{ display: 'flex', gap: 10 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Collection name"
                style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: '11px 15px', color: 'var(--text)', fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.18)' }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none' }}
              />
              <button className="btn btn-primary btn-sm" disabled={creating} type="submit"><FolderPlus size={15} /> {creating ? 'Creating…' : 'Create & save'}</button>
            </form>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflow: 'auto' }}>
              {cols.map((c) => {
                const saved = !!savedIn[c.id]
                return (
                  <button
                    key={c.id}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textAlign: 'left',
                      cursor: saved ? 'default' : 'pointer',
                      background: saved ? 'rgba(16,185,129,0.06)' : 'var(--bg)',
                      border: `1px solid ${saved ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
                      borderRadius: 12,
                      color: 'var(--text)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { if (!saved) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'rgba(139,92,246,0.06)' } }}
                    onMouseLeave={(e) => { if (!saved) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' } }}
                    onClick={() => addTo(c)}
                    disabled={saved}
                  >
                    <span style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: saved ? 'rgba(16,185,129,0.12)' : 'var(--surface-2)',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                    }}>
                      {saved ? <Check size={16} color="#10B981" /> : <Plus size={16} color="var(--text-dim)" />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 14, display: 'block', fontWeight: 600 }}>{c.name}</strong>
                      <small style={{ color: 'var(--text-faint)', fontSize: 12 }}>{c.itemsCount || 0} items</small>
                    </span>
                    {savingId === c.id && <small style={{ color: 'var(--primary)', fontSize: 12 }}>Saving…</small>}
                    {saved && <span className="badge badge-green">Saved</span>}
                  </button>
                )
              })}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14 }}>
              <form onSubmit={createAndAdd} style={{ display: 'flex', gap: 10 }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New collection name…"
                  style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: '11px 15px', color: 'var(--text)', fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.18)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none' }}
                />
                <button className="btn btn-primary btn-sm" disabled={creating} type="submit">
                  {creating ? 'Creating…' : <><Plus size={15} /> Create</>}
                </button>
              </form>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
