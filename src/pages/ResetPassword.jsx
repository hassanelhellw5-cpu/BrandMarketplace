import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sparkles, KeyRound, ArrowLeft } from 'lucide-react'
import { post, errMsg } from '../api/client'
import { useToast } from '../components/Toast'
import { Spinner } from '../components/ui'
import './Auth.css'

export default function ResetPassword() {
  const toast = useToast()
  const [params] = useSearchParams()
  const emailParam = params.get('email') || ''
  const tokenParam = params.get('token') || ''
  const [form, setForm] = useState({ email: emailParam, newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!tokenParam) { toast.error('This link is missing its reset token. Use the link from your email.'); return }
    if (form.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (form.newPassword !== form.confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await post('/auth/reset-password', { email: form.email, token: tokenParam, newPassword: form.newPassword })
      setDone(true)
    } catch (err) {
      toast.error(errMsg(err, 'Could not reset password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card fade-up">
        <Link to="/" className="auth-logo"><Sparkles size={20} /> Brand<span className="grad-text">Marketplace</span></Link>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <span style={{ width: 60, height: 60, borderRadius: 20, background: 'var(--grad-soft)', border: '1px solid rgba(139,92,246,0.3)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
              <KeyRound size={28} color="var(--primary-2)" />
            </span>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>Password updated</h1>
            <p className="auth-sub">Your password has been reset. Sign in with your new password.</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: 8 }}>Go to login</Link>
          </div>
        ) : (
          <>
            <h1>Set a new password</h1>
            <p className="auth-sub">Choose a new password for your account.</p>
            <form onSubmit={submit}>
              <div className="field">
                <label>Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
              </div>
              <div className="field">
                <label>New password</label>
                <input type="password" required minLength={6} autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} placeholder="Minimum 6 characters" />
              </div>
              <div className="field">
                <label>Confirm password</label>
                <input type="password" required minLength={6} autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="Repeat your password" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? <Spinner light size={18} /> : 'Reset password'}
              </button>
            </form>
            <p className="auth-alt"><Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={14} /> Back to login</Link></p>
          </>
        )}
      </div>
    </div>
  )
}
