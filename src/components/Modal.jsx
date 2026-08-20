import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 20 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', display: 'flex' }}>
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
