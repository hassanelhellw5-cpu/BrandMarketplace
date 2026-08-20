import { useState, useRef, useEffect } from 'react'
import { get, assetUrl } from '../api/client'
import './MentionInput.css'

export default function MentionInput({ value, onChange, placeholder = '', className = '', rows = 2, maxLength, onEnter, autoFocus }) {
  const [mention, setMention] = useState(null)
  const [results, setResults] = useState([])
  const [active, setActive] = useState(0)
  const taRef = useRef(null)
  const caretRef = useRef(0)
  const mentionRef = useRef(null)
  mentionRef.current = mention

  const detect = (el) => {
    const caret = el.selectionStart
    caretRef.current = caret
    const before = el.value.slice(0, caret)
    const m = /@([\w\u0600-\u06FF\-\.]*)$/.exec(before)
    if (m) setMention({ start: m.index, end: caret, query: m[1] || '' })
    else setMention(null)
  }

  const handleChange = (e) => {
    onChange(e.target.value)
    detect(e.target)
  }

  useEffect(() => {
    if (!mention) { setResults([]); return }
    setActive(0)
    if (!mention.query.trim()) { setResults([]); return }
    const q = mention.query.trim()
    const t = setTimeout(async () => {
      try {
        const res = await get('/users/search', { q, pageSize: 6 })
        setResults(res.data || [])
      } catch { setResults([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [mention])

  const select = (u) => {
    const m = mentionRef.current
    if (!m) return
    const v = value
    const name = u.displayName || u.userName
    const insert = '@' + name + ' '
    const nv = v.slice(0, m.start) + insert + v.slice(m.end)
    onChange(nv)
    setMention(null)
    setResults([])
    requestAnimationFrame(() => {
      const el = taRef.current
      if (el) {
        el.focus()
        const pos = m.start + insert.length
        el.setSelectionRange(pos, pos)
      }
    })
  }

  const onKeyDown = (e) => {
    if (results.length && mention) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % results.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); return }
      if (e.key === 'Enter') { e.preventDefault(); select(results[active]); return }
      if (e.key === 'Escape') { setMention(null); setResults([]); return }
    }
    if (e.key === 'Enter' && !e.shiftKey && onEnter) { e.preventDefault(); onEnter() }
  }

  return (
    <div className="mention-wrap">
      <textarea
        ref={taRef}
        className={className}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => detect(e.target)}
        onClick={(e) => detect(e.target)}
        onBlur={() => setTimeout(() => { setMention(null); setResults([]) }, 150)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        autoFocus={autoFocus}
      />
      {results.length > 0 && (
        <div className="mention-drop">
          {results.map((u, i) => (
            <button
              key={u.id}
              className={`mention-opt ${i === active ? 'on' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); select(u) }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="mention-opt-ava">
                {u.profilePictureUrl ? <img src={assetUrl(u.profilePictureUrl)} alt="" /> : <span>{(u.displayName || u.userName || '?')[0]}</span>}
              </span>
              <span className="mention-opt-name">{u.displayName || u.userName}</span>
              {u.userName && u.userName !== u.displayName && <span className="mention-opt-username">@{u.userName}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
