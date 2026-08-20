import Modal from './Modal'

export default function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Confirm', onConfirm, onClose, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={440}>
      {message && (
        <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.6, margin: '0 0 22px' }}>{message}</p>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={busy}
          style={{ background: '#EF4444', borderColor: '#EF4444' }}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
