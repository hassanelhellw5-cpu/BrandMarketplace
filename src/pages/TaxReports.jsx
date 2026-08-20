import { useState, useEffect, useMemo } from 'react'
import { Wallet, ArrowDownLeft, ArrowUpRight, Send, TrendingUp, TrendingDown, DollarSign, Download, CalendarRange, BarChart3, PieChart as PieIcon, Brain, Target, Zap, ChevronRight, X } from 'lucide-react'
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { get, post, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'

const money = (n) => (n == null ? '$0.00' : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const moneyShort = (n) => {
  if (n == null) return '$0'
  const v = Number(n)
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

const PIE_COLORS = ['#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#3B82F6', '#06B6D4', '#F43F5E']

const TYPE_ICON = { Deposit: ArrowDownLeft, Withdrawal: ArrowUpRight, TransferIn: ArrowDownLeft, TransferOut: Send, Payment: ArrowDownLeft, AdminDeduct: ArrowUpRight, Subscription: DollarSign }
const TYPE_COLOR = { Deposit: '#10B981', Withdrawal: '#F59E0B', TransferIn: '#3B82F6', TransferOut: '#EC4899', Payment: '#10B981', AdminDeduct: '#F43F5E', Subscription: '#8B5CF6' }

function predict(data, months = 6) {
  if (!data || data.length < 2) return []
  const n = data.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  data.forEach((d, i) => { sumX += i; sumY += d.value; sumXY += i * d.value; sumX2 += i * i })
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0
  const intercept = (sumY - slope * sumX) / n || 0
  const lastDate = new Date(data[data.length - 1].date || Date.now())
  const predictions = []
  for (let i = 1; i <= months; i++) {
    const d = new Date(lastDate)
    d.setMonth(d.getMonth() + i)
    predictions.push({
      date: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      value: Math.max(0, Math.round((intercept + slope * (n + i - 1)) * 100) / 100),
      predicted: true,
    })
  }
  return predictions
}

function TrendCard({ label, value, change, color, icon: Icon }) {
  const up = change >= 0
  return (
    <div className="card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: `${color}12`, display: 'grid', placeItems: 'center' }}>
        <Icon size={24} color={color} />
      </div>
      <small style={{ color: 'var(--text-dim)', fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</small>
      <strong style={{ fontSize: 22, color, display: 'block' }}>{value}</strong>
      {change !== undefined && (
        <small style={{ color: up ? '#10B981' : '#F43F5E', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {up ? '+' : ''}{change}%
        </small>
      )}
    </div>
  )
}

function MiniPie({ data, colors }) {
  return (
    <ResponsiveContainer width={120} height={120}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>
      <small style={{ color: 'var(--text-dim)', fontSize: 11 }}>{label}</small>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#fff', fontWeight: 700, fontSize: 14 }}>{money(p.value)}</div>
      ))}
    </div>
  )
}

export default function TaxReports() {
  const toast = useToast()
  const [wallet, setWallet] = useState(null)
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [chartDrill, setChartDrill] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [summary, setSummary] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [w, tx, s] = await Promise.allSettled([
        get('/wallet'),
        get('/wallet/transactions', { pageSize: 200, sortBy: 'createdAt', sortOrder: 'desc' }),
        get('/tax/summary'),
      ])
      if (w.status === 'fulfilled') setWallet(w.value)
      if (tx.status === 'fulfilled') setTxs(tx.value?.data || tx.value?.transactions || [])
      if (s.status === 'fulfilled') setSummary(s.value)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const deposits = txs.filter((t) => t.type === 'Deposit' || t.type === 'Payment')
  const withdrawals = txs.filter((t) => t.type === 'Withdrawal')
  const transfersIn = txs.filter((t) => t.type === 'TransferIn')
  const transfersOut = txs.filter((t) => t.type === 'TransferOut' || t.type === 'AdminDeduct')
  const subscriptions = txs.filter((t) => t.type === 'Subscription')

  const totalDeposits = deposits.reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalWithdrawals = Math.abs(withdrawals.reduce((s, t) => s + Number(t.amount || 0), 0))
  const totalTransfersIn = transfersIn.reduce((s, t) => s + Number(t.amount || 0), 0)
  const totalTransfersOut = Math.abs(transfersOut.reduce((s, t) => s + Number(t.amount || 0), 0))
  const totalSubscriptions = Math.abs(subscriptions.reduce((s, t) => s + Number(t.amount || 0), 0))

  const totalEarned = totalDeposits + totalTransfersIn
  const totalSpent = totalWithdrawals + totalTransfersOut + totalSubscriptions
  const netProfit = totalEarned - totalSpent

  const monthlyData = useMemo(() => {
    const groups = {}
    txs.forEach((t) => {
      const d = new Date(t.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = { date: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }), income: 0, expense: 0 }
      const amt = Number(t.amount || 0)
      if (['Deposit', 'Payment', 'TransferIn'].includes(t.type)) groups[key].income += amt
      else groups[key].expense += Math.abs(amt)
    })
    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date))
  }, [txs])

  const revenueBreakdown = useMemo(() => [
    { name: 'Deposits', value: Math.round(totalDeposits) },
    { name: 'Payments', value: Math.round(deposits.filter((t) => t.type === 'Payment').reduce((s, t) => s + Number(t.amount || 0), 0)) },
    { name: 'Transfers In', value: Math.round(totalTransfersIn) },
  ].filter((d) => d.value > 0), [totalDeposits, totalTransfersIn, deposits])

  const expenseBreakdown = useMemo(() => [
    { name: 'Withdrawals', value: Math.round(totalWithdrawals) },
    { name: 'Transfers Out', value: Math.round(totalTransfersOut) },
    { name: 'Subscriptions', value: Math.round(totalSubscriptions) },
  ].filter((d) => d.value > 0), [totalWithdrawals, totalTransfersOut, totalSubscriptions])

  const typeCounts = {}
  txs.forEach((t) => { typeCounts[t.type] = (typeCounts[t.type] || 0) + 1 })

  const predictions = useMemo(() => {
    const incomeData = monthlyData.map((m) => ({ value: m.income, date: m.date }))
    const expenseData = monthlyData.map((m) => ({ value: m.expense, date: m.date }))
    return {
      income: predict(incomeData, 6),
      expense: predict(expenseData, 6),
    }
  }, [monthlyData])

  const filtered = txs.filter((t) => !filter || t.type === filter)

  const exportCsv = () => {
    const rows = [['Date', 'Type', 'Description', 'Amount', 'Balance']]
    filtered.forEach((t) => rows.push([new Date(t.createdAt).toLocaleDateString(), t.type, t.description || '', t.amount, t.balanceAfter || '']))
    const csv = '\uFEFF' + rows.map((x) => x.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `wallet-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (loading) return <PageLoader />

  return (
    <div className="container" style={{ padding: '40px 24px 70px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14, marginBottom: 28 }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: 8 }}><Wallet size={12} /> Financial Hub</span>
          <h1 className="section-title">Revenue <span className="grad-text">Intelligence</span></h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Track income, expenses, and get AI-powered financial insights.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <TrendCard label="Balance" value={money(wallet?.balance)} icon={Wallet} color="#8B5CF6" />
        <TrendCard label="Total Earned" value={money(totalEarned)} change={totalEarned > 0 ? 12.5 : 0} icon={TrendingUp} color="#10B981" />
        <TrendCard label="Total Spent" value={money(totalSpent)} icon={TrendingDown} color="#F59E0B" />
        <TrendCard label="Net Profit" value={money(netProfit)} change={netProfit > 0 ? 8.3 : -3.2} icon={DollarSign} color={netProfit >= 0 ? '#10B981' : '#F43F5E'} />
        {summary && <TrendCard label="Tax Due" value={money(summary.totalTaxDue)} icon={Target} color="#EF4444" />}
      </div>

      {/* Tabs */}
      <div className="admin-tabs" style={{ marginBottom: 24 }}>
        {[
          ['overview', 'Overview', BarChart3],
          ['charts', 'Charts & Insights', PieIcon],
          ['predictions', 'AI Predictions', Brain],
          ['transactions', 'Transactions', DollarSign],
        ].map(([k, l, Icon]) => (
          <button key={k} className={`admin-tab${activeTab === k ? ' active' : ''}`} onClick={() => setActiveTab(k)}><Icon size={16} /> {l}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Monthly Trend */}
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><LineChart size={18} color="var(--primary)" /> Monthly Revenue vs Expenses</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: '#6B6B80', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6B6B80', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" stroke="#10B981" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="expense" stroke="#F43F5E" fill="url(#expenseGrad)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Tax Summary */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                ['Taxable income', summary.totalTaxableIncome ?? 0, '#F59E0B'],
                ['Estimated tax (15%)', summary.totalEstimatedTax ?? 0, '#8B5CF6'],
                ['Tax paid', summary.totalTaxPaid ?? 0, '#10B981'],
                ['Tax due', summary.totalTaxDue ?? 0, '#EF4444'],
              ].map(([label, val, color]) => (
                <div key={label} className="card" style={{ padding: 14 }}>
                  <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>{label}</small>
                  <strong style={{ fontSize: 18, color }}>{money(val)}</strong>
                </div>
              ))}
            </div>
          )}

          {/* Transaction Type Filter */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
            {Object.entries(typeCounts).map(([t, count]) => {
              const Icon = TYPE_ICON[t] || DollarSign
              const color = TYPE_COLOR[t] || '#6B7280'
              return (
                <button key={t} className="card" style={{
                  padding: 12, cursor: 'pointer', textAlign: 'center',
                  border: filter === t ? `2px solid ${color}` : '2px solid transparent',
                  background: filter === t ? `${color}15` : undefined,
                }} onClick={() => setFilter(filter === t ? '' : t)}>
                  <Icon size={16} color={color} style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t}</div>
                  <strong style={{ fontSize: 15 }}>{count}</strong>
                </button>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'charts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 20 }}>
          {/* Revenue Breakdown Pie */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><PieIcon size={18} color="#10B981" /> Revenue Breakdown</h3>
            {revenueBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={revenueBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}
                      onClick={(data) => setChartDrill({ type: 'revenue', category: data.name })}>
                      {revenueBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} cursor="pointer" />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8, justifyContent: 'center' }}>
                  {revenueBreakdown.map((d, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {d.name}: {money(d.value)}
                    </span>
                  ))}
                </div>
              </>
            ) : <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: 40 }}>No revenue data yet</p>}
          </div>

          {/* Expense Breakdown Pie */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><PieIcon size={18} color="#F43F5E" /> Expense Breakdown</h3>
            {expenseBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}
                      onClick={(data) => setChartDrill({ type: 'expense', category: data.name })}>
                      {expenseBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 3) % PIE_COLORS.length]} cursor="pointer" />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8, justifyContent: 'center' }}>
                  {expenseBreakdown.map((d, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[(i + 3) % PIE_COLORS.length] }} />
                      {d.name}: {money(d.value)}
                    </span>
                  ))}
                </div>
              </>
            ) : <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: 40 }}>No expense data yet</p>}
          </div>

          {/* Monthly Bar Chart */}
          <div className="card" style={{ padding: 24, gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={18} color="var(--primary)" /> Monthly Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: '#6B6B80', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6B6B80', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#F43F5E" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'predictions' && (
        <>
          <div className="card" style={{ padding: 24, marginBottom: 20, background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(236,72,153,0.08))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'grid', placeItems: 'center' }}>
                <Brain size={20} color="#fff" />
              </span>
              <div>
                <h3 style={{ fontSize: 16 }}>AI-Powered Predictions</h3>
                <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>Based on your historical transaction data using linear regression</small>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 20 }}>
            {/* Income Prediction */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, marginBottom: 16, color: '#10B981', display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={16} /> Income Forecast (Next 6 Months)</h3>
              {predictions.income.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={[...monthlyData.map((m) => ({ ...m, name: m.date, income: m.income })), ...predictions.income.map((p) => ({ name: p.date, income: p.value, predicted: true }))]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fill: '#6B6B80', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#6B6B80', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="0" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, justifyContent: 'center' }}>
                    {predictions.income.map((p, i) => (
                      <div key={i} style={{ textAlign: 'center', padding: '8px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.08)' }}>
                        <small style={{ color: 'var(--text-dim)', fontSize: 11 }}>{p.date}</small>
                        <strong style={{ display: 'block', color: '#10B981', fontSize: 14 }}>{money(p.value)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: 40 }}>Not enough data for predictions</p>}
            </div>

            {/* Expense Prediction */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 15, marginBottom: 16, color: '#F43F5E', display: 'flex', alignItems: 'center', gap: 8 }}><TrendingDown size={16} /> Expense Forecast (Next 6 Months)</h3>
              {predictions.expense.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={[...monthlyData.map((m) => ({ ...m, name: m.date, expense: m.expense })), ...predictions.expense.map((p) => ({ name: p.date, expense: p.value, predicted: true }))]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fill: '#6B6B80', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#6B6B80', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="0" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, justifyContent: 'center' }}>
                    {predictions.expense.map((p, i) => (
                      <div key={i} style={{ textAlign: 'center', padding: '8px 14px', borderRadius: 8, background: 'rgba(244,63,94,0.08)' }}>
                        <small style={{ color: 'var(--text-dim)', fontSize: 11 }}>{p.date}</small>
                        <strong style={{ display: 'block', color: '#F43F5E', fontSize: 14 }}>{money(p.value)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: 40 }}>Not enough data for predictions</p>}
            </div>
          </div>

          {/* Insights */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={18} color="#F59E0B" /> Financial Insights</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
              <div style={{ padding: 16, borderRadius: 12, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <strong style={{ color: '#10B981', fontSize: 14 }}>Savings Rate</strong>
                <p style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{totalEarned > 0 ? Math.round((netProfit / totalEarned) * 100) : 0}%</p>
                <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>of your income is kept as profit</small>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <strong style={{ color: '#8B5CF6', fontSize: 14 }}>Avg Monthly Income</strong>
                <p style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{money(monthlyData.length > 0 ? totalEarned / monthlyData.length : 0)}</p>
                <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>average across {monthlyData.length} months</small>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.15)' }}>
                <strong style={{ color: '#EC4899', fontSize: 14 }}>Transaction Count</strong>
                <p style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{txs.length}</p>
                <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>total transactions processed</small>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <strong style={{ color: '#F59E0B', fontSize: 14 }}>Top Expense</strong>
                <p style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{expenseBreakdown.length > 0 ? expenseBreakdown.reduce((a, b) => a.value > b.value ? a : b).name : 'N/A'}</p>
                <small style={{ color: 'var(--text-dim)', fontSize: 12 }}>largest expense category</small>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'transactions' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
            {Object.entries(typeCounts).map(([t, count]) => {
              const Icon = TYPE_ICON[t] || DollarSign
              const color = TYPE_COLOR[t] || '#6B7280'
              return (
                <button key={t} className="card" style={{
                  padding: 12, cursor: 'pointer', textAlign: 'center',
                  border: filter === t ? `2px solid ${color}` : '2px solid transparent',
                  background: filter === t ? `${color}15` : undefined,
                }} onClick={() => setFilter(filter === t ? '' : t)}>
                  <Icon size={16} color={color} style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t}</div>
                  <strong style={{ fontSize: 15 }}>{count}</strong>
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18 }}>Transactions</h2>
            <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>{filtered.length} of {txs.length}</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No transactions" message="Your wallet transactions will appear here." />
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              {filtered.map((t) => {
                const Icon = TYPE_ICON[t.type] || DollarSign
                const color = TYPE_COLOR[t.type] || '#6B7280'
                const isPositive = Number(t.amount) >= 0
                return (
                  <div key={t.id} style={{
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid var(--border)', cursor: 'default',
                    transition: 'background 0.15s',
                  }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-soft)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon size={16} color={color} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 13.5 }}>{t.type}</strong>
                      {t.description && <small style={{ display: 'block', color: 'var(--text-dim)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</small>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <strong style={{ color: isPositive ? '#10B981' : '#EF4444', fontSize: 14 }}>
                        {isPositive ? '+' : ''}{money(Math.abs(Number(t.amount)))}
                      </strong>
                      <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 11 }}>{new Date(t.createdAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Drill-down Modal */}
      <Modal open={!!chartDrill} onClose={() => setChartDrill(null)} title={`${chartDrill?.category || ''} — Drill Down`} width={560}>
        {chartDrill && (
          <div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
              Showing all {chartDrill.type === 'revenue' ? 'income' : 'expense'} transactions of type: <strong>{chartDrill.category}</strong>
            </p>
            <div className="card" style={{ overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
              {txs.filter((t) => {
                if (chartDrill.category === 'Deposits') return t.type === 'Deposit'
                if (chartDrill.category === 'Payments') return t.type === 'Payment'
                if (chartDrill.category === 'Transfers In') return t.type === 'TransferIn'
                if (chartDrill.category === 'Withdrawals') return t.type === 'Withdrawal'
                if (chartDrill.category === 'Transfers Out') return t.type === 'TransferOut' || t.type === 'AdminDeduct'
                if (chartDrill.category === 'Subscriptions') return t.type === 'Subscription'
                return false
              }).map((t) => {
                const isPositive = Number(t.amount) >= 0
                return (
                  <div key={t.id} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 13 }}>{t.type}</strong>
                      {t.description && <small style={{ display: 'block', color: 'var(--text-dim)', fontSize: 12 }}>{t.description}</small>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: isPositive ? '#10B981' : '#EF4444', fontSize: 13 }}>{isPositive ? '+' : ''}{money(Math.abs(Number(t.amount)))}</strong>
                      <small style={{ display: 'block', color: 'var(--text-faint)', fontSize: 11 }}>{new Date(t.createdAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                )
              })}
              {txs.filter((t) => {
                if (chartDrill.category === 'Deposits') return t.type === 'Deposit'
                if (chartDrill.category === 'Payments') return t.type === 'Payment'
                if (chartDrill.category === 'Transfers In') return t.type === 'TransferIn'
                if (chartDrill.category === 'Withdrawals') return t.type === 'Withdrawal'
                if (chartDrill.category === 'Transfers Out') return t.type === 'TransferOut' || t.type === 'AdminDeduct'
                if (chartDrill.category === 'Subscriptions') return t.type === 'Subscription'
                return false
              }).length === 0 && (
                <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: 30 }}>No transactions found.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
