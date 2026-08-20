import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { errMsg } from '../api/client'
import { Spinner } from '../components/ui'
import './Auth.css'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Welcome back, ${user.displayName || user.userName}!`)
      navigate(user.roles?.some((r) => ['Admin', 'SuperAdmin'].includes(r)) ? '/admin' : '/dashboard')
    } catch (err) {
      toast.error(errMsg(err, 'Invalid credentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card fade-up">
        <Link to="/" className="auth-logo"><Sparkles size={20} /> Brand<span className="grad-text">Marketplace</span></Link>
        <h1>Welcome back</h1>
        <p className="auth-sub">Log in to manage your career or your next campaign.</p>

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <div className="pass-wrap">
              <input type={show ? 'text' : 'password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              <button type="button" className="pass-toggle" onClick={() => setShow((s) => !s)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
          <div style={{ textAlign: 'right', marginBottom: 18 }}>
            <Link to="/forgot-password" style={{ color: 'var(--primary-2)', fontSize: 13.5, fontWeight: 600 }}>Forgot password?</Link>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <Spinner light size={18} /> : <>Log in <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="auth-alt">Don't have an account? <Link to="/signup">Create one free</Link></p>
      </div>
    </div>
  )
}
