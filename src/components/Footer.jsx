import { Link } from 'react-router-dom'
import { Sparkles, Globe, Send, AtSign } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 80, background: 'var(--bg-soft)' }}>
      <div className="container" style={{ padding: '54px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 30, marginBottom: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 19, marginBottom: 14 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--grad)', display: 'grid', placeItems: 'center' }}>
                <Sparkles size={14} color="#fff" />
              </span>
              Brand<span className="grad-text">Marketplace</span>
            </div>
            <p style={{ color: 'var(--text-dim)', maxWidth: 320, fontSize: 14.5 }}>
              The modern marketplace connecting top talent, brands, and agencies — with AI-powered insights, escrow protection, and contracts.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              {[Globe, Send, AtSign].map((I, i) => (
                <span key={i} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', color: 'var(--text-dim)' }}>
                  <I size={16} />
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 14 }}>Platform</h4>
            {[['Explore', '/explore'], ['Castings', '/castings'], ['Campaigns', '/campaigns'], ['Events', '/events'], ['Marketplace', '/marketplace']].map(([l, to]) => (
              <Link key={to} to={to} style={{ display: 'block', padding: '6px 0', color: 'var(--text-dim)', fontSize: 14.5 }}>{l}</Link>
            ))}
          </div>

          <div>
            <h4 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 14 }}>Account</h4>
            {[['Sign up', '/signup'], ['Log in', '/login'], ['Dashboard', '/dashboard'], ['Wallet', '/wallet']].map(([l, to]) => (
              <Link key={to} to={to} style={{ display: 'block', padding: '6px 0', color: 'var(--text-dim)', fontSize: 14.5 }}>{l}</Link>
            ))}
          </div>

          <div>
            <h4 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 14 }}>Support</h4>
            {['Help center', 'Terms of service', 'Privacy policy', 'Contact'].map((l) => (
              <span key={l} style={{ display: 'block', padding: '6px 0', color: 'var(--text-dim)', fontSize: 14.5 }}>{l}</span>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 22, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, color: 'var(--text-faint)', fontSize: 13.5 }}>
          <span>© {new Date().getFullYear()} BrandMarketplace. All rights reserved.</span>
          <span>Powered by AI · Escrow protected</span>
        </div>
      </div>
    </footer>
  )
}
