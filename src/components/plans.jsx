import { Link } from 'react-router-dom'
import { Lock, Sparkles } from 'lucide-react'
import { useSubscription } from '../context/SubscriptionContext'
import { getFeature } from '../data/plans'
import './plans.css'

export function FeatureGate({ feature, children }) {
  const { can } = useSubscription()
  if (can(feature)) return children
  return <LockedUpgrade feature={feature} />
}

export function LockedUpgrade({ feature, compact }) {
  const meta = getFeature(feature)
  return (
    <div className={`plan-locked${compact ? ' compact' : ''}`}>
      <span className="plan-lock-icon"><Lock size={18} /></span>
      <div className="plan-locked-body">
        <strong>{meta.label} is a paid feature</strong>
        <p>{meta.desc}</p>
      </div>
      <Link to="/plans" className="btn btn-primary btn-sm"><Sparkles size={14} /> Upgrade</Link>
    </div>
  )
}

export function PlanBadge() {
  const { plan, status, isActive } = useSubscription()
  if (!plan) return null
  const label = isActive
    ? `${plan.name} plan`
    : status === 'pending' ? 'Subscription under review'
    : status === 'expired' ? 'Plan expired'
    : status === 'cancelled' ? 'Plan cancelled'
    : `Free ${plan.name}`
  return (
    <Link to="/plans" className={`plan-badge${isActive ? ' on' : ''}`} style={isActive ? { background: plan.color } : undefined}>
      {!isActive && <Lock size={12} />}
      {label}
    </Link>
  )
}
