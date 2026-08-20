import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotification } from '../context/NotificationContext'
import { X, Bell, ShieldCheck, AlertTriangle, MessageCircle, Megaphone, Briefcase, Camera, CreditCard, AtSign, CornerUpLeft } from 'lucide-react'

const typeConfig = {
  Booking: { icon: Briefcase, color: '#3b82f6' },
  Message: { icon: MessageCircle, color: '#8b5cf6' },
  Post: { icon: Camera, color: '#06b6d4' },
  Wallet: { icon: CreditCard, color: '#10b981' },
  Highlight: { icon: Camera, color: '#f59e0b' },
  Verification: { icon: ShieldCheck, color: '#6366f1' },
  WalletAdjusted: { icon: CreditCard, color: '#10b981' },
  AdminMessage: { icon: AlertTriangle, color: '#ef4444' },
  AdminBroadcast: { icon: Megaphone, color: '#ec4899' },
  Mention: { icon: AtSign, color: '#8b5cf6' },
  Reply: { icon: CornerUpLeft, color: '#06b6d4' },
}

export default function NotificationPopup() {
  const { popups, dismissPopup } = useNotification()
  const navigate = useNavigate()
  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      pointerEvents: 'none',
    }}>
      {popups.map((p) => {
        const cfg = typeConfig[p.type] || { icon: Bell, color: '#6366f1' }
        const Icon = cfg.icon
        return (
          <div
            key={p.popupId}
            className="animate-slideIn"
            style={{
              pointerEvents: 'auto',
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,.18)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              minWidth: 320,
              maxWidth: 400,
              borderLeft: `4px solid ${cfg.color}`,
              animation: 'slideInRight 0.3s ease',
              cursor: 'pointer',
            }}
            onClick={() => {
              navigate(p.deepLink || '/notifications')
              dismissPopup(p.popupId)
            }}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `${cfg.color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={20} color={cfg.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 2 }}>{p.title}</div>
              {p.body && <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>{p.body}</div>}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismissPopup(p.popupId) }}
              style={{
                background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                color: '#94a3b8', flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(80px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
