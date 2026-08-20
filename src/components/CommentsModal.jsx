import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { X, Send, CornerUpLeft, MessageSquare } from 'lucide-react'
import { get, post as apiPost, errMsg, assetUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import MentionInput from './MentionInput'
import './CommentsModal.css'

const timeAgo = (iso) => {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(iso).toLocaleDateString()
}

const renderText = (t) =>
  (t || '').split(/(@[\w\u0600-\u06FF\-\.]+)/g).map((p, i) =>
    p.startsWith('@') ? <span key={i} className="mention-hl">{p}</span> : p
  )

export default function CommentsModal({ post, open, onClose, onCountChange }) {
  const { user } = useAuth()
  const toast = useToast()
  const [comments, setComments] = useState([])
  const [authors, setAuthors] = useState({})
  const [replyTo, setReplyTo] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchAuthor = useCallback(async (id) => {
    if (!id || authors[id]) return
    try {
      const u = await get(`/users/${id}`)
      setAuthors((p) => ({ ...p, [id]: u }))
    } catch { /* fallback below */ }
  }, [authors])

  useEffect(() => {
    if (!open || !post) return
    setLoading(true)
    setReplyTo(null)
    setText('')
    setComments([])
    ;(async () => {
      try {
        const res = await get(`/posts/${post.id}`)
        const cs = res.comments || []
        setComments(cs)
        cs.forEach((c) => fetchAuthor(c.userId))
        if (post.userId) fetchAuthor(post.userId)
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    })()
  }, [open, post, fetchAuthor])

  const nameOf = (id) => authors[id]?.displayName || authors[id]?.userName || (id ? id.slice(0, 8) : 'User')
  const picOf = (id) => authors[id]?.profilePictureUrl

  const submit = async () => {
    const content = text.trim()
    if (!content) return
    setSending(true)
    try {
      const c = await apiPost(`/posts/${post.id}/comment`, { content, parentCommentId: replyTo?.id ?? null })
      setComments((prev) => [...prev, c])
      fetchAuthor(c.userId)
      setText('')
      setReplyTo(null)
      onCountChange?.((n) => (n || 0) + 1)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setSending(false)
    }
  }

  const childrenOf = (pid) => comments.filter((c) => c.parentCommentId === pid)
  const roots = comments.filter((c) => !c.parentCommentId)

  const CommentItem = ({ c, depth }) => {
    const parent = c.parentCommentId ? comments.find((x) => x.id === c.parentCommentId) : null
    return (
      <div className={`cmt ${depth > 0 ? 'cmt-reply' : ''}`}>
        <div className="cmt-row">
          <Link to={c.userId === user?.id ? '/my-profile' : `/u/${c.userId}`} className="cmt-ava">
            {picOf(c.userId) ? <img src={assetUrl(picOf(c.userId))} alt="" /> : <span>{nameOf(c.userId)[0]}</span>}
          </Link>
          <div className="cmt-bubble">
            <div className="cmt-head">
              <Link to={c.userId === user?.id ? '/my-profile' : `/u/${c.userId}`} className="cmt-name">
                {c.userId === user?.id ? 'You' : nameOf(c.userId)}
              </Link>
              {parent && (
                <span className="cmt-replyto">→ {parent.userId === user?.id ? 'You' : nameOf(parent.userId)}</span>
              )}
            </div>
            <div className="cmt-text">{renderText(c.content)}</div>
            <div className="cmt-actions">
              <span className="cmt-time">{timeAgo(c.createdAt)}</span>
              <button className="cmt-reply-btn" onClick={() => setReplyTo(c)}><CornerUpLeft size={12} /> Reply</button>
            </div>
          </div>
        </div>
        {depth === 0 && childrenOf(c.id).length > 0 && (
          <div className="cmt-thread">
            {childrenOf(c.id).map((r) => <CommentItem key={r.id} c={r} depth={depth + 1} />)}
          </div>
        )}
      </div>
    )
  }

  if (!open || !post) return null

  return (
    <div className="cmt-overlay" onClick={onClose}>
      <div className="cmt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmt-modal-head">
          <div>
            <h3>Comments</h3>
            <span className="cmt-modal-sub">{comments.length} comment{comments.length === 1 ? '' : 's'}</span>
          </div>
          <button className="cmt-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="cmt-post-preview">
          <Link to={post.userId === user?.id ? '/my-profile' : `/u/${post.userId}`} className="cmt-prev-ava">
            {picOf(post.userId) ? <img src={assetUrl(picOf(post.userId))} alt="" /> : <span>{(nameOf(post.userId) || '?')[0]}</span>}
          </Link>
          <div>
            <div className="cmt-prev-name">{post.userId === user?.id ? 'You' : nameOf(post.userId)}</div>
            {post.content && <div className="cmt-prev-text">{renderText(post.content)}</div>}
          </div>
        </div>

        <div className="cmt-list">
          {loading ? (
            <div className="cmt-empty">Loading comments…</div>
          ) : roots.length === 0 ? (
            <div className="cmt-empty">
              <MessageSquare size={28} />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            roots.map((c) => <CommentItem key={c.id} c={c} depth={0} />)
          )}
        </div>

        <div className="cmt-input-area">
          {replyTo && (
            <div className="cmt-replying">
              Replying to <b>{replyTo.userId === user?.id ? 'You' : nameOf(replyTo.userId)}</b>
              <button onClick={() => setReplyTo(null)}><X size={13} /></button>
            </div>
          )}
          <div className="cmt-input-row">
            <MentionInput
              value={text}
              onChange={setText}
              placeholder={replyTo ? `Write a reply to ${nameOf(replyTo.userId)}…` : 'Write a comment…'}
              className="cmt-input"
              rows={1}
              onEnter={submit}
            />
            <button className="cmt-send" onClick={submit} disabled={!text.trim() || sending}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
