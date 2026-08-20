import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, DollarSign, Users, Target, Send, Check, CalendarRange, Lock, Sparkles, Building2 } from 'lucide-react'
import { get, post, errMsg, parseList } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'
import SaveButton from '../components/SaveButton'
import { reportCampaignView, reportApplyCampaign } from '../hooks/usePageTracking'

export default function CampaignDetail() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const sub = useSubscription()
  const isModel = hasRole('Model')
  const toast = useToast()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applyOpen, setApplyOpen] = useState(false)
  const [appForm, setAppForm] = useState({ proposal: '', proposedFee: '' })
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const c = await get(`/campaigns/${id}`)
        setCampaign(c)
        reportCampaignView(c.id, c.name || c.title)
        if (isModel) {
          try {
            const apps = await get('/campaigns/my-applications', { pageSize: 100 })
            const alreadyApplied = (apps.data || []).some((a) => String(a.campaignId) === String(id))
            if (alreadyApplied) setApplied(true)
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ } finally { setLoading(false) }
    }
    load()
  }, [id, isModel])

  const appsLeft = sub.remaining('campaign-apps')
  const appsBlocked = sub.limit('campaign-apps') !== null && appsLeft.remaining <= 0

  const submit = async (e) => {
    e.preventDefault()
    if (appsBlocked) {
      toast.error('You reached your free campaign limit — upgrade to keep applying')
      setApplyOpen(false)
      return
    }
    try {
      const body = { proposal: appForm.proposal }
      if (appForm.proposedFee) body.proposedFee = Number(appForm.proposedFee)
      await post(`/campaigns/${id}/apply`, body)
      reportApplyCampaign(id, campaign?.name || campaign?.title || 'Campaign')
      sub.consume('campaign-apps')
      setApplied(true)
      setApplyOpen(false)
      toast.success('Application submitted!')
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  if (loading) return <PageLoader />
  if (!campaign) return <EmptyState title="Campaign not found" message="This campaign may have been removed." />

  const reqTypes = parseList(campaign.requiredModelTypes)

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 900 }}>
      <Link to="/campaigns" style={{ color: 'var(--text-dim)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 22 }}>
        <ArrowLeft size={15} /> Back to campaigns
      </Link>

      <div className="card" style={{ padding: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'start' }}>
          <div>
            <span className="badge badge-green" style={{ marginBottom: 12 }}>{campaign.status}</span>
            <h1 style={{ fontSize: 'clamp(24px,3.5vw,34px)', marginBottom: 8 }}>{campaign.name}</h1>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', color: 'var(--text-dim)', fontSize: 14, marginTop: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Target size={15} /> {campaign.objective || 'General'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={15} /> {campaign.filledPositions}/{campaign.requiredModelsCount} positions filled</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={15} /> {campaign.budget ? `$${campaign.budget.toLocaleString()}` : 'Budget N/A'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarRange size={15} /> {campaign.endDate ? `Ends ${new Date(campaign.endDate).toLocaleDateString()}` : 'Open'}</span>
              {campaign.brandUserId && <Link to={`/u/${campaign.brandUserId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontSize: 13 }}><Building2 size={14} /> View brand profile</Link>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0' }}>
          {reqTypes.map((r) => <span key={r} className="badge">{r}</span>)}
        </div>

        <div className="detail-block">
          <h3>Description</h3>
          <p style={{ color: 'var(--text-dim)', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{campaign.description || 'No description provided.'}</p>
        </div>

        {campaign.creativeBrief && (
          <div className="detail-block">
            <h3>Creative brief</h3>
            <p style={{ color: 'var(--text-dim)', whiteSpace: 'pre-line' }}>{campaign.creativeBrief}</p>
          </div>
        )}

        {campaign.targetAudience && (
          <div className="detail-block">
            <h3>Target audience</h3>
            <p style={{ color: 'var(--text-dim)' }}>{campaign.targetAudience}</p>
          </div>
        )}

        {applied && (
          <div className="apply-success">
            <Check size={22} color="#10B981" />
            <strong>Application submitted!</strong>
          </div>
        )}

        {isModel && !applied && (
          appsBlocked ? (
            <div className="card" style={{ background: 'var(--grad-soft)', borderColor: 'rgba(139,92,246,0.3)', padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Lock size={18} style={{ color: 'var(--primary)' }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 14.5 }}>You reached your free campaign limit</strong>
                  <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 3 }}>Upgrade to Pro for unlimited campaign applications and more.</p>
                </div>
                <Link to="/plans" className="btn btn-primary btn-sm"><Sparkles size={14} /> Upgrade</Link>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setApplyOpen(true)}>
              <Send size={17} /> Apply to this campaign
              {appsLeft.limit != null && <span style={{ fontSize: 12.5, opacity: 0.8 }}>({appsLeft.remaining} left)</span>}
            </button>
          )
        )}
        {!isModel && (
          <div className="apply-success" style={{ justifyContent: 'center' }}>
            <Check size={20} color="var(--gold)" />
            <strong style={{ fontSize: 14 }}>Campaign applications are for models — brands manage campaigns in My Campaigns.</strong>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <SaveButton targetType="campaign" targetId={id} targetTitle={campaign.name} block />
        </div>
      </div>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply to campaign">
        <form onSubmit={submit}>
          <div className="field">
            <label>Proposal</label>
            <textarea rows={5} placeholder="Why are you a great fit for this campaign?" value={appForm.proposal} onChange={(e) => setAppForm({ ...appForm, proposal: e.target.value })} />
          </div>
          <div className="field">
            <label>Proposed fee (USD)</label>
            <input type="number" min="0" value={appForm.proposedFee} onChange={(e) => setAppForm({ ...appForm, proposedFee: e.target.value })} placeholder="Optional" />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Submit application</button>
        </form>
      </Modal>
    </div>
  )
}
