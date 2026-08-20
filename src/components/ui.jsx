export function Spinner({ size = 28, light = false }) {
  return (
    <div style={{ display: 'inline-flex', justifyItems: 'center' }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `3px solid ${light ? 'rgba(255,255,255,0.2)' : 'rgba(139,92,246,0.2)'}`,
          borderTopColor: light ? '#fff' : 'var(--primary)',
          animation: 'spin 0.8s linear infinite',
          display: 'block',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function PageLoader({ text = 'Loading…' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '90px 20px' }}>
      <Spinner size={38} />
      <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>{text}</p>
    </div>
  )
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{message}</p>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  )
}

export function StarRating({ rating = 0, size = 15 }) {
  return (
    <span style={{ color: 'var(--gold)', display: 'inline-flex', gap: 2, fontSize: size, letterSpacing: 1 }}>
      {'★'.repeat(Math.round(rating))}
      <span style={{ color: 'rgba(255,255,255,0.15)' }}>{'★'.repeat(Math.max(0, 5 - Math.round(rating)))}</span>
    </span>
  )
}

export function Pagination({ page, pageSize, total, onPage, show = 5 }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const start = Math.max(1, page - Math.floor(show / 2))
  const end = Math.min(pages, start + show - 1)
  const list = []
  for (let i = start; i <= end; i++) list.push(i)

  if (pages <= 1) return null
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', padding: '30px 0' }}>
      <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
      {list.map((p) => (
        <button
          key={p}
          className="btn btn-sm"
          style={p === page
            ? { background: 'var(--grad)', color: '#fff' }
            : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
          onClick={() => onPage(p)}
        >
          {p}
        </button>
      ))}
      <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  )
}
