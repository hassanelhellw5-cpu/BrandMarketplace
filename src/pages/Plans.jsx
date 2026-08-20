import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Check, Sparkles, Lock, Crown, Building2, User as UserIcon, ShieldCheck, AlertCircle, Clock } from 'lucide-react'
import { get } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { getPlans, getFeature } from '../data/plans'
import { useToast } from '../components/Toast'
import { reportSubscribePlan, reportCancelSubscription } from '../hooks/usePageTracking'
import Modal from '../components/Modal'
import './Plans.css'

const ROLE_META = {
  Model: { label: 'Models', icon: UserIcon, blurb: 'Get discovered, apply to more castings, and let AI grow your career.' },
  Brand: { label: 'Brands', icon: Building2, blurb: 'Hire faster and run your social media & marketing from one hub.' },
  Agency: { label: 'Agencies', icon: ShieldCheck, blurb: 'Manage unlimited rosters and market your talent everywhere.' },
}

const PAY_METHODS = ['wallet', 'Instapay', 'VodafoneCash', 'BankTransfer', 'PayPal']

export default function Plans() {
  const { isAuthed } = useAuth()
  const sub = useSubscription()
  const toast = useToast()
  const navigate = useNavigate()

  const [role, setRole] = useState(sub.role || 'Model')
  const [checkout, setCheckout] = useState(null)
  const [payForm, setPayForm] = useState({ method: 'wallet', reference: '' })
  const [balance, setBalance] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => { if (sub.role) setRole(sub.role) }, [sub.role])

  const visibleRoles = isAuthed ? Object.keys(ROLE_META).filter((r) => r === sub.role) : Object.keys(ROLE_META)

  const openCheckout = (plan) => {
    if (!isAuthed) { navigate('/signup'); return }
    if (plan.price === 0) return
    setCheckout(plan)
    setPayForm({ method: 'wallet', reference: '' })
    setBalance(null)
    get('/wallet').then((w) => setBalance(w?.balance ?? null)).catch(() => setBalance(null))
  }

  const submit = async () => {
    if (!checkout || checkout.price === 0) return
    setSubmitting(true)
    try {
      await sub.subscribe(checkout, { method: payForm.method, reference: payForm.reference, amount: checkout.price })
      reportSubscribePlan(checkout?.name || checkout?.title || 'Plan')
      toast.success('Subscription requested — our team will review your payment')
      setCheckout(null)
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Could not submit your subscription request')
    } finally { setSubmitting(false) }
  }

  const downgrade = () => {
    sub.cancel()
    reportCancelSubscription()
    toast.success('Subscription cancelled — you are back on the free plan')
  }

  const requestTrial = async (plan) => {
    if (!isAuthed) { navigate('/signup'); return }
    setRequesting(true)
    try {
      await sub.subscribe(plan, { method: 'trial', reference: 'Free trial' }, { trial: true, trialDays: 10 })
      toast.success('Free trial requested — the admin will approve it from the dashboard')
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Could not request the free trial')
    } finally {
      setRequesting(false)
    }
  }

  const plans = getPlans(role)
  const isCurrent = (p) => sub.status === 'active' && sub.plan?.name === p.name
  const isPendingPlan = (p) => sub.status === 'pending' && String(sub.sub?.planName || '').toLowerCase() === p.name.toLowerCase()
  const isCurrentFree = (p) => isAuthed && p.price === 0 && sub.status !== 'active'

  const limitedFeatures = sub.isActive && sub.plan
    ? sub.plan.features.filter((x) => x.f && x.limit != null)
    : []

  const currentPlanLabel = sub.isActive
    ? sub.plan?.name
    : sub.status === 'pending' ? 'Review pending'
    : sub.status === 'expired' ? 'Expired'
    : sub.status === 'cancelled' ? 'Cancelled'
    : 'Free'

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 1100 }}>
      <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 30px' }}>
        <span className="badge" style={{ marginBottom: 10 }}><Sparkles size={13} /> Membership plans</span>
        <h1 className="section-title">Pick the plan that <span className="grad-text">unlocks your growth</span></h1>
        <p style={{ color: 'var(--text-dim)', marginTop: 10, lineHeight: 1.7 }}>Every plan includes the free Starter features. Upgrade to unlock paid features — they only activate after your subscription is approved.</p>
      </div>

      <div className="plans-tabs">
        {visibleRoles.map((r) => {
          const M = ROLE_META[r]
          return (
            <button key={r} className={`plans-tab${role === r ? ' active' : ''}`} onClick={() => setRole(r)}>
              <M.icon size={16} /> {M.label}
            </button>
          )
        })}
      </div>
      <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 13.5, margin: '12px 0 26px' }}>{ROLE_META[role].blurb}</p>

      <div className="plans-grid">
        {plans.map((p) => {
          const current = isCurrent(p) || isCurrentFree(p)
          const pendingPlan = isPendingPlan(p)
          return (
            <div key={p.key} className={`plan-card card${p.popular ? ' popular' : ''}`}>
              {p.popular && <span className="plan-popular"><Crown size={12} /> Most popular</span>}
              <div className="plan-card-head">
                <span className="plan-dot" style={{ background: p.color }} />
                <h3>{p.name}</h3>
                <p className="plan-tagline">{p.tagline}</p>
              </div>
              <div className="plan-price">
                <strong>{p.price === 0 ? 'Free' : `$${p.price}`}</strong>
                {p.price > 0 && <span>/ month</span>}
              </div>
              <ul className="plan-feats">
                {p.features.map((feat, i) => (
                  <li key={i}>
                    <span className={`plan-feat-ic${feat.f ? '' : ' base'}`}>{feat.f ? <Check size={13} /> : <Sparkles size={12} />}</span>
                    {feat.label}
                  </li>
                ))}
              </ul>
              {current ? (
                <button className="btn btn-ghost btn-sm plan-cta" disabled={isAuthed && sub.isActive && p.price > 0}>
                  {isAuthed && sub.isActive && p.price > 0 ? 'Current plan' : 'Current free plan'}
                </button>
              ) : pendingPlan ? (
                <button className="btn btn-outline btn-sm plan-cta" disabled>
                  <Clock size={13} /> Under review
                </button>
              ) : isAuthed && sub.isActive && p.price === 0 ? (
                <button className="btn btn-outline btn-sm plan-cta" onClick={downgrade}>Switch to free</button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                  <button className={`btn ${p.price === 0 ? 'btn-ghost' : 'btn-primary'} btn-sm plan-cta`} onClick={() => openCheckout(p)}>
                    {p.price === 0 ? 'Start free' : `Upgrade to ${p.name}`}
                  </button>
                  {p.price > 0 && (
                    <button className="btn btn-outline btn-sm plan-cta" onClick={() => requestTrial(p)} disabled={requesting || (isAuthed && sub.status === 'pending')}>
                      Try 10 days free
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card plan-enterprise-note" style={{ marginTop: 26, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: 'var(--bg-soft)', border: '1px dashed rgba(139,92,246,0.35)' }}>
        <Building2 size={22} color="var(--primary-2)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <strong style={{ fontSize: 14 }}>Need API access, webhooks, KYC or gamified growth?</strong>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>
            These plans above unlock the platform features. Teams that want programmatic access, integrations, identity verification and enterprise perks manage a separate <b>Enterprise subscription</b> in the Enterprise hub.
          </p>
        </div>
        <Link to="/enterprise" className="btn btn-outline btn-sm"><Crown size={13} /> Open Enterprise hub</Link>
      </div>

      {isAuthed && (
        <div className="card plan-mine" style={{ marginTop: 34 }}>
          <div className="plan-mine-head">
            <div>
              <span className="badge" style={{ marginBottom: 8 }}>My subscription</span>
              <h2 style={{ fontSize: 20 }}><span className="grad-text">{currentPlanLabel}</span> · {sub.role}</h2>
            </div>
            {sub.isActive && <PlanStatusPill color={sub.plan?.color} text={`Active until ${new Date(sub.sub?.endDate || sub.sub?.expiresAt).toLocaleDateString()}`} />}
            {sub.status === 'pending' && <PlanStatusPill color="#F59E0B" text="Awaiting review" />}
            {sub.status === 'expired' && <PlanStatusPill color="#F43F5E" text="Expired" />}
            {sub.status === 'cancelled' && <PlanStatusPill color="#F43F5E" text="Cancelled" />}
          </div>

          {sub.status === 'none' && (
            <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 6 }}>
              You are on the <strong>{sub.plan?.name}</strong> plan. Paid features stay locked until you subscribe and your payment is approved.
            </p>
          )}

          {sub.status === 'pending' && sub.sub && (
            <div className="plan-review">
              <div>
                <AlertCircle size={16} color="var(--gold)" />
                <div>
                  <strong style={{ fontSize: 14.5 }}>
                    {sub.sub.planName}
                    {sub.sub.trialEndDate ? ' — 10-day free trial' : sub.sub.price > 0 ? ` — $${sub.sub.price} via ${sub.sub.paymentMethod || 'wallet'}` : ''}
                  </strong>
                  <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 3 }}>
                    {sub.sub.trialEndDate
                      ? 'Your free trial request is under review. It activates as soon as the admin approves it from the dashboard.'
                      : sub.sub.paymentReference
                        ? `Reference: ${sub.sub.paymentReference}. Your features unlock as soon as the admin approves your payment.`
                        : 'Paid from wallet balance. Your features unlock as soon as the admin approves your payment.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {sub.isActive && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-danger btn-sm" onClick={downgrade}>Cancel plan</button>
            </div>
          )}

          {limitedFeatures.length > 0 && (
            <div className="plan-usage">
              <h4>Usage this month</h4>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {limitedFeatures.map((x) => {
                  const rem = sub.remaining(x.f)
                  const pct = rem.limit === 0 ? 0 : Math.min(100, (rem.used / rem.limit) * 100)
                  return (
                    <div key={x.f} className="plan-usage-item">
                      <span>{getFeature(x.f).label}</span>
                      <strong>{rem.limit === null ? '∞' : `${rem.remaining} left`}</strong>
                      {rem.limit !== null && (
                        <div className="plan-usage-bar"><div style={{ width: `${pct}%` }} /></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {!isAuthed && (
        <p style={{ textAlign: 'center', marginTop: 30, color: 'var(--text-dim)', fontSize: 14 }}>
          <Lock size={13} style={{ verticalAlign: -2 }} /> Log in to subscribe and start using the paid features.
        </p>
      )}

      <Modal open={!!checkout} onClose={() => setCheckout(null)} title={checkout ? `Subscribe to ${checkout.name}` : ''}>
        {checkout && (
          <div>
            <div className="plan-checkout-summary">
              <div>
                <strong>{checkout.name} · {ROLE_META[role].label}</strong>
                <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>{checkout.tagline}</p>
              </div>
              <div className="plan-price" style={{ margin: 0 }}><strong>${checkout.price}</strong><span>/ month</span></div>
            </div>

            <div className="field">
              <label>Payment method</label>
              <select value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}>
                {PAY_METHODS.map((m) => (
                  <option key={m} value={m} disabled={m === 'wallet' && balance != null && balance < checkout.price}>
                    {m === 'wallet' ? `Wallet balance (${balance != null ? `$${balance.toLocaleString()}` : 'checking…'})` : m}
                  </option>
                ))}
              </select>
            </div>

            {payForm.method !== 'wallet' && (
              <div className="field">
                <label>Reference number</label>
                <input value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} placeholder="e.g. Instapay transaction ID" />
              </div>
            )}

            <p style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>
              <Clock size={15} style={{ flexShrink: 0, marginTop: 2, color: 'var(--gold)' }} />
              {payForm.method === 'wallet'
                ? 'The amount is deducted from your wallet immediately. Your features unlock as soon as the admin approves the subscription.'
                : 'Payment is reviewed manually before activation. You will not be charged twice — billing resets every 30 days. Cancel anytime.'}
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setCheckout(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={submit} disabled={submitting || (payForm.method === 'wallet' && balance != null && balance < checkout.price)}>
                {submitting ? 'Submitting…' : `Pay $${checkout.price} & subscribe`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function PlanStatusPill({ color, text }) {
  return (
    <span className="plan-status-pill" style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>
      <span className="plan-dot" style={{ background: color }} /> {text}
    </span>
  )
}
