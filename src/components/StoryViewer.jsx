import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { assetUrl } from '../api/client'
import './StoryViewer.css'

const DEFAULT_DURATION = 30000

export default function StoryViewer({ open, groups = [], startIndex = 0, onClose, paused = false, renderAuthor, renderActions, getAuthor }) {
  const [groupIdx, setGroupIdx] = useState(0)
  const [itemIdx, setItemIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const touchStart = useRef(null)

  const totalGroups = groups.length
  const currentGroup = groups[groupIdx]
  const currentItems = currentGroup?.items || []
  const currentItem = currentItems[itemIdx]
  const isVideo = String(currentItem?.mediaType || '').toLowerCase() === 'video'

  useEffect(() => {
    if (open) {
      let flatIdx = 0
      for (let g = 0; g < groups.length; g++) {
        for (let i = 0; i < groups[g].items.length; i++) {
          if (flatIdx === startIndex) {
            setGroupIdx(g)
            setItemIdx(i)
            setProgress(0)
            return
          }
          flatIdx++
        }
      }
      setGroupIdx(0)
      setItemIdx(0)
      setProgress(0)
    }
  }, [open, startIndex, groups])

  const nextItem = useCallback(() => {
    if (itemIdx < currentItems.length - 1) {
      setItemIdx(itemIdx + 1)
    } else if (groupIdx < totalGroups - 1) {
      setGroupIdx(groupIdx + 1)
      setItemIdx(0)
    } else {
      onClose?.()
    }
  }, [itemIdx, currentItems.length, groupIdx, totalGroups, onClose])

  const prevItem = useCallback(() => {
    if (itemIdx > 0) {
      setItemIdx(itemIdx - 1)
    } else if (groupIdx > 0) {
      setGroupIdx(groupIdx - 1)
      const prevGroup = groups[groupIdx - 1]
      setItemIdx(prevGroup ? prevGroup.items.length - 1 : 0)
    }
  }, [itemIdx, groupIdx, groups])

  const canPrev = groupIdx > 0 || itemIdx > 0
  const canNext = groupIdx < totalGroups - 1 || itemIdx < currentItems.length - 1

  useEffect(() => {
    if (!open || paused || !currentItem || isVideo) return
    setProgress(0)
    const start = Date.now()
    const t = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / DEFAULT_DURATION) * 100)
      setProgress(p)
      if (p >= 100) { clearInterval(t); nextItem() }
    }, 100)
    return () => clearInterval(t)
  }, [open, paused, groupIdx, itemIdx, isVideo, nextItem])

  useEffect(() => {
    if (!open) return
    const v = document.querySelector('.sv-fullscreen video')
    if (v) { if (paused) v.pause(); else v.play().catch(() => {}) }
  }, [open, paused, groupIdx, itemIdx])

  useEffect(() => {
    if (!open) return
    const h = (e) => {
      if (e.key === 'Escape') onClose?.()
      else if (e.key === 'ArrowRight') nextItem()
      else if (e.key === 'ArrowLeft') prevItem()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, nextItem, prevItem, onClose])

  const onTouchStart = (e) => { touchStart.current = e.touches[0]?.clientX ?? null }
  const onTouchEnd = (e) => {
    if (touchStart.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current
    touchStart.current = null
    if (Math.abs(dx) > 50) { if (dx < 0) nextItem(); else prevItem() }
  }

  useEffect(() => { if (open && totalGroups === 0) onClose?.() }, [open, totalGroups, onClose])

  if (!open) return null

  if (!currentItem) {
    return (
      <div className="sv-fullscreen">
        <button className="sv-close" onClick={onClose}><X size={24} strokeWidth={2.5} /></button>
        <div className="sv-empty"><ImageOff size={40} /><p>No stories to display</p></div>
      </div>
    )
  }

  const onVideoTime = (e) => {
    const v = e.currentTarget
    if (v.duration) setProgress((v.currentTime / v.duration) * 100)
  }
  const onVideoEnd = () => nextItem()
  const author = getAuthor?.(currentGroup?.userId)

  return (
    <div className="sv-fullscreen" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Progress bars at very top */}
      <div className="sv-progress-row">
        {groups.map((g, gi) => (
          <div key={g.userId} className="sv-progress-group" onClick={() => { setGroupIdx(gi); setItemIdx(0); setProgress(0) }}>
            {g.items.map((_, si) => {
              let fill = 0
              if (gi < groupIdx) fill = 100
              else if (gi === groupIdx) {
                if (si < itemIdx) fill = 100
                else if (si === itemIdx) fill = progress
              }
              return (
                <div key={si} className="sv-prog-track">
                  <div className="sv-prog-fill" style={{ width: `${fill}%` }} />
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Close button - TOP LEFT, very prominent */}
      <button className="sv-close" onClick={onClose} title="Close (Esc)">
        <X size={24} strokeWidth={2.5} />
      </button>

      {/* User name + avatar row */}
      <div className="sv-author-row">
        <div className="sv-author-avatar">
          {author?.profilePictureUrl
            ? <img src={assetUrl(author.profilePictureUrl)} alt="" />
            : <span>{(author?.displayName || '?')[0]}</span>}
        </div>
        <span className="sv-author-name">{author?.displayName || 'User'}</span>
        {currentItem.createdAt && <span className="sv-author-time">{timeAgo(currentItem.createdAt)}</span>}
      </div>

      {/* Media - fills entire screen */}
      <div className="sv-media-container">
        {isVideo ? (
          <video className="sv-media" src={assetUrl(currentItem.mediaUrl)} autoPlay muted playsInline onTimeUpdate={onVideoTime} onEnded={onVideoEnd} onError={nextItem} />
        ) : currentItem.mediaUrl ? (
          <img className="sv-media" src={assetUrl(currentItem.mediaUrl)} alt="" draggable={false} />
        ) : null}
        {currentItem.text && (
          <div className="sv-text-overlay" style={{ background: currentItem.backgroundColor || 'rgba(0,0,0,0.5)' }}>
            {currentItem.text}
          </div>
        )}
      </div>

      {/* Render actions (delete, highlight, etc.) */}
      {renderActions?.(currentItem)}

      {/* Tap zones for navigation */}
      <div className="sv-tap-left" onClick={prevItem} />
      <div className="sv-tap-right" onClick={nextItem} />

      {/* Arrow buttons visible on hover/click */}
      {canPrev && (
        <button className="sv-arrow sv-arrow-left" onClick={prevItem} aria-label="Previous">
          <ChevronLeft size={28} />
        </button>
      )}
      {canNext && (
        <button className="sv-arrow sv-arrow-right" onClick={nextItem} aria-label="Next">
          <ChevronRight size={28} />
        </button>
      )}

      {/* Author badge at bottom center */}
      {renderAuthor?.(currentItem)}
    </div>
  )
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}
