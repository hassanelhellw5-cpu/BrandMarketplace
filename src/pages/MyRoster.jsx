import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, Trash2, User as UserIcon, Crown, ShieldCheck } from 'lucide-react'
import { get, del, assetUrl, errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import './MyRoster.css'

const avatar = (m) => (m.profilePictureUrl ? <img src={assetUrl(m.profilePictureUrl)} alt={m.displayName} className="roster-avatar-img" /> : <span className="roster-avatar-fallback"><UserIcon size={16} /></span>)

export default function MyRoster() {
  const { user } = useAuth()
  const sub = useSubscription()
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await get('/roster', { pageSize: 100 })
      setRows(res.data || [])
      setTotal(res.total || 0)
    } catch (e) { toast.error(errMsg(e)) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const rosterLimit = sub.limit('roster')
  const rosterCan = sub.can('roster')
  const atLimit = rosterCan && rosterLimit !== null && total >= rosterLimit

  const remove = async (m) => {
    setRemoving(m.modelUserId)
    try {
      await del(`/roster/${m.modelUserId}`)
      toast.success(`${m.displayName} removed from roster`)
      load()
    } catch (e) { toast.error(errMsg(e)) } finally { setRemoving(null) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 980 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 26 }}>
        <div>
          <span className="badge" style={{ marginBottom: 8 }}>Roster</span>
          <h1 className="section-title">My <span className="grad-text">model roster</span></h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
            The models you represent — add them from their public profile.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {rosterCan && rosterLimit !== null && (
            <span className="badge" style={{ marginBottom: 0 }}>{total} / {rosterLimit} models</span>
          )}
          <Link to="/explore" className="btn btn-primary"><Plus size={16} /> Find models</Link>
        </div>
      </div>

      {!rosterCan && (
        <div className="card" style={{ padding: 18, marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="badge"><ShieldCheck size={13} /> Roster</span>
            <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>Building a roster is a paid feature. On the Starter plan you get up to 5 models.</p>
          </div>
          <Link to="/plans" className="btn btn-primary btn-sm"><Crown size={14} /> Upgrade</Link>
        </div>
      )}

      {atLimit && (
        <div className="card" style={{ padding: 18, marginBottom: 22 }}>
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5 }}>
            You reached the {rosterLimit}-model limit on your current plan. <Link to="/plans" style={{ color: 'var(--primary-2)', fontWeight: 600 }}>Upgrade for an unlimited roster.</Link>
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No models in your roster"
          message="Browse models on Explore and add them to their profile."
          action={<Link to="/explore" className="btn btn-primary"><Plus size={16} /> Browse models</Link>}
        />
      ) : (
        <div className="grid-auto grid-3">
          {rows.map((m) => (
            <div key={m.modelUserId} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {avatar(m)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/u/${m.modelUserId}`} style={{ fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.displayName}</Link>
                  {m.userName && <div style={{ color: 'var(--text-faint)', fontSize: 12.5 }}>@{m.userName}</div>}
                  <div style={{ color: 'var(--text-faint)', fontSize: 12, marginTop: 3 }}>Added {new Date(m.addedAt).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <Link to={`/u/${m.modelUserId}`} className="btn btn-outline btn-sm" style={{ flex: 1 }}><Users size={14} /> View profile</Link>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(m)} disabled={removing === m.modelUserId}>
                  {removing === m.modelUserId ? 'Removing…' : <><Trash2 size={14} /> Remove</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
