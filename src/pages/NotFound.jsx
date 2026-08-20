import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '120px 24px' }}>
      <h1 style={{ fontSize: 'clamp(60px,12vw,120px)', lineHeight: 1 }} className="grad-text">404</h1>
      <h2 style={{ fontSize: 26, marginTop: 14 }}>Page not found</h2>
      <p style={{ color: 'var(--text-dim)', marginTop: 10, marginBottom: 26 }}>The page you're looking for doesn't exist or was moved.</p>
      <Link to="/" className="btn btn-primary"><Home size={17} /> Back to home</Link>
    </div>
  )
}
