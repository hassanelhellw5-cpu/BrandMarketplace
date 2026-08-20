import { useState, useEffect, useCallback } from 'react'
import { Store, MapPin, ImagePlus, X, DollarSign, Plus, Trash2, ShoppingCart, MessageSquare, Package, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'
import { get, post, put, del, upload, errMsg, assetUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { Pagination, EmptyState } from '../components/ui'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { reportProductView, reportPurchase } from '../hooks/usePageTracking'

const parseJson = (s, f) => { try { const v = JSON.parse(s); return Array.isArray(v) ? v : f } catch { return f } }

export default function Marketplace() {
  const { user, isAuthed, hasRole } = useAuth()
  const isModel = hasRole('Model')
  const canSell = hasRole('Brand', 'Agency')
  const toast = useToast()
  const [q, setQ] = useState('')
  const [data, setData] = useState({ data: [], total: 0 })
  const [mine, setMine] = useState([])
  const [orders, setOrders] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [loading, setLoading] = useState(true)
  const [sellOpen, setSellOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [image, setImage] = useState(null)
  const [tab, setTab] = useState('browse')
  const [buyOpen, setBuyOpen] = useState(null)
  const [buyMessage, setBuyMessage] = useState('')
  const [buySending, setBuySending] = useState(false)
  const [editListing, setEditListing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (q.trim()) params.search = q.trim()
      const res = await get('/enterprise/marketplace', params)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [q, page, pageSize])

  const loadMine = useCallback(async () => {
    try {
      const res = await get('/enterprise/marketplace/my', { pageSize: 50 })
      setMine(res.data || [])
    } catch { setMine([]) }
  }, [])

  const loadOrders = useCallback(async () => {
    try {
      const res = await get('/enterprise/marketplace/orders', { pageSize: 50 })
      setOrders(res.data || [])
    } catch { setOrders([]) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (tab === 'mine' && isAuthed) loadMine()
    if (tab === 'orders' && isAuthed) loadOrders()
  }, [tab, isAuthed, loadMine, loadOrders])

  const createListing = async (e) => {
    e.preventDefault()
    if (!form.title?.trim() || !form.category) { toast.error('Title and category are required'); return }
    setSaving(true)
    try {
      let imageUrls = '[]'
      if (image) {
        const fd = new FormData()
        fd.append('files', image)
        const res = await upload('/uploads?folder=marketplace', fd)
        const f = res.files?.[0]
        if (f) imageUrls = JSON.stringify([f.url || `/${f.path}`])
      }
      const body = {
        title: form.title,
        description: form.description,
        category: form.category,
        price: form.price ? Number(form.price) : 0,
        currency: form.currency || 'USD',
        pricingType: form.pricingType || 'Fixed',
        imageUrls,
        location: form.location,
      }
      if (editListing) {
        await put(`/enterprise/marketplace/${editListing.id}`, body)
        toast.success('Listing updated')
      } else {
        await post('/enterprise/marketplace', body)
        toast.success('Listing published')
      }
      setSellOpen(false)
      setEditListing(null)
      setForm({})
      setImage(null)
      if (tab === 'mine') loadMine()
      else { setTab('mine'); loadMine() }
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  const deleteListing = async (id) => {
    setDeleting(true)
    try {
      await del(`/enterprise/marketplace/${id}`)
      toast.success('Listing removed')
      setMine((l) => l.filter((x) => x.id !== id))
      setDeleteTarget(null)
    } catch (err) { toast.error(errMsg(err)) } finally { setDeleting(false) }
  }

  const buyListing = async () => {
    if (!buyOpen) return
    setBuySending(true)
    try {
      await post(`/enterprise/marketplace/${buyOpen.id}/buy`, { message: buyMessage })
      reportPurchase(buyOpen.id, buyOpen.name || buyOpen.title || 'Product', buyOpen.price)
      toast.success('Order placed! The seller will be notified.')
      setBuyOpen(null)
      setBuyMessage('')
      setTab('orders')
      loadOrders()
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setBuySending(false)
    }
  }

  const updateOrder = async (orderId, status) => {
    try {
      await put(`/enterprise/marketplace/orders/${orderId}`, { status })
      toast.success(`Order ${status.toLowerCase()}`)
      loadOrders()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const openEditModal = (l) => {
    const imgs = parseJson(l.imageUrls, [])
    setEditListing(l)
    setForm({
      title: l.title,
      description: l.description || '',
      category: l.category,
      price: l.price,
      currency: l.currency || 'USD',
      pricingType: l.pricingType || 'Fixed',
      location: l.location || '',
    })
    setImage(null)
    setSellOpen(true)
  }

  const ListingCard = ({ l, showActions }) => {
    const imgs = parseJson(l.imageUrls, [])
    const sellerName = l.sellerName || l.SellerUserId?.slice(0, 8) || 'Seller'
    return (
      <div className="listing-card">
        <div className="listing-cover" style={{ cursor: 'pointer' }} onClick={() => !showActions && setBuyOpen(l)}>
          {imgs[0] ? <img src={assetUrl(imgs[0])} alt={l.title} /> : <span className="listing-fallback"><Store size={26} /></span>}
          <span className="badge badge-gold">{l.pricingType || 'Fixed'}</span>
        </div>
        <div className="listing-body">
          <h3>{l.title}</h3>
          <p>{l.description?.slice(0, 80) || ''}</p>
          <div className="listing-meta">
            <span><MapPin size={13} /> {l.location || 'Online'}</span>
            <strong><DollarSign size={13} /> {l.price}</strong>
          </div>
          {!showActions && (
            <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 12 }} onClick={() => setBuyOpen(l)}>
              <ShoppingCart size={14} /> Buy now
            </button>
          )}
          {showActions && (
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEditModal(l)}>Edit</button>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', flex: 1 }} onClick={() => setDeleteTarget(l)}>Delete</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const OrderRow = ({ o }) => {
    const isBuyer = o.buyerUserId === user?.id
    const statusColors = {
      Pending: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', icon: Clock },
      Accepted: { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6', icon: CheckCircle },
      Completed: { bg: 'rgba(16,185,129,0.12)', color: '#10B981', icon: CheckCircle },
      Rejected: { bg: 'rgba(244,63,94,0.12)', color: '#F43F5E', icon: XCircle },
      Cancelled: { bg: 'rgba(107,107,128,0.12)', color: '#6B6B80', icon: XCircle },
    }
    const s = statusColors[o.status] || statusColors.Pending
    const SIcon = s.icon
    return (
      <div className="card" style={{ padding: '16px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--grad-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Package size={20} style={{ color: 'var(--primary)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{o.listingTitle || `Listing #${o.listingId}`}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
            {isBuyer ? `Seller: ${o.sellerName}` : `Buyer: ${o.buyerName}`}
            {o.message && <span style={{ marginLeft: 8, color: 'var(--text-faint)' }}>"{o.message.slice(0, 50)}"</span>}
          </div>
        </div>
        <div style={{ fontWeight: 700, color: 'var(--primary-2)', fontSize: 15, whiteSpace: 'nowrap' }}>${o.amount}</div>
        <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', gap: 5 }}>
          <SIcon size={12} /> {o.status}
        </span>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
        {isBuyer && o.status === 'Pending' && (
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => updateOrder(o.id, 'Cancelled')}>Cancel</button>
        )}
        {!isBuyer && o.status === 'Pending' && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => updateOrder(o.id, 'Rejected')}>Reject</button>
            <button className="btn btn-primary btn-sm" onClick={() => updateOrder(o.id, 'Accepted')}>Accept</button>
          </div>
        )}
        {!isBuyer && o.status === 'Accepted' && (
          <button className="btn btn-success btn-sm" onClick={() => updateOrder(o.id, 'Completed')}>Complete</button>
        )}
      </div>
    )
  }

  return (
    <div>
      <section className="explore-hero">
        <div className="container">
          <h1 className="fade-up">Creator <span className="grad-text">marketplace</span></h1>
          <p className="fade-up" style={{ animationDelay: '0.1s' }}>Photography, studio time, production gear, styling and more — buy and sell services & assets.</p>
          <div className="fade-up" style={{ animationDelay: '0.12s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, margin: '16px 0 20px', maxWidth: 700 }}>
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
              <strong style={{ fontSize: 13, color: '#EC4899' }}>Who can sell?</strong>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '4px 0 0' }}>Brands and Agencies list services, studio time, production gear and professional offerings.</p>
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <strong style={{ fontSize: 13, color: '#10B981' }}>Who can buy?</strong>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '4px 0 0' }}>Models and creators browse and purchase professional services, equipment and studio access.</p>
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <strong style={{ fontSize: 13, color: '#8B5CF6' }}>What's available?</strong>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '4px 0 0' }}>Photography, styling, studio time, production gear, makeup, content creation, location scouting.</p>
            </div>
          </div>
          <form className="explore-search fade-up" style={{ animationDelay: '0.15s' }} onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
            <Store size={19} />
            <input placeholder="Search listings (studio, styling, gear…)…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-primary btn-sm" type="submit">Search</button>
          </form>
        </div>
      </section>

      <section className="container" style={{ padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div className="profile-tabs" style={{ marginBottom: 0 }}>
            <button className={`profile-tab${tab === 'browse' ? ' active' : ''}`} onClick={() => setTab('browse')}>Browse</button>
            {canSell && <button className={`profile-tab${tab === 'mine' ? ' active' : ''}`} onClick={() => (isAuthed ? setTab('mine') : toast.info('Log in to manage listings'))}>My listings</button>}
            <button className={`profile-tab${tab === 'orders' ? ' active' : ''}`} onClick={() => (isAuthed ? setTab('orders') : toast.info('Log in to view orders'))}>Orders</button>
          </div>
          {canSell && (
            <button className="btn btn-primary" onClick={() => { if (!isAuthed) { toast.info('Log in to sell services'); return } setEditListing(null); setForm({}); setImage(null); setSellOpen(true) }}>
              <Plus size={16} /> Sell a service
            </button>
          )}
          {isModel && (
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Browse and purchase services from brands & agencies</span>
          )}
        </div>

        {tab === 'browse' && (
          <>
            <div className="grid-auto grid-4">
              {loading ? [1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="skeleton" style={{ height: 260 }} />)
                : data.data.map((l) => <ListingCard key={l.id} l={l} />)}
            </div>
            {!loading && data.data.length === 0 && <EmptyState title="Nothing listed yet" message="Creators will list services and assets here." />}
            <Pagination page={page} pageSize={pageSize} total={data.total} onPage={setPage} />
          </>
        )}

        {tab === 'mine' && canSell && (
          <>
            {mine.length === 0 ? <EmptyState title="No listings yet" message="List your services or gear to start selling." action={<button className="btn btn-primary" onClick={() => setSellOpen(true)}><Plus size={16} /> Create a listing</button>} /> : (
              <div className="grid-auto grid-4">
                {mine.map((l) => <ListingCard key={l.id} l={l} showActions />)}
              </div>
            )}
          </>
        )}

        {tab === 'orders' && (
          <>
            {orders.length === 0 ? (
              <EmptyState title="No orders yet" message="Orders will appear here when you buy or sell services." icon={<Package size={40} />} />
            ) : (
              <div>{orders.map((o) => <OrderRow key={o.id} o={o} />)}</div>
            )}
          </>
        )}
      </section>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove listing"
        message={`Delete "${deleteTarget?.title || 'this listing'}" permanently? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteListing(deleteTarget.id)}
      />

      {/* Buy modal */}
      <Modal open={!!buyOpen} onClose={() => setBuyOpen(null)} title="Buy this service" width={500}>
        {buyOpen && (
          <div>
            <div style={{ display: 'flex', gap: 14, padding: '14px', background: 'var(--bg)', borderRadius: 12, marginBottom: 18 }}>
              <div style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--surface-2)' }}>
                {(() => { const imgs = parseJson(buyOpen.imageUrls, []); return imgs[0] ? <img src={assetUrl(imgs[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}><Store size={22} style={{ color: 'var(--text-faint)' }} /></div> })()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{buyOpen.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{buyOpen.category}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-2)', marginTop: 4 }}>${buyOpen.price}</div>
              </div>
            </div>
            <div className="field">
              <label>Message to seller (optional)</label>
              <textarea rows={3} value={buyMessage} onChange={(e) => setBuyMessage(e.target.value)} placeholder="Tell the seller what you need, preferred dates, etc." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setBuyOpen(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={buyListing} disabled={buySending}>
                <ShoppingCart size={15} /> {buySending ? 'Placing order…' : 'Place order'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Sell/Edit modal */}
      <Modal open={sellOpen} onClose={() => { setSellOpen(false); setEditListing(null) }} title={editListing ? 'Edit listing' : 'List a service or asset'} width={600}>
        <form onSubmit={createListing}>
          <div className="field"><label>Title *</label><input required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Studio photoshoot 2 hours" /></div>
          <div className="field"><label>Description</label><textarea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field"><label>Category *</label>
              <select required value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select…</option>
                {['Photography', 'Styling', 'Studio time', 'Production gear', 'Makeup', 'Modeling services', 'Content creation', 'Location scouting'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Pricing</label>
              <select value={form.pricingType || 'Fixed'} onChange={(e) => setForm({ ...form, pricingType: e.target.value })}>
                {['Fixed', 'Hourly', 'Per shoot', 'Negotiable'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field"><label>Price ($)</label><input type="number" min="0" value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div className="field"><label>Currency</label>
              <select value={form.currency || 'USD'} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {['USD', 'EUR', 'GBP', 'EGP', 'AED', 'SAR', 'TRY'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Location</label><input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City or Online" /></div>
          </div>
          <div className="field">
            <label>Cover image</label>
            {image ? (
              <div style={{ position: 'relative', width: 140 }}>
                <img src={URL.createObjectURL(image)} alt="" style={{ width: 140, height: 105, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
                <button type="button" style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 50, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }} onClick={() => setImage(null)}><X size={13} /></button>
              </div>
            ) : (
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <ImagePlus size={15} /> Upload image
                <input type="file" accept="image/*" hidden onChange={(e) => setImage(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => { setSellOpen(false); setEditListing(null) }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editListing ? 'Update listing' : 'Publish listing'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
