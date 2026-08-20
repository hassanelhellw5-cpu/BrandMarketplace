import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { X } from 'lucide-react'

const ToastCtx = createContext(null)

export function useToast() {
  return useContext(ToastCtx)
}

const BrandLogo = ({ variant = 'default', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill={variant === 'admin' ? '#ef4444' : variant === 'warning' ? '#f59e0b' : '#6366f1'} />
    <path d="M8 12L16 8L24 12V20L16 24L8 20V12Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="16" cy="16" r="3" fill="white" />
  </svg>
)

const typeStyles = {
  success: {
    bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
    border: '#10b981',
    logo: 'default',
    label: 'Success',
  },
  error: {
    bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
    border: '#ef4444',
    logo: 'default',
    label: 'Error',
  },
  info: {
    bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    border: '#3b82f6',
    logo: 'default',
    label: 'Info',
  },
  warning: {
    bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
    border: '#f59e0b',
    logo: 'warning',
    label: 'Warning',
  },
  admin: {
    bg: 'linear-gradient(135deg, #fef2f2, #fce7f3)',
    border: '#ef4444',
    logo: 'admin',
    label: 'Admin',
  },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const push = useCallback((type, message) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  const toast = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
    warning: (m) => push('warning', m),
    admin: (m) => push('admin', m),
  }

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => {
          const s = typeStyles[t.type] || typeStyles.info
          return (
            <div
              key={t.id}
              className="toast-animate"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 12,
                background: s.bg,
                borderLeft: `4px solid ${s.border}`,
                boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                minWidth: 300,
                maxWidth: 420,
                animation: 'toastSlideIn 0.3s ease',
              }}
            >
              <BrandLogo variant={s.logo} size={22} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{t.message}</span>
              <button
                style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
                onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastCtx.Provider>
  )
}
