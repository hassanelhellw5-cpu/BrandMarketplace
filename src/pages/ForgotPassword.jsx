import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, MailCheck, ArrowLeft } from 'lucide-react'
import { post, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Spinner } from '../components/ui'
import './Auth.css'

export default function ForgotPassword() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      toast.error(errMsg(err, 'Something went wrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card fade-up">
        <Link to="/" className="auth-logo"><Sparkles size={20} /> Brand<span className="grad-text">Marketplace</span></Link>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <span style={{ width: 60, height: 60, borderRadius: 20, background: 'var(--grad-soft)', border: '1px solid rgba(139,92,246,0.3)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
              <MailCheck size={28} color="var(--primary-2)" />
            </span>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>Check your inbox</h1>
            <p className="auth-sub">If an account exists for <strong style={{ color: 'var(--text)' }}>{email}</strong>, we've sent a password reset link.</p>
            <Link to="/login" className="btn btn-outline" style={{ marginTop: 8 }}><ArrowLeft size={16} /> Back to login</Link>
          </div>
        ) : (
          <>
            <h1>Reset password</h1>
            <p className="auth-sub">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={submit}>
              <div className="field">
                <label>Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? <Spinner light size={18} /> : 'Send reset link'}
              </button>
            </form>
            <p className="auth-alt"><Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={14} /> Back to login</Link></p>
          </>
        )}
      </div>
    </div>
  )
}
