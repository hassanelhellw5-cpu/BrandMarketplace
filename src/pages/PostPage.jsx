import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, MessageCircle, Share2, Eye, Link2 } from 'lucide-react'
import { get, post as apiPost, assetUrl, errMsg } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState } from '../components/ui'
import CommentsModal from '../components/CommentsModal'
import './Feed.css'

const parseJson = (str, fallback = []) => {
  if (!str) return fallback
  try { const v = JSON.parse(str); return Array.isArray(v) ? v : fallback } catch { return fallback }
}

const timeAgo = (iso) => {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(iso).toLocaleDateString()
}

export default function PostPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [post, setPost] = useState(null)
  const [original, setOriginal] = useState(null)
  const [authors, setAuthors] = useState({})
  const [commentsOpen, setCommentsOpen] = useState(false)

  const fetchAuthor = useCallback(async (uid) => {
    if (!uid || authors[uid]) return
    try {
      const u = await get(`/users/${uid}`)
      setAuthors((prev) => ({ ...prev, [uid]: u }))
    } catch { /* fallback below */ }
  }, [authors])

  useEffect(() => {
    let alive = true
    setLoading(true)
    get(`/posts/${id}`)
      .then((res) => {
        if (!alive) return
        setPost(res.post)
        setOriginal(res.originalPost || null)
        fetchAuthor(res.post?.userId)
        if (res.originalPost?.userId) fetchAuthor(res.originalPost.userId)
      })
      .catch(() => { if (alive) setPost(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id, fetchAuthor])

  const toggleLike = async () => {
    try {
      const res = await apiPost(`/posts/${post.id}/like`)
      setPost((p) => ({ ...p, likedByMe: res.liked, likesCount: res.likesCount }))
    } catch (err) { toast.error(errMsg(err)) }
  }

  const bumpComments = (n) => {
    setPost((p) => ({ ...p, commentsCount: n }))
  }

  const copyLink = () => {
    const url = `${window.location.origin}/post/${post.id}`
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => toast.success('Post link copied')).catch(() => toast.info(url))
    } else toast.info(url)
  }

  const authorName = (uid) => authors[uid]?.displayName || authors[uid]?.userName || (uid ? uid.slice(0, 8) : 'User')
  const authorPic = (uid) => authors[uid]?.profilePictureUrl

  if (loading) return <PageLoader text="Loading post…" />
  if (!post) return <EmptyState title="Post not found" message="This post doesn't exist or was deleted." action={<Link className="btn btn-primary" to="/feed">Back to feed</Link>} />

  const media = parseJson(post.mediaUrls)
  const tags = parseJson(post.tags)
  const oMedia = original ? parseJson(original.mediaUrls) : []
  const isMine = post.userId === user?.id

  return (
    <div className="container feed-wrap">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(-1)}>
        <ArrowLeft size={15} /> Back
      </button>

      <div className="card feed-post">
        <div className="feed-post-head">
          <Link to={isMine ? '/my-profile' : `/u/${post.userId}`} className="feed-avatar">
            {authorPic(post.userId) ? <img src={assetUrl(authorPic(post.userId))} alt="" /> : <span>{authorName(post.userId)[0]}</span>}
          </Link>
          <div className="feed-post-who">
            <Link to={isMine ? '/my-profile' : `/u/${post.userId}`} className="feed-name">{authorName(post.userId)}</Link>
            <span className="feed-time">{timeAgo(post.createdAt)}{post.isEdited ? ' · edited' : ''}{post.originalPostId ? ' · shared' : ''}</span>
          </div>
          <button className="feed-trash" onClick={copyLink} title="Copy post link"><Link2 size={15} /></button>
        </div>

        {post.content && <p className="feed-content">{post.content}</p>}

        {original && (
          <div className="feed-share">
            <div className="feed-share-head">
              Originally posted by <Link to={`/u/${original.userId}`} className="feed-name">{authorName(original.userId)}</Link>
            </div>
            {original.content && <p className="feed-content">{original.content}</p>}
            {oMedia.length > 0 && (
              <div className={`feed-media ${oMedia.length === 1 ? 'one' : ''}`}>
                {oMedia.map((url, i) => (
                  <img key={i} src={assetUrl(url)} alt="" onClick={() => window.open(assetUrl(url), '_blank')} />
                ))}
              </div>
            )}
            <div className="feed-share-stats">
              <span><Heart size={12} /> {original.likesCount || 0}</span>
              <span><MessageCircle size={12} /> {original.commentsCount || 0}</span>
              <span><Share2 size={12} /> {original.sharesCount || 0}</span>
            </div>
          </div>
        )}

        {media.length > 0 && (
          <div className={`feed-media ${media.length === 1 ? 'one' : ''}`}>
            {media.map((url, i) => (
              <img key={i} src={assetUrl(url)} alt="" onClick={() => window.open(assetUrl(url), '_blank')} />
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className="feed-tags">{tags.map((t, i) => <span key={i}>#{t}</span>)}</div>
        )}

        <div className="feed-stats">
          <span><Heart size={13} /> {post.likesCount || 0}</span>
          <span><MessageCircle size={13} /> {post.commentsCount || 0}</span>
          <span><Share2 size={13} /> {post.sharesCount || 0}</span>
          <span><Eye size={13} /> {post.viewsCount || 0}</span>
          {post.location && <span className="feed-loc">{post.location}</span>}
        </div>

        <div className="feed-post-actions">
          <button className={`feed-act ${post.likedByMe ? 'liked' : ''}`} onClick={toggleLike}>
            <Heart size={16} fill={post.likedByMe ? 'currentColor' : 'none'} /> Like
          </button>
          <button className="feed-act" onClick={() => setCommentsOpen(true)}>
            <MessageCircle size={16} /> Comment
          </button>
          <button className="feed-act" onClick={copyLink}>
            <Link2 size={16} /> Copy link
          </button>
        </div>
      </div>

      <CommentsModal
        post={post}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCountChange={bumpComments}
      />
    </div>
  )
}
