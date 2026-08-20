import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, ArrowRight, User, Briefcase, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { errMsg } from '../api/client'
import { Spinner } from '../components/ui'
import './Auth.css'

const roles = [
  { value: 'Model', icon: User },
  { value: 'Brand', icon: Briefcase },
  { value: 'Agency', icon: Building2 },
]

export default function Signup() {
  const { signup } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [role, setRole] = useState('Model')
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordStrength = (pw) => {
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/\d/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    return score
  }

  const strength = passwordStrength(form.password)
  const strengthLabel = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'][strength]
  const strengthColor = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#10B981'][strength]

  const submit = async (e) => {
    e.preventDefault()
    if (!form.displayName.trim()) { toast.error('Display name is required.'); return }
    if (form.password !== confirm) { toast.error('Passwords do not match.'); return }
    setLoading(true)
    try {
      const user = await signup({ ...form, role })
      toast.success(`Welcome to BrandMarketplace, ${user.displayName || user.userName}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(errMsg(err, 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card fade-up" style={{ maxWidth: 480 }}>
        <Link to="/" className="auth-logo"><Sparkles size={20} /> Brand<span className="grad-text">Marketplace</span></Link>
        <h1>Create your account</h1>
        <p className="auth-sub">Join as a model, brand, or agency — it's free.</p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: 8 }}>I am a…</label>
          <div className="role-grid">
            {roles.map((r) => (
              <button type="button" key={r.value} className={`role-opt${role === r.value ? ' active' : ''}`} onClick={() => setRole(r.value)}>
                <r.icon size={20} />
                {r.value}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label>Display name *</label>
            <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Your name or brand" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <div className="pass-wrap">
              <input type={show ? 'text' : 'password'} required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 6 characters" />
              <button type="button" className="pass-toggle" onClick={() => setShow((s) => !s)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {form.password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= strength ? strengthColor : 'var(--border)' }} />
                  ))}
                </div>
                <span style={{ fontSize: 12, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
              </div>
            )}
          </div>
          <div className="field">
            <label>Confirm password</label>
            <div className="pass-wrap">
              <input type={show ? 'text' : 'password'} required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat your password" />
            </div>
            {confirm && confirm !== form.password && (
              <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4, display: 'block' }}>Passwords do not match.</span>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <Spinner light size={18} /> : <>Create account <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="auth-alt">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  )
}
