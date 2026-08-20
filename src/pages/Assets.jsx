import { useState, useEffect, useRef } from 'react'
import { FolderPlus, Upload, Search, Trash2, Download, Eye, EyeOff, FileText, Folder, Image as ImageIcon, Film, Music, FileArchive, Grid, List, X } from 'lucide-react'
import { get, post, put, del, upload, errMsg, assetUrl } from '../api/client'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'

const bytes = (n) => {
  if (n == null) return ''
  if (n === 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1)
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`
}

const FileIcon = ({ type, size = 28 }) => {
  const t = String(type || '').toLowerCase()
  if (t.startsWith('image')) return <ImageIcon size={size} color="#8B5CF6" />
  if (t.startsWith('video')) return <Film size={size} color="#3B82F6" />
  if (t.startsWith('audio')) return <Music size={size} color="#10B981" />
  if (t.includes('zip') || t.includes('archive') || t.includes('rar')) return <FileArchive size={size} color="#F59E0B" />
  return <FileText size={size} color="var(--text-dim)" />
}

const isImage = (a) => String(a.fileType || '').toLowerCase().startsWith('image')

export default function Assets() {
  const toast = useToast()
  const [assets, setAssets] = useState({ data: [] })
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [folder, setFolder] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [folderForm, setFolderForm] = useState({ name: '', color: '#8B5CF6', description: '' })
  const [selFiles, setSelFiles] = useState([])
  const [viewMode, setViewMode] = useState('grid')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewAsset, setPreviewAsset] = useState(null)
  const fileRef = useRef(null)

  const loadFolders = async () => {
    try { const r = await get('/assets/folders'); setFolders(r.data || []) } catch { setFolders([]) }
  }

  const loadAssets = async () => {
    setLoading(true)
    try {
      const r = await get('/assets', { folderId: folder, search: search || undefined, page, pageSize: 24 })
      setAssets(r)
    } catch { setAssets({ data: [] }) } finally { setLoading(false) }
  }

  useEffect(() => { loadFolders() }, [])
  useEffect(() => { loadAssets() }, [folder, search, page])

  const pickFiles = (e) => setSelFiles(Array.from(e.target.files || []))

  const doUpload = async () => {
    if (selFiles.length === 0) return
    setUploading(true)
    let done = 0
    for (const f of selFiles) {
      try {
        const fd = new FormData()
        fd.append('files', f)
        const res = await upload('/uploads?folder=assets', fd)
        const up = res.files?.[0] || res
        const url = up.url || up.fileUrl || up.path || up.filePath
        if (!url) continue
        await post('/assets', {
          name: f.name.replace(/\.[^.]+$/, ''), description: '',
          fileType: f.type || 'file', fileExtension: (f.name.split('.').pop() || '').toLowerCase(),
          fileSize: f.size, fileUrl: url, thumbnailUrl: (f.type || '').startsWith('image') ? url : null,
          folderId: folder, isPublic: true,
        })
        done += 1
      } catch { /* skip */ }
    }
    setUploading(false)
    if (done > 0) { toast.success(`${done} file${done > 1 ? 's' : ''} uploaded`); setSelFiles([]); setUploadOpen(false); loadAssets() }
    else toast.error('Upload failed')
  }

  const createFolder = async (e) => {
    e.preventDefault()
    if (!folderForm.name.trim()) { toast.error('Folder name is required'); return }
    try {
      await post('/assets/folders', folderForm)
      toast.success('Folder created')
      setFolderForm({ name: '', color: '#8B5CF6', description: '' })
      setFolderOpen(false)
      loadFolders()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const deleteFolder = async (f) => {
    if (!window.confirm(`Delete folder "${f.name}"? Assets move to the library root.`)) return
    try { await del(`/assets/folders/${f.id}`); toast.success('Folder deleted'); if (folder === f.id) setFolder(null); loadFolders() }
    catch (err) { toast.error(errMsg(err)) }
  }

  const removeAsset = async (a) => {
    if (!window.confirm('Delete this file?')) return
    try { await del(`/assets/${a.id}`); toast.success('File deleted'); loadAssets() }
    catch (err) { toast.error(errMsg(err)) }
  }

  const togglePublic = async (a) => {
    try { await put(`/assets/${a.id}`, { ...a, isPublic: !a.isPublic }); loadAssets() }
    catch (err) { toast.error(errMsg(err)) }
  }

  const download = async (a) => {
    try {
      const url = assetUrl(a.fileUrl)
      const res = await get(`/assets/${a.id}/download`, {})
      const link = res?.url || res?.downloadUrl || url
      const aEl = document.createElement('a')
      aEl.href = assetUrl(link)
      aEl.download = a.name || 'file'
      aEl.target = '_blank'
      aEl.rel = 'noreferrer'
      aEl.click()
    } catch { window.open(assetUrl(a.fileUrl), '_blank') }
  }

  const total = assets.total || assets.data.length || 0
  const activeFolder = folders.find((f) => f.id === folder)

  if (loading && assets.data.length === 0) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'grid', placeItems: 'center' }}>
            <ImageIcon size={22} color="#fff" />
          </div>
          <div>
            <h1 className="section-title" style={{ marginBottom: 2 }}>Media library</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{total} file{total === 1 ? '' : 's'} · Store, organize and share your brand assets</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setFolderOpen(true)}><FolderPlus size={15} /> New folder</button>
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Upload files</button>
          <input ref={fileRef} type="file" multiple hidden onChange={pickFiles} />
        </div>
      </div>

      {/* Selected files banner */}
      {selFiles.length > 0 && (
        <div className="card" style={{ margin: '0 0 18px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.06))', border: '1px solid rgba(139,92,246,0.25)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'grid', placeItems: 'center' }}>
            <Upload size={16} color="var(--primary)" />
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>{selFiles.length} file{selFiles.length > 1 ? 's' : ''} selected</strong>
            <small style={{ display: 'block', color: 'var(--text-dim)', fontSize: 12, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selFiles.map((f) => f.name).join(', ')}</small>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelFiles([])}><X size={14} /> Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={doUpload} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload now'}</button>
          </div>
        </div>
      )}

      {/* Folders + Search bar */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Folders */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <button className={`badge ${!folder ? 'badge-gold' : ''}`} style={{ cursor: 'pointer', padding: '8px 14px' }} onClick={() => setFolder(null)}>
            <Folder size={13} /> All files
          </button>
          {folders.map((f) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className={`badge ${folder === f.id ? 'badge-gold' : ''}`} style={{ cursor: 'pointer', padding: '8px 14px' }} onClick={() => setFolder(f.id)}>
                <Folder size={13} color={f.color || 'var(--text-dim)'} /> {f.name} <span style={{ opacity: 0.6 }}>({f.itemsCount || 0})</span>
              </button>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: '10px 14px 10px 38px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            placeholder="Search files..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'var(--surface-2)', border: 'none', borderRadius: 6, width: 22, height: 22, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--text-dim)' }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* View mode */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 10, padding: 3 }}>
          <button onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? 'var(--primary)' : 'transparent', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#fff', display: 'grid', placeItems: 'center' }}><Grid size={14} /></button>
          <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--primary)' : 'transparent', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#fff', display: 'grid', placeItems: 'center' }}><List size={14} /></button>
        </div>
      </div>

      {/* Delete folder button */}
      {activeFolder && (
        <div style={{ marginBottom: 14 }}>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteFolder(activeFolder)}>
            <Trash2 size={13} /> Delete "{activeFolder.name}" folder
          </button>
        </div>
      )}

      {/* Content */}
      {assets.data.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))', display: 'inline-grid', placeItems: 'center', marginBottom: 14 }}>
            <ImageIcon size={24} color="var(--primary)" />
          </div>
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>{search || folder ? 'No matching files' : 'Your library is empty'}</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 18 }}>
            {search || folder ? 'Try a different search or folder.' : 'Upload photos, videos, documents and portfolios to keep them in one place.'}
          </p>
          {search || folder ? (
            <button className="btn btn-primary" onClick={() => { setSearch(''); setFolder(null) }}>Clear filters</button>
          ) : (
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Upload files</button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: 14 }}>
          {assets.data.map((a) => (
            <div key={a.id} className="card" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, transition: 'border-color 0.2s', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              onClick={() => { setPreviewAsset(a); setPreviewOpen(true) }}>
              {isImage(a) ? (
                <div style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-soft)' }}>
                  <img src={assetUrl(a.thumbnailUrl || a.fileUrl)} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ aspectRatio: '1', borderRadius: 10, background: 'var(--bg-soft)', display: 'grid', placeItems: 'center' }}>
                  <FileIcon type={a.fileType} />
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</strong>
                <small style={{ color: 'var(--text-faint)', fontSize: 11.5 }}>
                  {String(a.fileType || a.fileExtension || 'file').toUpperCase()} · {bytes(a.fileSize)}
                </small>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', flex: 1 }} onClick={(e) => { e.stopPropagation(); download(a) }} title="Download"><Download size={13} /></button>
                <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }} onClick={(e) => { e.stopPropagation(); togglePublic(a) }} title={a.isPublic ? 'Public' : 'Private'}>{a.isPublic ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                <button className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.15)', color: '#FDA4AF' }} onClick={(e) => { e.stopPropagation(); removeAsset(a) }} title="Delete"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {assets.data.map((a) => (
            <div key={a.id} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)', transition: 'background 0.15s', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-soft)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              onClick={() => { setPreviewAsset(a); setPreviewOpen(true) }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-soft)', display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {isImage(a) ? <img src={assetUrl(a.thumbnailUrl || a.fileUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FileIcon type={a.fileType} size={18} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 14 }}>{a.name}</strong>
                <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{String(a.fileType || a.fileExtension || 'file').toUpperCase()} · {bytes(a.fileSize)}</small>
              </div>
              <small style={{ color: 'var(--text-faint)', fontSize: 12, flexShrink: 0 }}>{a.downloadCount || 0} downloads</small>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }} onClick={(e) => { e.stopPropagation(); download(a) }}><Download size={13} /></button>
                <button className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.15)', color: '#FDA4AF' }} onClick={(e) => { e.stopPropagation(); removeAsset(a) }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New folder modal */}
      <Modal open={folderOpen} onClose={() => setFolderOpen(false)} title="New folder">
        <form onSubmit={createFolder}>
          <div className="field"><label>Folder name *</label><input value={folderForm.name} onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })} placeholder="e.g. Campaign assets" /></div>
          <div className="field"><label>Description (optional)</label><input value={folderForm.description} onChange={(e) => setFolderForm({ ...folderForm, description: e.target.value })} placeholder="What belongs in this folder?" /></div>
          <div className="field"><label>Colour</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#8f6b1e'].map((c) => (
                <button type="button" key={c} onClick={() => setFolderForm({ ...folderForm, color: c })} style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: folderForm.color === c ? '3px solid #fff' : '3px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Create folder</button>
        </form>
      </Modal>

      {/* Preview modal */}
      <Modal open={previewOpen} onClose={() => { setPreviewOpen(false); setPreviewAsset(null) }} title={previewAsset?.name || 'Preview'} width={640}>
        {previewAsset && (
          <div>
            {isImage(previewAsset) ? (
              <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: 'var(--bg-soft)' }}>
                <img src={assetUrl(previewAsset.fileUrl)} alt={previewAsset.name} style={{ width: '100%', maxHeight: 400, objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ padding: 60, textAlign: 'center', borderRadius: 12, background: 'var(--bg-soft)', marginBottom: 16 }}>
                <FileIcon type={previewAsset.fileType} size={48} />
                <p style={{ color: 'var(--text-dim)', marginTop: 12 }}>{String(previewAsset.fileType || '').toUpperCase()}</p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-soft)' }}>
                <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>Size</small>
                <strong style={{ display: 'block', fontSize: 14 }}>{bytes(previewAsset.fileSize)}</strong>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-soft)' }}>
                <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>Type</small>
                <strong style={{ display: 'block', fontSize: 14 }}>{String(previewAsset.fileType || '').toUpperCase()}</strong>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-soft)' }}>
                <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>Visibility</small>
                <strong style={{ display: 'block', fontSize: 14 }}>{previewAsset.isPublic ? 'Public' : 'Private'}</strong>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-soft)' }}>
                <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>Downloads</small>
                <strong style={{ display: 'block', fontSize: 14 }}>{previewAsset.downloadCount || 0}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => download(previewAsset)}><Download size={15} /> Download</button>
              <button className="btn btn-outline" onClick={() => togglePublic(previewAsset)}>{previewAsset.isPublic ? <EyeOff size={15} /> : <Eye size={15} />} {previewAsset.isPublic ? 'Make private' : 'Make public'}</button>
              <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'rgba(244,63,94,0.4)' }} onClick={() => { removeAsset(previewAsset); setPreviewOpen(false) }}><Trash2 size={15} /></button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
