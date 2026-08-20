import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, FileWarning, ShieldCheck, Wallet, Activity, Tickets, BadgeCheck, FileText, Package } from 'lucide-react'
import { get, put, errMsg, assetUrl, asArray } from '../api/client'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import './Admin.css'

const listOf = (res) => {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  return []
}

export default function Admin() {
  const toast = useToast()
  const [tab, setTab] = useState('dashboard')
  const [dash, setDash] = useState(null)
  const [users, setUsers] = useState({ data: [] })
  const [reports, setReports] = useState({ data: [] })
  const [reportStatus, setReportStatus] = useState('')
  const [reportErr, setReportErr] = useState('')
  const [verifications, setVerifications] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [tickets, setTickets] = useState([])
  const [proofs, setProofs] = useState([])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async (t) => {
    setLoading(true)
    setReportErr('')
    try {
      if (t === 'dashboard') setDash(await get('/admin/dashboard'))
      if (t === 'users') setUsers(await get('/users', { pageSize: 50 }))
      if (t === 'reports') {
        try {
          const r = await get('/admin/reports', { pageSize: 100, status: reportStatus || undefined })
          setReports({ data: listOf(r) })
        } catch (err) {
          setReportErr(errMsg(err, 'Could not load reports'))
        }
      }
      if (t === 'verifications') setVerifications(listOf(await get('/admin/verifications')))
      if (t === 'withdrawals') setWithdrawals(listOf(await get('/admin/withdrawals')))
      if (t === 'tickets') setTickets(listOf(await get('/admin/tickets', { pageSize: 50 })))
      if (t === 'proofs') setProofs(listOf(await get('/admin/payment-proofs')))
      if (t === 'subscriptions') setSubs(listOf(await get('/admin/subscriptions', { pageSize: 50 })))
    } catch (err) {
      toast.error(errMsg(err, 'Failed to load'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(tab) }, [tab])
  useEffect(() => { if (tab === 'reports') load('reports') }, [reportStatus])

  const setUserStatus = async (id, status) => {
    try {
      await put(`/admin/users/${id}/status`, { status })
      toast.success(`User ${status}`)
      load('users')
    } catch (err) { toast.error(errMsg(err)) }
  }

  const approveWithdrawal = async (id, status) => {
    try {
      await put(`/admin/withdrawals/${id}`, { status })
      toast.success(`Withdrawal ${status}`)
      load('withdrawals')
    } catch (err) { toast.error(errMsg(err)) }
  }

  const reviewVerification = async (id, status) => {
    try {
      await put(`/admin/verifications/${id}`, { status })
      toast.success(`Verification ${status}`)
      load('verifications')
    } catch (err) { toast.error(errMsg(err)) }
  }

  const reviewReport = async (id, status) => {
    try {
      await put(`/admin/reports/${id}`, { status })
      toast.success('Report updated')
      load('reports')
    } catch (err) { toast.error(errMsg(err)) }
  }

  const tabs = [
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['users', 'Users', Users],
    ['reports', 'Reports', FileWarning],
    ['verifications', 'Verifications', ShieldCheck],
    ['withdrawals', 'Withdrawals', Wallet],
    ['tickets', 'Tickets', Tickets],
    ['proofs', 'Payments', BadgeCheck],
    ['subscriptions', 'Subscriptions', Package],
  ]

  return (
    <div className="container admin-wrap" style={{ padding: '40px 24px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
        <span className="admin-logo"><Activity size={22} /></span>
        <div>
          <span className="badge badge-red" style={{ marginBottom: 4 }}>Admin</span>
          <h1 className="section-title">Control center</h1>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map(([k, l, Icon]) => (
          <button key={k} className={`admin-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>
            <Icon size={16} /> {l}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : (
        <>
          {tab === 'dashboard' && dash && (
            <div className="grid-auto grid-4">
              {[
                ['Total users', dash.totalUsers], ['Models', dash.totalModels], ['Brands', dash.totalBrands], ['Agencies', dash.totalAgencies],
                ['Bookings', dash.totalBookings], ['Active bookings', dash.activeBookings], ['Castings', dash.totalCastings], ['Open castings', dash.openCastings],
                ['Revenue', `$${dash.totalRevenue ?? 0}`], ['Pending withdrawals', dash.pendingWithdrawals], ['Open tickets', dash.openTickets], ['Total models', dash.totalModels],
              ].map(([l, v]) => (
                <div key={l} className="admin-stat">
                  <small>{l}</small>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          )}

          {tab === 'users' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {users.data.length === 0 ? <EmptyState title="No users" message="No users found." /> : (
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Email</th><th>Roles</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {users.data.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {u.profilePictureUrl ? <img src={assetUrl(u.profilePictureUrl)} className="admin-avatar" alt="" /> : <span className="admin-avatar admin-avatar-fb">{u.displayName?.[0] || 'U'}</span>}
                            <strong style={{ fontSize: 14 }}>{u.displayName || u.userName}</strong>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.roles?.join(', ')}</td>
                        <td><span className={`badge ${u.status === 'Active' ? 'badge-green' : 'badge-red'}`}>{u.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {u.status !== 'Active' && <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }} onClick={() => setUserStatus(u.id, 'Active')}>Activate</button>}
                            {u.status !== 'Banned' && <button className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.15)', color: '#FDA4AF' }} onClick={() => setUserStatus(u.id, 'Banned')}>Ban</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'reports' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 15 }}>Moderation reports</strong>
                <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} style={{ maxWidth: 200 }}>
                  <option value="">All statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
              </div>
              {reportErr ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <EmptyState title="Could not load reports" message={reportErr} action={<button className="btn btn-primary" onClick={() => load('reports')}>Retry</button>} />
                </div>
              ) : (reports.data || []).length === 0 ? <EmptyState title="No reports" message="No moderation reports match this view." /> : (
                <table className="admin-table">
                  <thead><tr><th>Reporter</th><th>Target</th><th>Reason</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                  <tbody>
                    {(reports.data || []).map((r) => (
                      <tr key={r.id}>
                        <td>{r.reporterName || r.reporterUserId?.slice(0, 8) || '—'}</td>
                        <td>{r.targetType} · {r.targetId ?? r.targetUserId?.slice(0, 8) ?? '—'}</td>
                        <td style={{ color: 'var(--text-dim)', maxWidth: 260 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{r.reason}{r.description ? ` — ${r.description}` : ''}</span>
                        </td>
                        <td><span className={`badge ${r.status === 'Pending' ? 'badge-gold' : r.status === 'Resolved' ? 'badge-green' : 'badge-gray'}`}>{r.status}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                        <td>
                          {r.status === 'Pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }} onClick={() => reviewReport(r.id, 'Resolved')}>Resolve</button>
                              <button className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.15)', color: '#FDA4AF' }} onClick={() => reviewReport(r.id, 'Dismissed')}>Dismiss</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'tickets' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {tickets.length === 0 ? <EmptyState title="No tickets" message="No support tickets." /> : (
                <table className="admin-table">
                  <thead><tr><th>Subject</th><th>User</th><th>Priority</th><th>Status</th></tr></thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id}>
                        <td><strong style={{ fontSize: 14 }}>{t.subject}</strong></td>
                        <td style={{ color: 'var(--text-dim)' }}>{t.userId?.slice(0, 8)}…</td>
                        <td><span className="badge badge-amber">{t.priority}</span></td>
                        <td><span className={`badge ${t.status === 'Open' ? 'badge-gold' : t.status === 'Resolved' ? 'badge-green' : 'badge-blue'}`}>{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'proofs' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {proofs.length === 0 ? <EmptyState title="No payment proofs" message="No deposit proof submissions." /> : (
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {proofs.map((p) => (
                      <tr key={p.id}>
                        <td style={{ color: 'var(--text-dim)' }}>{p.userId?.slice(0, 8)}…</td>
                        <td><strong>{p.amount != null ? `$${p.amount}` : '—'}</strong></td>
                        <td><span className={`badge ${p.status === 'Approved' ? 'badge-green' : p.status === 'Rejected' ? 'badge-red' : 'badge-gold'}`}>{p.status}</span></td>
                        <td>
                          {p.status === 'Pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }} onClick={() => { put(`/admin/payment-proofs/${p.id}`, { status: 'Approved' }).then(() => { toast.success('Proof approved'); load('proofs') }).catch((e) => toast.error(errMsg(e))) }}>Approve</button>
                              <button className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.15)', color: '#FDA4AF' }} onClick={() => { put(`/admin/payment-proofs/${p.id}`, { status: 'Rejected' }).then(() => { toast.success('Proof rejected'); load('proofs') }).catch((e) => toast.error(errMsg(e))) }}>Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'subscriptions' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {subs.length === 0 ? <EmptyState title="No subscriptions" message="No active subscriptions yet." /> : (
                <table className="admin-table">
                  <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Renews</th></tr></thead>
                  <tbody>
                    {subs.map((s) => (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--text-dim)' }}>{s.userId?.slice(0, 8)}…</td>
                        <td><span className="badge badge-amber">{s.plan}</span></td>
                        <td><span className={`badge ${s.status === 'Active' ? 'badge-green' : 'badge-gold'}`}>{s.status}</span></td>
                        <td>{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'verifications' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {verifications.length === 0 ? <EmptyState title="No verifications" message="No KYC requests yet." /> : (
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>Type</th><th>Doc type</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {verifications.map((v) => (
                      <tr key={v.id}>
                        <td>#{v.id}</td>
                        <td>{v.verificationType}</td>
                        <td style={{ color: 'var(--text-dim)' }}>{v.documentType}</td>
                        <td><span className={`badge ${v.status === 'Approved' ? 'badge-green' : v.status === 'Rejected' ? 'badge-red' : 'badge-gold'}`}>{v.status}</span></td>
                        <td>
                          {v.status === 'Pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }} onClick={() => reviewVerification(v.id, 'Approved')}>Approve</button>
                              <button className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.15)', color: '#FDA4AF' }} onClick={() => reviewVerification(v.id, 'Rejected')}>Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'withdrawals' && (
            <div className="card" style={{ overflow: 'hidden' }}>
              {withdrawals.length === 0 ? <EmptyState title="No withdrawals" message="No withdrawal requests." /> : (
                <table className="admin-table">
                  <thead><tr><th>ID</th><th>Amount</th><th>Method</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td>#{w.id}</td>
                        <td><strong>${w.amount}</strong></td>
                        <td style={{ color: 'var(--text-dim)' }}>{w.paymentMethod}</td>
                        <td><span className={`badge ${w.status === 'Completed' ? 'badge-green' : w.status === 'Rejected' ? 'badge-red' : 'badge-gold'}`}>{w.status}</span></td>
                        <td>
                          {w.status === 'Pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#6EE7B7' }} onClick={() => approveWithdrawal(w.id, 'Approved')}>Approve</button>
                              <button className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.15)', color: '#FDA4AF' }} onClick={() => approveWithdrawal(w.id, 'Rejected')}>Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
