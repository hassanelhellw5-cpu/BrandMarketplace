import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ImagePlus, Heart, MessageCircle, X, Trash2, Eye, Share2, Link2, BookmarkPlus } from 'lucide-react'
import { get, post, put, del, upload, errMsg, assetUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { PageLoader, EmptyState, Pagination } from '../components/ui'
import Modal from '../components/Modal'
import StoryViewer from '../components/StoryViewer'
import CommentsModal from '../components/CommentsModal'
import MentionInput from '../components/MentionInput'
import { reportStoryView, reportCreatePost, reportLikePost, reportSharePost, reportCreateStory } from '../hooks/usePageTracking'
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

const FEED_PAGE_SIZE = 10

export default function Feed() {
  const { user } = useAuth()
  const toast = useToast()

  const [stories, setStories] = useState([])
  const [posts, setPosts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [authors, setAuthors] = useState({})
  const [originals, setOriginals] = useState({})
  const [showViewer, setShowViewer] = useState(false)
  const [viewerStart, setViewerStart] = useState(0)
  const [storyModal, setStoryModal] = useState(false)
  const [storyText, setStoryText] = useState('')
  const [storyBg, setStoryBg] = useState('#8B5CF6')
  const [storyFile, setStoryFile] = useState(null)
  const [storyUploading, setStoryUploading] = useState(false)

  const [draft, setDraft] = useState('')
  const [postFiles, setPostFiles] = useState([])
  const [posting, setPosting] = useState(false)
  const [postingMedia, setPostingMedia] = useState(false)
  const [engScore, setEngScore] = useState(null)
  const [commentsPost, setCommentsPost] = useState(null)

  const [shareModal, setShareModal] = useState(null)
  const [shareText, setShareText] = useState('')
  const [sharing, setSharing] = useState(false)

  const [hlPick, setHlPick] = useState(null)
  const [myHighlights, setMyHighlights] = useState([])
  const [hlTarget, setHlTarget] = useState('new')
  const [hlTitle, setHlTitle] = useState('')
  const [hlColor, setHlColor] = useState('#8B5CF6')
  const [hlSaving, setHlSaving] = useState(false)

  const loadPosts = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const res = await get('/posts/feed', { page: p, pageSize: FEED_PAGE_SIZE })
      setPosts(res.data || [])
      setTotal(res.total || 0)
      setOriginals(res.originals || {})
    } catch { /* feed may be empty */ }
    setLoading(false)
  }, [page])

  const loadStories = useCallback(async () => {
    try {
      const res = await get('/stories')
      setStories(Array.isArray(res) ? res : res.data || [])
    } catch { setStories([]) }
  }, [])

  const fetchAuthor = useCallback(async (id) => {
    if (!id || authors[id]) return
    try {
      const u = await get(`/users/${id}`)
      setAuthors((prev) => ({ ...prev, [id]: u }))
    } catch { /* fallback below */ }
  }, [authors])

  useEffect(() => {
    loadPosts(page)
    loadStories()
  }, [page, loadPosts, loadStories])

  useEffect(() => {
    const ids = new Set()
    stories.forEach((s) => ids.add(s.userId))
    posts.forEach((p) => {
      ids.add(p.userId)
      if (p.originalPostId) {
        const o = originals[p.originalPostId]
        if (o?.userId) ids.add(o.userId)
      }
    })
    ids.forEach(fetchAuthor)
  }, [stories, posts, originals, fetchAuthor])

  // ---- Story helpers ----
  const uploadImage = async (file, folder) => {
    const fd = new FormData()
    fd.append('files', file)
    const res = await upload(`/uploads?folder=${folder}`, fd)
    const f = res.files && res.files[0]
    if (!f) throw new Error('Upload failed')
    return f.url || `/${f.path}`
  }

  const createStory = async () => {
    if (!storyText.trim() && !storyFile) return
    setStoryUploading(true)
    try {
      let mediaUrl = ''
      let mediaType = 'Text'
      if (storyFile) {
        mediaUrl = await uploadImage(storyFile, 'stories')
        mediaType = 'Image'
      }
      const body = { mediaUrl, mediaType, text: storyText.trim(), backgroundColor: storyBg, tags: null }
      await post('/stories', body)
      reportCreateStory(user?.displayName)
      toast.success('Story posted')
      setStoryModal(false)
      setStoryText('')
      setStoryFile(null)
      loadStories()
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setStoryUploading(false)
    }
  }

  const deleteStory = async (id) => {
    try {
      await del(`/stories/${id}`)
      toast.success('Story deleted')
      setShowViewer(false)
      loadStories()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const openStory = async (s, startIndex = 0) => {
    setViewerStart(startIndex)
    setShowViewer(true)
    try { await post(`/stories/${s.id}/view`) } catch { /* ignore */ }
    const ownerName = authorName(s.userId)
    if (ownerName && ownerName !== 'Unknown') reportStoryView(s.id, ownerName)
  }

  // ---- Add current story to a highlight ----
  const openHlPick = async (story) => {
    setHlPick(story)
    setHlTarget('new')
    setHlTitle('')
    setHlColor('#8B5CF6')
    setHlSaving(false)
    try {
      const res = await get(`/profiles/${user?.id}/highlights`)
      setMyHighlights(Array.isArray(res?.data) ? res.data.filter(Boolean) : [])
    } catch { setMyHighlights([]) }
  }

  const saveToHighlight = async () => {
    if (!hlPick) return
    setHlSaving(true)
    try {
      if (hlTarget === 'new') {
        if (!hlTitle.trim()) { toast.error('Give the highlight a title'); setHlSaving(false); return }
        await post('/profiles/highlights', { title: hlTitle.trim(), coverColor: hlColor, storyIds: [hlPick.id] })
      } else {
        const h = myHighlights.find((x) => String(x?.id) === String(hlTarget))
        if (!h) { toast.error('Highlight not found — refresh and try again'); setHlSaving(false); return }
        const ids = parseJson(h.stories).map(Number)
        if (!ids.includes(Number(hlPick.id))) ids.push(Number(hlPick.id))
        await put(`/profiles/highlights/${hlTarget}`, { title: h.title || 'Untitled highlight', coverColor: h.coverColor || '#8B5CF6', storyIds: ids })
      }
      toast.success('Added to highlight')
      setHlPick(null)
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setHlSaving(false)
    }
  }

  const groupedStories = []
  const seen = new Set()
  stories.forEach((s) => {
    if (!seen.has(s.userId)) {
      seen.add(s.userId)
      groupedStories.push({ userId: s.userId, items: stories.filter((x) => x.userId === s.userId) })
    }
  })

  const allStories = groupedStories.flatMap((g) => g.items)

  // ---- Post helpers ----
  const attachPostFiles = (e) => {
    setPostFiles(Array.from(e.target.files || []))
    setEngScore(null)
  }

  const createPost = async () => {
    if (!draft.trim() && postFiles.length === 0) return
    setPosting(true)
    try {
      const media = []
      if (postFiles.length > 0) {
        setPostingMedia(true)
        for (const f of postFiles) {
          try { media.push(await uploadImage(f, 'posts')) } catch { /* skip failed file */ }
        }
        setPostingMedia(false)
      }
      const hashtags = Array.from(new Set((draft.match(/#[\w\u0600-\u06FF]+/g) || []).map((t) => t.replace('#', ''))))
      const body = {
        content: draft.trim(),
        mediaUrls: JSON.stringify(media),
        mediaType: media.length > 0 ? 'image' : 'text',
        tags: JSON.stringify(hashtags),
        isPublic: true,
      }
      const res = await post('/posts', body)
      reportCreatePost(res?.id)
      setEngScore(res.engagementScore ?? null)
      setDraft('')
      setPostFiles([])
      toast.success(res.engagementScore != null ? `Posted · AI predicted engagement ${res.engagementScore}/100` : 'Posted')
      setPage(1)
      loadPosts(1)
    } catch (err) {
      toast.error(errMsg(err))
    } finally {
      setPosting(false)
      setPostingMedia(false)
    }
  }

  const toggleLike = async (p) => {
    try {
      const res = await post(`/posts/${p.id}/like`)
      reportLikePost(p.id, authorName(p.userId))
      setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, likedByMe: res.liked, likesCount: res.likesCount } : x)))
    } catch (err) { toast.error(errMsg(err)) }
  }

  const toggleComments = (p) => {
    setCommentsPost(p)
  }

  const bumpComments = (id) => (n) => {
    setPosts((prev) => prev.map((x) => (x.id === id ? { ...x, commentsCount: n } : x)))
  }

  const deletePost = async (p) => {
    try {
      await del(`/posts/${p.id}`)
      toast.success('Post deleted')
      loadPosts(page)
    } catch (err) { toast.error(errMsg(err)) }
  }

  const openShare = (p) => {
    setShareModal(p)
    setShareText('')
  }

  const submitShare = async () => {
    if (!shareModal) return
    const p = shareModal
    setSharing(true)
    try {
      const res = await post(`/posts/${p.id}/share`, { comment: shareText.trim() })
      reportSharePost(p.id, authorName(p.userId))
      toast.success('Shared to your feed')
      setShareModal(null)
      setShareText('')
      setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, sharesCount: res.sharesCount ?? x.sharesCount } : x)))
      setPage(1)
      loadPosts(1)
    } catch (err) { toast.error(errMsg(err)) } finally { setSharing(false) }
  }

  const copyLink = (p) => {
    const url = `${window.location.origin}/post/${p.id}`
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => toast.success('Post link copied'))
        .catch(() => toast.info(url))
    } else {
      toast.info(url)
    }
  }

  const authorName = (id) => authors[id]?.displayName || authors[id]?.userName || (id ? id.slice(0, 8) : 'User')
  const authorPic = (id) => authors[id]?.profilePictureUrl

  return (
    <div className="container feed-wrap">
      {/* Stories rail */}
      <div className="feed-stories">
        <button className="story-add" onClick={() => setStoryModal(true)}>
          <span className="story-ring story-ring-add"><Plus size={22} /></span>
          <span className="story-name">Add story</span>
        </button>
        {groupedStories.map((g) => {
          const a = authors[g.userId]
          return (
            <button key={g.userId} className="story-add" onClick={() => openStory(g.items[0], allStories.findIndex((x) => x.id === g.items[0].id))}>
              <span className="story-ring" style={{ backgroundImage: a?.profilePictureUrl ? `url(${assetUrl(a.profilePictureUrl)})` : undefined }}>
                {!a?.profilePictureUrl && (a?.displayName?.[0] || '?')}
              </span>
              <span className="story-name">{a?.displayName?.split(' ')[0] || 'User'}</span>
            </button>
          )
        })}
      </div>

      {/* Composer */}
      <div className="card feed-composer">
        <div className="feed-composer-top">
          <div className="feed-composer-avatar">
            {user?.profilePictureUrl ? <img src={assetUrl(user.profilePictureUrl)} alt="" /> : (user?.displayName?.[0] || '?')}
          </div>
          <MentionInput
            value={draft}
            onChange={setDraft}
            placeholder="Share something with your followers…"
            className="feed-input"
            rows={2}
            maxLength={2000}
          />
        </div>
        {postFiles.length > 0 && (
          <div className="feed-thumbs">
            {postFiles.map((f, i) => (
              <div key={i} className="feed-thumb">
                <img src={URL.createObjectURL(f)} alt="" />
                <button className="feed-thumb-x" onClick={() => setPostFiles(postFiles.filter((_, j) => j !== i))}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        {engScore != null && (
          <div className="feed-eng"><span>AI predicted engagement</span><strong>{engScore}/100</strong></div>
        )}
        <div className="feed-composer-bottom">
          <div className="feed-composer-actions">
            <label className="feed-attach">
              <ImagePlus size={16} /> Photo
              <input type="file" accept="image/*" multiple hidden onChange={attachPostFiles} />
            </label>
          </div>
          <button className="btn btn-primary btn-sm" onClick={createPost} disabled={(!draft.trim() && postFiles.length === 0) || posting || postingMedia}>
            {posting || postingMedia ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>

      {/* Feed */}
      {loading ? <PageLoader text="Loading feed…" /> : posts.length === 0 ? (
        <EmptyState
          title="Your feed is empty"
          message="Follow more people or share your first post to get started."
          action={<Link className="btn btn-primary" to="/explore">Explore people</Link>}
        />
      ) : (
        <>
          <div className="feed-list">
            {posts.map((p) => {
              const media = parseJson(p.mediaUrls)
              const tags = parseJson(p.tags)
              const isMine = p.userId === user?.id
              const original = p.originalPostId ? originals[p.originalPostId] : null
              const oMedia = original ? parseJson(original.mediaUrls) : []
              return (
                <div key={p.id} className="card feed-post">
                  <div className="feed-post-head">
                    <Link to={isMine ? '/my-profile' : `/u/${p.userId}`} className="feed-avatar">
                      {authorPic(p.userId) ? <img src={assetUrl(authorPic(p.userId))} alt="" /> : <span>{authorName(p.userId)[0]}</span>}
                    </Link>
                    <div className="feed-post-who">
                      <Link to={isMine ? '/my-profile' : `/u/${p.userId}`} className="feed-name">{authorName(p.userId)}</Link>
                      <span className="feed-time">
                        <Link to={`/post/${p.id}`} className="feed-time-link">{timeAgo(p.createdAt)}{p.isEdited ? ' · edited' : ''}</Link>
                        {p.originalPostId ? <span> · shared</span> : null}
                      </span>
                    </div>
                    <button className="feed-trash" onClick={() => copyLink(p)} title="Copy post link"><Link2 size={15} /></button>
                    {isMine && (
                      <button className="feed-trash" onClick={() => deletePost(p)} title="Delete post"><Trash2 size={15} /></button>
                    )}
                  </div>

                  {p.content && <p className="feed-content">{p.content}</p>}

                  {/* Embedded original post (Facebook-style share) */}
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
                        <Link to={`/post/${original.id}`} className="feed-share-link">View post</Link>
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
                    <span><Heart size={13} /> {p.likesCount || 0}</span>
                    <span><MessageCircle size={13} /> {p.commentsCount || 0}</span>
                    <span><Share2 size={13} /> {p.sharesCount || 0}</span>
                    <span><Eye size={13} /> {p.viewsCount || 0}</span>
                    {p.location && <span className="feed-loc">{p.location}</span>}
                  </div>

                  <div className="feed-post-actions">
                    <button className={`feed-act ${p.likedByMe ? 'liked' : ''}`} onClick={() => toggleLike(p)}>
                      <Heart size={16} fill={p.likedByMe ? 'currentColor' : 'none'} /> Like
                    </button>
                    <button className="feed-act" onClick={() => toggleComments(p)}>
                      <MessageCircle size={16} /> Comment
                    </button>
                    <button className="feed-act" onClick={() => openShare(p)}>
                      <Share2 size={16} /> Share
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <Pagination page={page} pageSize={FEED_PAGE_SIZE} total={total} onPage={setPage} />
        </>
      )}

      {/* Create story modal */}
      <Modal open={storyModal} onClose={() => setStoryModal(false)} title="Add a story">
        <div className="story-bg-picker">
          {['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#0EA5E9', '#1E1E2F'].map((c) => (
            <button key={c} className={storyBg === c ? 'on' : ''} style={{ background: c }} onClick={() => setStoryBg(c)} />
          ))}
        </div>
        {storyFile ? (
          <div className="story-preview">
            <img src={URL.createObjectURL(storyFile)} alt="" />
            <button className="story-preview-x" onClick={() => setStoryFile(null)}><X size={16} /></button>
          </div>
        ) : (
          <label className="btn btn-outline btn-sm story-pick">
            <ImagePlus size={16} /> Add photo
            <input type="file" accept="image/*" hidden onChange={(e) => setStoryFile(e.target.files?.[0] || null)} />
          </label>
        )}
        <textarea
          className="field story-text"
          style={{ background: storyBg, color: '#fff', minHeight: 110, fontWeight: 700, fontSize: 18, borderRadius: 14, padding: 16, width: '100%', border: 'none', outline: 'none', resize: 'vertical' }}
          placeholder="Type something…"
          value={storyText}
          onChange={(e) => setStoryText(e.target.value)}
          maxLength={240}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setStoryModal(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={createStory} disabled={(!storyText.trim() && !storyFile) || storyUploading}>
            {storyUploading ? 'Posting…' : 'Share story'}
          </button>
        </div>
      </Modal>

      {/* Share post modal */}
      <Modal open={!!shareModal} onClose={() => setShareModal(null)} title="Share post">
        {shareModal && (
          <div>
            <textarea
              className="feed-input"
              rows={3}
              placeholder="Say something about this post…"
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              maxLength={500}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShareModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={submitShare} disabled={sharing}>{sharing ? 'Sharing…' : 'Share now'}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add to highlight modal */}
      <Modal open={!!hlPick} onClose={() => setHlPick(null)} title="Add to highlight">
        {hlPick && (
          <div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginBottom: 14 }}>
              Save this story into a highlight that visitors can see on your profile.
            </p>
            <div className="field">
              <label>Highlight</label>
              <select value={hlTarget} onChange={(e) => setHlTarget(e.target.value)}>
                <option value="new">+ New highlight</option>
                {myHighlights.map((h) => <option key={h.id} value={h.id}>{h.title || 'Highlight'}</option>)}
              </select>
            </div>
            {hlTarget === 'new' && (
              <>
                <div className="field">
                  <label>Title *</label>
                  <input maxLength={40} value={hlTitle} onChange={(e) => setHlTitle(e.target.value)} placeholder="e.g. Behind the scenes" />
                </div>
                <div className="field">
                  <label>Color</label>
                  <div className="story-bg-picker">
                    {['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#8f6b1e'].map((c) => (
                      <button type="button" key={c} className={hlColor === c ? 'on' : ''} style={{ background: c }} onClick={() => setHlColor(c)} />
                    ))}
                  </div>
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setHlPick(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveToHighlight} disabled={hlSaving || (hlTarget === 'new' && !hlTitle.trim())}>
                {hlSaving ? 'Saving…' : 'Add to highlight'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Story viewer */}
      <StoryViewer
        open={showViewer}
        groups={groupedStories}
        startIndex={viewerStart}
        onClose={() => setShowViewer(false)}
        paused={!!hlPick}
        getAuthor={(userId) => authors[userId]}
        renderAuthor={(item) => (
          <div className="story-viewer-author">
            <span className="story-viewer-avatar">
              {authorPic(item.userId) ? <img src={assetUrl(authorPic(item.userId))} alt="" /> : <span>{authorName(item.userId)[0]}</span>}
            </span>
            <div>
              <strong>{authorName(item.userId)}</strong>
              <span>{item.viewsCount || 0} views · {timeAgo(item.createdAt)}</span>
            </div>
          </div>
        )}
        renderActions={(item) => (item.userId === user?.id ? (
          <>
            <button className="story-viewer-hl" onClick={(e) => { e.stopPropagation(); openHlPick(item) }}><BookmarkPlus size={16} /> Add to highlight</button>
            <button className="story-viewer-del" onClick={(e) => { e.stopPropagation(); deleteStory(item.id) }}><Trash2 size={16} /> Delete</button>
          </>
        ) : null)}
      />

      {/* Comments modal (Facebook-style) */}
      <CommentsModal
        post={commentsPost}
        open={!!commentsPost}
        onClose={() => setCommentsPost(null)}
        onCountChange={bumpComments(commentsPost?.id)}
      />
    </div>
  )
}
