import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Clock, DollarSign, Users, ArrowLeft, Send, Check, AlertCircle, Lock, Sparkles, Building2, UserRound, CalendarX } from 'lucide-react'
import { get, post, errMsg, parseList } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import Modal from '../components/Modal'
import SaveButton from '../components/SaveButton'
import { reportCastingView, reportApplyCasting } from '../hooks/usePageTracking'

export default function CastingDetail() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const sub = useSubscription()
  const isModel = hasRole('Model')
  const toast = useToast()
  const [casting, setCasting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applyOpen, setApplyOpen] = useState(false)
  const [appForm, setAppForm] = useState({ coverLetter: '' })
  const [applied, setApplied] = useState(false)
  const [prediction, setPrediction] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const c = await get(`/castings/${id}`)
        setCasting(c)
        reportCastingView(c.id, c.title || c.name)
        if (isModel) {
          try {
            const apps = await get('/castings/my-applications', { pageSize: 100 })
            const alreadyApplied = (apps.data || []).some((a) => String(a.castingId) === String(id))
            if (alreadyApplied) setApplied(true)
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ } finally { setLoading(false) }
    }
    load()
  }, [id, isModel])

  const appsLeft = sub.remaining('casting-apps')
  const appsBlocked = sub.limit('casting-apps') !== null && appsLeft.remaining <= 0

  const submit = async (e) => {
    e.preventDefault()
    if (appsBlocked) {
      toast.error('You reached your free application limit — upgrade to keep applying')
      setApplyOpen(false)
      return
    }
    try {
      const res = await post(`/castings/${id}/apply`, appForm)
      sub.consume('casting-apps')
      reportApplyCasting(id, casting?.title || casting?.name || 'Casting')
      setApplied(true)
      setApplyOpen(false)
      setPrediction(res.successProbability)
      toast.success('Application submitted!')
    } catch (err) {
      toast.error(errMsg(err))
    }
  }

  if (loading) return <PageLoader />
  if (!casting) return <EmptyState title="Casting not found" message="This casting may have been removed." />

  const categories = parseList(casting.categories)
  const genders = parseList(casting.requiredGenders)
  const deadlinePassed = casting.applicationDeadline && new Date(casting.applicationDeadline) < new Date()
  const closedForApply = casting.status !== 'Open' || deadlinePassed

  return (
    <div className="container" style={{ padding: '40px 24px 70px', maxWidth: 900 }}>
      <Link to="/castings" style={{ color: 'var(--text-dim)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 22 }}>
        <ArrowLeft size={15} /> Back to castings
      </Link>

      <div className="card" style={{ padding: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'start' }}>
          <div>
            <span className="badge badge-green" style={{ marginBottom: 12 }}>{casting.status}</span>
            {deadlinePassed && <span className="badge badge-red" style={{ marginLeft: 8, marginBottom: 12 }}>Deadline passed</span>}
            <h1 style={{ fontSize: 'clamp(24px,3.5vw,34px)', marginBottom: 8 }}>{casting.title}</h1>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', color: 'var(--text-dim)', fontSize: 14, marginTop: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={15} /> {casting.location || 'Remote'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={15} /> Deadline: {casting.applicationDeadline ? new Date(casting.applicationDeadline).toLocaleDateString() : 'Open'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={15} /> {casting.budget != null ? `${casting.currency || '$'}${casting.budget}` : 'Budget N/A'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={15} /> {casting.currentApplications}/{casting.maxApplications || '∞'} applied</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <span className="badge">{casting.isPaid ? 'Paid' : 'Collab'}</span>
            {casting.travelRequired && <span className="badge badge-gold">Travel required</span>}
            {casting.brandUserId && <Link to={`/u/${casting.brandUserId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontSize: 13 }}><Building2 size={14} /> View brand profile</Link>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0' }}>
          {categories.map((c) => <span key={c} className="badge">{c}</span>)}
        </div>

        {(genders.length > 0 || casting.ageRangeMin != null || casting.ageRangeMax != null || casting.ethnicityPreference) && (
          <div className="detail-block">
            <h3>Who we're looking for</h3>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', color: 'var(--text-dim)', fontSize: 14 }}>
              {genders.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UserRound size={15} /> {genders.join(', ')}</span>}
              {(casting.ageRangeMin != null || casting.ageRangeMax != null) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarX size={15} /> Ages {casting.ageRangeMin ?? '—'}–{casting.ageRangeMax ?? '—'}</span>
              )}
              {casting.ethnicityPreference && <span>Ethnicity: {casting.ethnicityPreference}</span>}
            </div>
          </div>
        )}

        <div className="detail-block">
          <h3>Description</h3>
          <p style={{ color: 'var(--text-dim)', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{casting.description || 'No description provided.'}</p>
        </div>

        {casting.requirements && (
          <div className="detail-block">
            <h3>Requirements</h3>
            <p style={{ color: 'var(--text-dim)', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{casting.requirements}</p>
          </div>
        )}

        {casting.compensationDetails && (
          <div className="detail-block">
            <h3>Compensation</h3>
            <p style={{ color: 'var(--text-dim)', whiteSpace: 'pre-line' }}>{casting.compensationDetails}</p>
          </div>
        )}

        {applied && (
          <div className="apply-success">
            <Check size={22} color="#10B981" />
            <div>
              <strong>Application submitted</strong>
              {prediction != null && <p style={{ fontSize: 13.5, marginTop: 4 }}>AI success probability: <strong style={{ color: 'var(--primary-2)' }}>{prediction}%</strong></p>}
            </div>
          </div>
        )}

        {isModel && !applied && closedForApply && (
          <div className="apply-success" style={{ justifyContent: 'center' }}>
            <AlertCircle size={20} color="var(--gold)" />
            <strong style={{ fontSize: 14 }}>This casting is {deadlinePassed ? 'past its application deadline' : 'no longer accepting applications'}.</strong>
          </div>
        )}

        {isModel && !applied && !closedForApply && (
          appsBlocked ? (
            <div className="card" style={{ background: 'var(--grad-soft)', borderColor: 'rgba(139,92,246,0.3)', padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Lock size={18} style={{ color: 'var(--primary)' }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 14.5 }}>You reached your free application limit</strong>
                  <p style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 3 }}>Upgrade to Pro for unlimited casting applications and more.</p>
                </div>
                <Link to="/plans" className="btn btn-primary btn-sm"><Sparkles size={14} /> Upgrade</Link>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => setApplyOpen(true)}>
              <Send size={17} /> Apply for this casting
              {appsLeft.limit != null && <span style={{ fontSize: 12.5, opacity: 0.8 }}>({appsLeft.remaining} left)</span>}
            </button>
          )
        )}
        {!isModel && (
          <div className="apply-success" style={{ justifyContent: 'center' }}>
            <AlertCircle size={20} color="var(--gold)" />
            <strong style={{ fontSize: 14 }}>Applying is for models — brands can review applicants in My Castings.</strong>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <SaveButton targetType="casting" targetId={id} targetTitle={casting.title} block />
        </div>
      </div>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for this casting">
        <form onSubmit={submit}>
          <div className="field">
            <label>Cover letter</label>
            <textarea rows={6} placeholder="Tell the casting director why you're a great fit…" value={appForm.coverLetter} onChange={(e) => setAppForm({ ...appForm, coverLetter: e.target.value })} />
          </div>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: 13.5, marginBottom: 16 }}>
            <AlertCircle size={15} /> Your application will be scored with AI for success probability.
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Submit application</button>
        </form>
      </Modal>
    </div>
  )
}
