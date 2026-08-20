import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Award, Trophy, Crown, Wallet, MonitorSmartphone, ShieldCheck, Gift, Copy, Trash2, Plus, CheckCircle2, Zap } from 'lucide-react'
import { get, post, del, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'

const TABS = [
  ['overview', 'Overview', Trophy],
  ['wallet', 'eWallet', Wallet],
  ['devices', 'Devices', MonitorSmartphone],
  ['kyc', 'KYC', ShieldCheck],
  ['referral', 'Referral', Gift],
]

const badgeTone = (b) => b?.tone || (b?.type === 'gold' ? 'badge-gold' : 'badge-blue')

export default function Enterprise() {
  const toast = useToast()
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  const [score, setScore] = useState(null)
  const [badges, setBadges] = useState({ badges: [], earned: [] })
  const [board, setBoard] = useState({ data: [] })

  const [sub, setSub] = useState(null)
  const [plans, setPlans] = useState([])
  const [activating, setActivating] = useState(false)

  const [keys, setKeys] = useState([])
  const [newKey, setNewKey] = useState(null)
  const [keyForm, setKeyForm] = useState({ name: '', scopes: 'read' })
  const [keyOpen, setKeyOpen] = useState(false)

  const [hooks, setHooks] = useState([])
  const [hookForm, setHookForm] = useState({ url: '', events: '' })
  const [hookOpen, setHookOpen] = useState(false)

  const [devices, setDevices] = useState([])

  const [kyc, setKyc] = useState(null)
  const [kycForm, setKycForm] = useState({ fullName: '', dateOfBirth: '', nationality: '', documentType: 'Passport', documentNumber: '', taxId: '' })
  const [kycBusy, setKycBusy] = useState(false)

  const [ref, setRef] = useState(null)
  const [redeemCode, setRedeemCode] = useState('')

  const loadOverview = async () => {
    const [sc, bd, lb] = await Promise.allSettled([get('/enterprise/score'), get('/enterprise/badges'), get('/enterprise/leaderboard')])
    if (sc.status === 'fulfilled') setScore({ ...sc.value.score, nextBadge: sc.value.nextBadge })
    if (bd.status === 'fulfilled') setBadges(bd.value)
    if (lb.status === 'fulfilled') setBoard(lb.value)
  }

  const loadSub = async () => {
    const [s, p] = await Promise.allSettled([get('/enterprise/subscription'), get('/enterprise/subscriptions/plans')])
    if (s.status === 'fulfilled') setSub(s.value)
    if (p.status === 'fulfilled') setPlans(p.value)
  }

  const loadKeys = async () => { try { const r = await get('/enterprise/api-keys'); setKeys(Array.isArray(r) ? r : r.data || []) } catch { setKeys([]) } }
  const loadHooks = async () => { try { const r = await get('/enterprise/webhooks'); setHooks(Array.isArray(r) ? r : r.data || []) } catch { setHooks([]) } }
  const loadDevices = async () => { try { const r = await get('/enterprise/devices'); setDevices(Array.isArray(r) ? r : r.data || []) } catch { setDevices([]) } }
  const loadKyc = async () => { try { const r = await get('/enterprise/kyc'); setKyc(r || null) } catch { setKyc(null) } }
  const loadRef = async () => { try { const r = await get('/enterprise/referral'); setRef(r) } catch { setRef(null) } }

  useEffect(() => {
    setLoading(true)
    const loaders = { overview: loadOverview, subscription: loadSub, apikeys: loadKeys, webhooks: loadHooks, devices: loadDevices, kyc: loadKyc, referral: loadRef }
    ;(loaders[tab] || loadOverview)().finally(() => setLoading(false))
  }, [tab])

  const activate = async (planId) => {
    setActivating(true)
    try {
      const r = await post('/enterprise/subscription', { plan: planId, billingCycle: 'Monthly' })
      toast.success(`Subscribed to ${r.plan || planId}`)
      loadSub()
    } catch (err) { toast.error(errMsg(err)) } finally { setActivating(false) }
  }

  const createKey = async (e) => {
    e.preventDefault()
    try {
      const r = await post('/enterprise/api-keys', keyForm)
      setNewKey(r)
      setKeyOpen(false)
      setKeyForm({ name: '', scopes: 'read' })
      loadKeys()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const deleteKey = async (k) => {
    if (!window.confirm(`Revoke API key "${k.name}"?`)) return
    try { await del(`/enterprise/api-keys/${k.id}`); toast.success('Key revoked'); loadKeys() } catch (err) { toast.error(errMsg(err)) }
  }

  const createHook = async (e) => {
    e.preventDefault()
    if (!hookForm.url.trim()) { toast.error('Webhook URL is required'); return }
    try {
      await post('/enterprise/webhooks', { url: hookForm.url, events: hookForm.events || 'booking.created' })
      toast.success('Webhook added')
      setHookForm({ url: '', events: '' })
      setHookOpen(false)
      loadHooks()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const deleteHook = async (h) => {
    if (!window.confirm(`Delete webhook ${h.url}?`)) return
    try { await del(`/enterprise/webhooks/${h.id}`); toast.success('Webhook deleted'); loadHooks() } catch (err) { toast.error(errMsg(err)) }
  }

  const deleteDevice = async (d) => {
    if (!window.confirm(`Remove device "${d.deviceName || d.deviceId}"?`)) return
    try { await del(`/enterprise/devices/${d.id}`); toast.success('Device removed'); loadDevices() } catch (err) { toast.error(errMsg(err)) }
  }

  const submitKyc = async (e) => {
    e.preventDefault()
    if (!kycForm.fullName.trim() || !kycForm.documentNumber.trim()) { toast.error('Full name and document number are required'); return }
    setKycBusy(true)
    try {
      const r = await post('/enterprise/kyc', kycForm)
      setKyc(r)
      toast.success('KYC submitted for review')
    } catch (err) { toast.error(errMsg(err)) } finally { setKycBusy(false) }
  }

  const redeem = async () => {
    if (!redeemCode.trim()) { toast.error('Enter a referral code'); return }
    try {
      await post('/enterprise/referral/redeem', { code: redeemCode.trim() })
      toast.success('Referral code redeemed — reward added')
      setRedeemCode('')
      loadRef()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied') } catch { toast.error('Could not copy') }
  }

  const pct = score ? Math.min(100, (score.experiencePoints / (score.pointsToNextLevel || 100)) * 100) : 0

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Crown size={24} color="var(--gold)" />
        <div>
          <h1 className="section-title" style={{ marginBottom: 2 }}>Enterprise</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Gamified growth, eWallet, identity verification and rewards.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 8, marginBottom: 22, display: 'flex', gap: 6, flexWrap: 'wrap', background: 'var(--bg-soft)' }}>
        {TABS.map(([id, label, Icon]) => (
          <button key={id} className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(id)}><Icon size={14} /> {label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid-auto grid-3" style={{ gap: 14, marginBottom: 20 }}>
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <small style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}><Trophy size={14} color="var(--gold)" /> Level</small>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 34 }}>{score?.level ?? 1}</strong>
                <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{score?.title || 'Rising star'}</span>
              </div>
              <div style={{ height: 8, borderRadius: 6, background: 'var(--bg-soft)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#8B5CF6,#EC4899)' }} />
              </div>
              <small style={{ color: 'var(--text-faint)' }}>{score?.experiencePoints ?? 0} XP of {score?.pointsToNextLevel ?? 100} to next level</small>
            </div>
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <small style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={14} color="#F59E0B" /> Points &amp; streak</small>
              <strong style={{ fontSize: 34 }}>{score?.totalPoints ?? 0}</strong>
              <small style={{ color: 'var(--text-faint)' }}>{score?.streakDays ?? 0}-day streak · last activity {score?.lastActivityAt ? new Date(score.lastActivityAt).toLocaleDateString() : '—'}</small>
            </div>
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <small style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}><Award size={14} color="#10B981" /> Next badge</small>
              {score?.nextBadge ? (
                <>
                  <strong style={{ fontSize: 20 }}>{score.nextBadge.name || 'Next badge'}</strong>
                  <small style={{ color: 'var(--text-faint)' }}>{score.nextBadge.description}</small>
                </>
              ) : <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>Keep earning points to unlock your next badge</span>}
            </div>
          </div>

          <div className="grid-auto grid-2" style={{ gap: 16 }}>
            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Award size={16} color="var(--gold)" /> Badges</h3>
              {badges.badges?.length === 0 && badges.earned?.length === 0 ? (
                <EmptyState title="No badges yet" message="Complete actions like bookings, reviews and profile setup to earn badges." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {badges.earned?.map((b) => (
                    <div key={b.id || b.name} className="card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={18} color="#10B981" />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13.5 }}>{b.name || b.badgeName}</strong>
                        <small style={{ display: 'block', color: 'var(--text-dim)' }}>{b.description}</small>
                      </div>
                      <span className="badge badge-green">Earned</span>
                    </div>
                  ))}
                  {badges.earned?.length === 0 && badges.badges?.map((b) => (
                    <div key={b.id || b.name} className="card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7 }}>
                      <Award size={18} color="var(--text-faint)" />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13.5 }}>{b.name || b.badgeName}</strong>
                        <small style={{ display: 'block', color: 'var(--text-dim)' }}>{b.description || `Earn ${b.threshold || '—'} points`}</small>
                      </div>
                      <span className={`badge ${badgeTone(b)}`}>Locked</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={16} color="var(--gold)" /> Leaderboard</h3>
              {board.data?.length === 0 ? (
                <EmptyState title="Leaderboard is warming up" message="Start earning points to climb the rankings." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {board.data.map((row, i) => (
                    <div key={row.id || row.userId || i} className="card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <strong style={{ width: 24, color: i < 3 ? 'var(--gold)' : 'var(--text-dim)' }}>#{i + 1}</strong>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>{row.displayName || row.userName || row.user?.displayName || `User ${row.userId}`}</span>
                      <span className="badge badge-gold">{row.totalPoints ?? row.points ?? 0} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

    {tab === 'wallet' && (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <span style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'grid', placeItems: 'center' }}>
            <Wallet size={22} color="#fff" />
          </span>
          <div>
            <h3 style={{ fontSize: 18, margin: 0 }}>eWallet</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>Your built-in digital wallet for all platform transactions.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ padding: 18, borderRadius: 14, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <h4 style={{ fontSize: 14, color: '#10B981', marginBottom: 8 }}>How it works</h4>
            <ul style={{ paddingLeft: 18, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.8 }}>
              <li>Deposit funds via Instapay, Vodafone Cash, or bank transfer</li>
              <li>Use your balance to book models, pay for services, or send money</li>
              <li>Withdraw your earnings anytime to your preferred payment method</li>
              <li>All transactions are secure and tracked in real-time</li>
            </ul>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <h4 style={{ fontSize: 14, color: '#8B5CF6', marginBottom: 8 }}>For Brands & Agencies</h4>
            <ul style={{ paddingLeft: 18, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.8 }}>
              <li>Fund your wallet to pay for casting calls and campaigns</li>
              <li>Hold payments in escrow until work is completed</li>
              <li>Automatic invoicing and tax reports</li>
              <li>Send payments directly to models after approval</li>
            </ul>
          </div>
          <div style={{ padding: 18, borderRadius: 14, background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)' }}>
            <h4 style={{ fontSize: 14, color: '#EC4899', marginBottom: 8 }}>For Models</h4>
            <ul style={{ paddingLeft: 18, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.8 }}>
              <li>Receive payments instantly when bookings are completed</li>
              <li>Track your earnings and financial history</li>
              <li>Withdraw to your bank account or mobile wallet</li>
              <li>Transparent fee structure — no hidden charges</li>
            </ul>
          </div>
        </div>

        <Link to="/wallet" className="btn btn-primary" style={{ display: 'inline-flex' }}><Wallet size={16} /> Open your wallet</Link>
      </div>
    )}

    {tab === 'devices' && (
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Trusted devices</h3>
          {devices.length === 0 ? <EmptyState title="No devices registered" message="Devices you sign in from appear here so you can manage access." /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {devices.map((d) => (
                <div key={d.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MonitorSmartphone size={16} color="var(--text-dim)" />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13.5 }}>{d.deviceName || d.platform || 'Device'}</strong>
                    <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 11.5 }}>{d.platform} {d.osVersion || ''} · app {d.appVersion || '—'} · last used {d.lastUsedAt ? new Date(d.lastUsedAt).toLocaleString() : '—'}</small>
                  </div>
                  <button className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.15)', color: '#FDA4AF' }} onClick={() => deleteDevice(d)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'kyc' && (
        <div className="card" style={{ padding: 18, maxWidth: 560 }}>
          <h3 style={{ fontSize: 16, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={16} color="var(--gold)" /> Identity verification (KYC)</h3>
          {kyc ? (
            <div style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className={`badge ${kyc.status === 'Approved' ? 'badge-green' : kyc.status === 'Rejected' ? 'badge-red' : 'badge-blue'}`}>{kyc.status || 'Pending'}</span>
              <small style={{ color: 'var(--text-dim)' }}>{kyc.fullName} · {kyc.documentType} {kyc.documentNumber} · {kyc.nationality} · risk {kyc.riskLevel || 'Low'}</small>
              {kyc.status === 'Approved' ? <p style={{ color: 'var(--green)', fontSize: 13, margin: 0 }}>Identity verified — you can use enterprise features.</p> : <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>Submitted {new Date(kyc.createdAt).toLocaleDateString()}. Our team reviews it shortly.</p>}
            </div>
          ) : (
            <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: '4px 0 14px' }}>Verify your identity to unlock enterprise features like API access and higher limits.</p>
          )}
          {(!kyc || kyc.status === 'Rejected') && (
            <form onSubmit={submitKyc} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="field"><label>Full legal name *</label><input value={kycForm.fullName} onChange={(e) => setKycForm({ ...kycForm, fullName: e.target.value })} /></div>
              <div className="grid-auto grid-2" style={{ gap: 10 }}>
                <div className="field"><label>Date of birth</label><input type="date" value={kycForm.dateOfBirth} onChange={(e) => setKycForm({ ...kycForm, dateOfBirth: e.target.value })} /></div>
                <div className="field"><label>Nationality</label><input value={kycForm.nationality} onChange={(e) => setKycForm({ ...kycForm, nationality: e.target.value })} placeholder="e.g. EG" /></div>
              </div>
              <div className="grid-auto grid-2" style={{ gap: 10 }}>
                <div className="field"><label>Document type</label>
                  <select value={kycForm.documentType} onChange={(e) => setKycForm({ ...kycForm, documentType: e.target.value })}>
                    <option>Passport</option><option>National ID</option><option>Driver&apos;s license</option><option>Residence permit</option>
                  </select>
                </div>
                <div className="field"><label>Document number *</label><input value={kycForm.documentNumber} onChange={(e) => setKycForm({ ...kycForm, documentNumber: e.target.value })} /></div>
              </div>
              <div className="field"><label>Tax ID (optional)</label><input value={kycForm.taxId} onChange={(e) => setKycForm({ ...kycForm, taxId: e.target.value })} /></div>
              <button className="btn btn-primary" disabled={kycBusy}>{kycBusy ? 'Submitting…' : 'Submit for verification'}</button>
            </form>
          )}
        </div>
      )}

      {tab === 'referral' && (
        <div className="grid-auto grid-2" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Gift size={16} color="var(--gold)" /> Your referral code</h3>
            {ref ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-soft)', padding: '12px 16px', borderRadius: 10 }}>
                  <strong style={{ fontSize: 22, letterSpacing: 2 }}>{ref.code}</strong>
                  <button className="btn btn-ghost btn-sm" onClick={() => copy(ref.code)}><Copy size={13} /> Copy</button>
                </div>
                <small style={{ display: 'block', color: 'var(--text-dim)', marginTop: 10 }}>Earn ${ref.rewardAmount || 10} credit per new user · {ref.usage || 0} of {ref.maxUses ?? '∞'} used</small>
              </>
            ) : <EmptyState title="No referral code" message="You&apos;ll get a code as soon as you qualify." />}
          </div>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Redeem a code</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Enter friend's code" value={redeemCode} onChange={(e) => setRedeemCode(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={redeem}><Gift size={14} /> Redeem</button>
            </div>
            <small style={{ display: 'block', color: 'var(--text-faint)', marginTop: 10 }}>Enter a referral code to receive credit toward your next upgrade.</small>
          </div>
        </div>
      )}

      <Modal open={keyOpen} onClose={() => setKeyOpen(false)} title="Create API key">
        <form onSubmit={createKey}>
          <div className="field"><label>Key name *</label><input value={keyForm.name} onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })} placeholder="e.g. Production app" /></div>
          <div className="field"><label>Scopes</label>
            <select value={keyForm.scopes} onChange={(e) => setKeyForm({ ...keyForm, scopes: e.target.value })}>
              <option value="read">Read only</option><option value="read,write">Read &amp; write</option>
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Create key</button>
        </form>
      </Modal>

      <Modal open={!!newKey} onClose={() => setNewKey(null)} title="API key created" width={520}>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 10 }}>Copy this key now — <strong>it won&apos;t be shown again.</strong></p>
        <div style={{ background: '#0d0d16', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 10, padding: 14, fontFamily: 'monospace', fontSize: 12.5, wordBreak: 'break-all' }}>{newKey?.fullKey}</div>
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={() => { copy(newKey?.fullKey); setNewKey(null) }}><Copy size={14} /> Copy and close</button>
      </Modal>

      <Modal open={hookOpen} onClose={() => setHookOpen(false)} title="Add webhook">
        <form onSubmit={createHook}>
          <div className="field"><label>Endpoint URL *</label><input value={hookForm.url} onChange={(e) => setHookForm({ ...hookForm, url: e.target.value })} placeholder="https://your-app.com/webhook" /></div>
          <div className="field"><label>Events (comma-separated)</label><input value={hookForm.events} onChange={(e) => setHookForm({ ...hookForm, events: e.target.value })} placeholder="booking.created, payment.received" /></div>
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Add webhook</button>
        </form>
      </Modal>
    </div>
  )
}
