import { useState, useEffect } from 'react'
import { ArrowDownLeft, ArrowUpRight, Send } from 'lucide-react'
import { get, post, upload, errMsg } from '../api/client'
import { reportWithdraw, reportTransfer, reportDeposit } from '../hooks/usePageTracking'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'
import './Wallet.css'

const getLocation = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve(null)
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => resolve(null),
    { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true },
  )
})
export default function Wallet() {
  const toast = useToast()
  const [wallet, setWallet] = useState(null)
  const [txs, setTxs] = useState({ data: [] })
  const [loading, setLoading] = useState(true)
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [depForm, setDepForm] = useState({ method: 'Instapay', amount: '', referenceNumber: '', senderName: '', senderPhone: '', image: null, clientLocation: '' })
  const [withForm, setWithForm] = useState({ amount: '', paymentMethod: 'Instapay', paymentDetails: '' })
  const [transfers, setTransfers] = useState({ data: [] })
  const [transForm, setTransForm] = useState({ receiverId: '', amount: '', note: '' })
  const [transSearch, setTransSearch] = useState('')
  const [transResults, setTransResults] = useState([])
  const [transSearching, setTransSearching] = useState(false)

  useEffect(() => {
    (async () => {
      const [w, t, tr] = await Promise.allSettled([
        get('/wallet'),
        get('/wallet/transactions', { pageSize: 10 }),
        get('/wallet/transfers', { pageSize: 10 }),
      ])
      if (w.status === 'fulfilled') setWallet(w.value)
      if (t.status === 'fulfilled') setTxs(t.value)
      if (tr.status === 'fulfilled') setTransfers(tr.value)
      setLoading(false)
    })()
  }, [])

  const submitDeposit = async (e) => {
    e.preventDefault()
    const loc = await getLocation()
    const fd = new FormData()
    fd.append('method', depForm.method)
    fd.append('amount', depForm.amount)
    if (depForm.referenceNumber) fd.append('referenceNumber', depForm.referenceNumber)
    if (depForm.senderName) fd.append('senderName', depForm.senderName)
    if (depForm.senderPhone) fd.append('senderPhone', depForm.senderPhone)
    if (depForm.clientLocation) fd.append('clientLocation', depForm.clientLocation)
    if (loc) {
      fd.append('lat', String(loc.lat))
      fd.append('lng', String(loc.lng))
    }
    if (depForm.image) fd.append('image', depForm.image)
    try {
      await upload('/wallet/deposit/proof', fd)
      reportDeposit(null)
      toast.success('Payment proof submitted for review')
      setDepositOpen(false)
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const submitWithdraw = async (e) => {
    e.preventDefault()
    const loc = await getLocation()
    try {
      const res = await post('/wallet/withdraw', {
        amount: Number(withForm.amount),
        paymentMethod: withForm.paymentMethod,
        paymentDetails: withForm.paymentDetails,
        latitude: loc?.lat,
        longitude: loc?.lng,
      })
      reportWithdraw(Number(withForm.amount))
      toast.success(res.message || 'Withdrawal requested')
      if (res.ai?.flagged) toast.info(`AI flagged review: fraud ${res.ai.fraudScore}, risk ${res.ai.clientRisk}`)
      setWithdrawOpen(false)
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  const searchRecipients = async (e) => {
    e.preventDefault()
    if (!transSearch.trim()) return
    setTransSearching(true)
    try {
      const res = await get('/users/search', { q: transSearch.trim() })
      setTransResults(res.data || [])
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setTransSearching(false)
    }
  }

  const submitTransfer = async (e) => {
    e.preventDefault()
    if (!transForm.receiverId) return toast.error('Select a recipient')
    if (Number(transForm.amount) <= 0) return toast.error('Enter a valid amount')
    const loc = await getLocation()
    try {
      const res = await post('/wallet/transfer', {
        receiverUserId: transForm.receiverId,
        amount: Number(transForm.amount),
        note: transForm.note || undefined,
        latitude: loc?.lat,
        longitude: loc?.lng,
      })
      reportTransfer(null, Number(transForm.amount))
      toast.success(res.message || 'Transfer submitted')
      setTransferOpen(false)
      setTransForm({ receiverId: '', amount: '', note: '' })
      setTransSearch('')
      setTransResults([])
      const [w, tr] = await Promise.allSettled([get('/wallet'), get('/wallet/transfers', { pageSize: 10 })])
      if (w.status === 'fulfilled') setWallet(w.value)
      if (tr.status === 'fulfilled') setTransfers(tr.value)
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 900 }}>
      <span className="badge" style={{ marginBottom: 10 }}>Wallet</span>
      <h1 className="section-title" style={{ marginBottom: 26 }}>Payments & <span className="grad-text">wallet</span></h1>

      <div className="wallet-hero card">
        <div className="wallet-balance">
          <small>Available Balance</small>
          <strong>${wallet?.balance?.toLocaleString?.() ?? wallet?.balance ?? 0}</strong>
          {wallet?.pendingBalance > 0 && <p style={{ color: 'var(--gold)', fontSize: 13, marginTop: 8 }}>${wallet.pendingBalance.toLocaleString()} held pending (escrow / transfer approval)</p>}
        </div>
        <div className="wallet-stats">
          <div><small>Total Earned</small><strong>${wallet?.totalEarned?.toLocaleString?.() ?? 0}</strong></div>
          <div><small>Total Withdrawn</small><strong>${wallet?.totalWithdrawn?.toLocaleString?.() ?? 0}</strong></div>
        </div>
        <div className="wallet-actions">
          <button className="btn btn-primary" onClick={() => setDepositOpen(true)}><ArrowDownLeft size={17} /> Deposit</button>
          <button className="btn btn-outline" onClick={() => setWithdrawOpen(true)}><ArrowUpRight size={17} /> Withdraw</button>
          <button className="btn btn-outline" onClick={() => setTransferOpen(true)}><Send size={17} /> Send money</button>
        </div>
      </div>

      <div className="card dash-panel" style={{ marginTop: 22 }}>
        <h2>Recent transactions</h2>
        {txs.data.length === 0 ? <EmptyState title="No transactions" message="Your activity will appear here." />
          : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {txs.data.map((t) => (
                <div key={t.id} className="tx-row">
                  <span className={`tx-icon ${t.type.toLowerCase() === 'deposit' ? 'tx-in' : 'tx-out'}`}>
                    {t.type.toLowerCase() === 'deposit' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 14, textTransform: 'capitalize' }}>{t.type}{t.isPending ? <span className="badge badge-gold" style={{ marginLeft: 8, fontSize: 10 }}>Pending</span> : null}</strong>
                    <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{t.description || new Date(t.createdAt).toLocaleString()}</small>
                  </div>
                  <strong style={{ color: (t.amount >= 0) ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-head)' }}>
                    {(t.amount >= 0) ? '+' : '-'}${Math.abs(t.amount).toLocaleString()}
                  </strong>
                </div>
              ))}
            </div>
          )}
      </div>

      <div className="card dash-panel" style={{ marginTop: 22 }}>
        <h2>Transfers</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 14 }}>
          Money you send is reserved in your wallet and sent once an administrator approves the transfer.
        </p>
        {transfers.data.length === 0 ? <EmptyState title="No transfers" message="Sent and received transfers will appear here." /> : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {transfers.data.map((t) => (
              <div key={t.id} className="tx-row">
                <span className={`tx-icon ${t.isSender ? 'tx-out' : 'tx-in'}`}>
                  {t.isSender ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
                </span>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 14, textTransform: 'capitalize' }}>{t.isSender ? `To ${t.receiverName || 'user'}` : `From ${t.senderName || 'user'}`}</strong>
                  <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{t.note || new Date(t.createdAt).toLocaleString()}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: t.isSender ? 'var(--danger)' : 'var(--success)', fontFamily: 'var(--font-head)' }}>
                    {t.isSender ? '-' : '+'}${Math.abs(t.amount).toLocaleString()}
                  </strong>
                  <div><span className={`badge ${t.status === 'Pending' ? 'badge-gold' : t.status === 'Cancelled' ? 'badge-red' : 'badge-green'}`}>{t.status}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deposit modal */}
      <Modal open={depositOpen} onClose={() => setDepositOpen(false)} title="Deposit funds">
        <form onSubmit={submitDeposit}>
          <div className="field">
            <label>Payment method</label>
            <select value={depForm.method} onChange={(e) => setDepForm({ ...depForm, method: e.target.value })}>
              {['Instapay', 'VodafoneCash', 'BankTransfer', 'PayPal'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field"><label>Amount (USD)</label><input type="number" required min="1" value={depForm.amount} onChange={(e) => setDepForm({ ...depForm, amount: e.target.value })} /></div>
          <div className="field"><label>Reference number</label><input value={depForm.referenceNumber} onChange={(e) => setDepForm({ ...depForm, referenceNumber: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field"><label>Sender name</label><input value={depForm.senderName} onChange={(e) => setDepForm({ ...depForm, senderName: e.target.value })} /></div>
            <div className="field"><label>Sender phone</label><input value={depForm.senderPhone} onChange={(e) => setDepForm({ ...depForm, senderPhone: e.target.value })} /></div>
          </div>
          <div className="field"><label>Your location (optional)</label><input value={depForm.clientLocation} onChange={(e) => setDepForm({ ...depForm, clientLocation: e.target.value })} placeholder="City, Country" /></div>
          <div className="field">
            <label>Payment screenshot *</label>
            <input type="file" required accept="image/*" onChange={(e) => setDepForm({ ...depForm, image: e.target.files[0] })} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Submit for review</button>
        </form>
      </Modal>

      {/* Withdraw modal */}
      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Withdraw funds">
        <form onSubmit={submitWithdraw}>
          <div className="field"><label>Amount (USD)</label><input type="number" required min="1" value={withForm.amount} onChange={(e) => setWithForm({ ...withForm, amount: e.target.value })} /></div>
          <div className="field">
            <label>Payment method</label>
            <select value={withForm.paymentMethod} onChange={(e) => setWithForm({ ...withForm, paymentMethod: e.target.value })}>
              {['Instapay', 'VodafoneCash', 'BankTransfer', 'PayPal'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field"><label>Payment details</label><input value={withForm.paymentDetails} onChange={(e) => setWithForm({ ...withForm, paymentDetails: e.target.value })} placeholder="Account / wallet details" /></div>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>A 2.5% platform fee applies. Withdrawals are AI-screened for fraud.</p>
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Request withdrawal</button>
        </form>
      </Modal>
      {/* Transfer modal */}
      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Send money">
        <form onSubmit={submitTransfer}>
          <div className="field">
            <label>Find recipient</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={transSearch} onChange={(e) => setTransSearch(e.target.value)} placeholder="Search name, email, or username" />
              <button type="button" className="btn btn-outline" onClick={searchRecipients} disabled={transSearching} style={{ whiteSpace: 'nowrap' }}>{transSearching ? '...' : 'Search'}</button>
            </div>
          </div>
          {transResults.length > 0 && (
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 14 }}>
              {transResults.map((u) => (
                <div key={u.id} onClick={() => {
                  setTransForm({ ...transForm, receiverId: u.id })
                  setTransResults([])
                  setTransSearch(u.displayName || u.userName || u.email)
                }} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer',
                  background: transForm.receiverId === u.id ? 'var(--gold-soft)' : 'transparent',
                }}>
                  <img src={u.profilePictureUrl || '/default-avatar.png'} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 14 }}>{u.displayName || u.userName || u.email}</strong>
                    <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 12 }}>{u.email}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="field"><label>Amount (USD)</label><input type="number" required min="1" max={wallet?.balance ?? undefined} value={transForm.amount} onChange={(e) => setTransForm({ ...transForm, amount: e.target.value })} /></div>
          <div className="field"><label>Note (optional)</label><input value={transForm.note} onChange={(e) => setTransForm({ ...transForm, note: e.target.value })} placeholder="Reason for transfer" /></div>
          {wallet?.balance <= 0 && (
            <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
              Your balance is $0. Add funds with <strong>Deposit</strong> before sending money.
            </p>
          )}
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
            The amount is reserved immediately and sent once an administrator approves the transfer.
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Send ${Number(transForm.amount) > 0 ? Number(transForm.amount).toLocaleString() : '0'}</button>
        </form>
      </Modal>
    </div>
  )
}
