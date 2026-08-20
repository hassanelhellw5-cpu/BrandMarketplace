import { useEffect, useRef, useState } from 'react'
import { Video, ExternalLink } from 'lucide-react'
import { Spinner } from './ui'

const JITSI_HOST = 'meet.jit.si'
const JITSI_DOMAIN = `https://${JITSI_HOST}`
const SCRIPT_SRC = `${JITSI_DOMAIN}/external_api.js`

export default function MeetingRoom({ room, displayName = 'Guest' }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    const start = () => {
      if (cancelled || !window.JitsiMeetExternalAPI) return
      try {
        const api = new window.JitsiMeetExternalAPI(JITSI_HOST, {
          roomName: room,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          userInfo: { displayName },
          configOverwrite: {
            disableDeepLinking: true,
            enableWelcomePage: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          },
        })
        apiRef.current = api
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    const loadScript = () => {
      if (window.JitsiMeetExternalAPI) { start(); return }
      const s = document.createElement('script')
      s.src = SCRIPT_SRC
      s.async = true
      s.onload = start
      s.onerror = () => { if (!cancelled) setStatus('error') }
      document.head.appendChild(s)
    }

    loadScript()

    return () => {
      cancelled = true
      if (apiRef.current) {
        try { apiRef.current.dispose() } catch { /* ignore */ }
      }
      apiRef.current = null
    }
  }, [room, displayName])

  const roomUrl = `${JITSI_DOMAIN}/${room}`

  if (status === 'error') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 44 }}>
        <Video size={30} color="var(--primary)" style={{ margin: '0 auto 10px' }} />
        <h3>Meeting could not start</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>We couldn't load the meeting provider inside the page. Open the meeting directly in a new tab instead — camera and mic work there.</p>
        <a className="btn btn-primary" href={roomUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open meeting in new tab</a>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480 }}>
      {status === 'loading' && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2, background: 'var(--bg)' }}>
          <div style={{ textAlign: 'center' }}>
            <Spinner size={34} />
            <p style={{ marginTop: 12, color: 'var(--text-dim)' }}>Starting secure video meeting…</p>
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
