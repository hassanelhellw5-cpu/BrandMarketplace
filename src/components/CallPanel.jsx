import { useState, useEffect, useRef, useCallback } from 'react'
import { PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react'
import Peer from 'peerjs'
import { useAuth } from '../context/AuthContext'
import './CallPanel.css'

export default function CallPanel({ call, onEnd, hubConnection }) {
  const { user } = useAuth()
  const [phase, setPhase] = useState(call.direction === 'outgoing' ? 'calling' : 'connecting')
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const peerRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const timerRef = useRef(null)
  const startedRef = useRef(false)
  const connectedRef = useRef(false)

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (peerRef.current) {
      try { peerRef.current.destroy() } catch {}
      peerRef.current = null
    }
    remoteStreamRef.current = null
  }, [])

  const hangUp = useCallback(() => {
    if (hubConnection && call.peerUserId) {
      hubConnection.invoke('CallEnd', call.peerUserId).catch(() => {})
    }
    cleanup()
    onEnd()
  }, [hubConnection, call.peerUserId, cleanup, onEnd])

  const rejectIncoming = useCallback(() => {
    if (hubConnection && call.callerId) {
      hubConnection.invoke('CallReject', call.callerId).catch(() => {})
    }
    cleanup()
    onEnd()
  }, [hubConnection, call.callerId, cleanup, onEnd])

  const getMedia = useCallback(async (video) => {
    const constraints = { audio: true, video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false }
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
    return stream
  }, [])

  const attachRemoteStream = useCallback((remote) => {
    remoteStreamRef.current = remote
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote
  }, [])

  const onStreamReceived = useCallback((remote) => {
    attachRemoteStream(remote)
    if (connectedRef.current) return
    connectedRef.current = true
    setPhase('connected')
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
  }, [attachRemoteStream])

  const setupPeer = useCallback((stream) => {
    const peerId = user.id
    const peer = new Peer(peerId)
    peerRef.current = peer

    peer.on('open', () => {
      if (call.direction === 'outgoing') {
        hubConnection?.invoke('CallOffer', call.peerUserId, peer.id, call.isVideo, user.displayName || user.userName).catch(() => {})
      } else {
        hubConnection?.invoke('CallAnswer', call.callerId, peer.id).catch(() => {})
      }
    })

    peer.on('call', (conn) => {
      conn.answer(stream)
      conn.on('stream', onStreamReceived)
      conn.on('close', () => { if (!connectedRef.current) hangUp() })
      conn.on('error', () => { if (!connectedRef.current) hangUp() })
    })

    peer.on('error', (err) => {
      console.error('PeerJS error:', err)
      if (!connectedRef.current) hangUp()
    })
  }, [user?.id, user?.displayName, user?.userName, call.direction, call.peerUserId, call.callerId, call.isVideo, hubConnection, hangUp, onStreamReceived])

  // Single effect: get media then setup peer for both directions
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    let cancelled = false

    const start = async () => {
      try {
        const stream = await getMedia(call.isVideo)
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }

        setupPeer(stream)
      } catch (err) {
        console.error('Call setup failed:', err)
        if (call.direction === 'incoming') rejectIncoming()
        else hangUp()
      }
    }

    start()
    return () => { cancelled = true }
  }, [])

  // Listen for CallAnswer (outgoing flow: callee answered, now caller calls callee's peer)
  useEffect(() => {
    if (!hubConnection || call.direction !== 'outgoing') return

    const handleAnswer = (data) => {
      if (!peerRef.current || !localStreamRef.current) return
      try {
        const conn = peerRef.current.call(data.peerId, localStreamRef.current)
        if (conn) {
          conn.on('stream', onStreamReceived)
          conn.on('close', () => { if (!connectedRef.current) hangUp() })
          conn.on('error', () => { if (!connectedRef.current) hangUp() })
        }
      } catch (err) {
        console.error('Failed to call peer:', err)
        hangUp()
      }
    }

    hubConnection.on('CallAnswer', handleAnswer)
    return () => { hubConnection.off('CallAnswer', handleAnswer) }
  }, [hubConnection, call.direction, hangUp, onStreamReceived])

  // Listen for CallRejected / CallEnded
  useEffect(() => {
    if (!hubConnection) return
    const handleRejected = () => { cleanup(); onEnd() }
    const handleEnded = () => { cleanup(); onEnd() }
    hubConnection.on('CallRejected', handleRejected)
    hubConnection.on('CallEnded', handleEnded)
    return () => {
      hubConnection.off('CallRejected', handleRejected)
      hubConnection.off('CallEnded', handleEnded)
    }
  }, [hubConnection, cleanup, onEnd])

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  // Sync local video when ref mounts
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current && !localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  })

  // Sync remote video when ref mounts
  useEffect(() => {
    if (remoteStreamRef.current && remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current
    }
  })

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = muted })
      setMuted((v) => !v)
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = videoOff })
      setVideoOff((v) => !v)
    }
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="call-overlay">
      <div className="call-panel">
        <video
          ref={remoteVideoRef}
          className="call-remote-video"
          autoPlay
          playsInline
          style={call.isVideo ? {} : { display: 'none' }}
        />

        <div className="call-pip" style={call.isVideo ? {} : { display: 'none' }}>
          <video ref={localVideoRef} autoPlay playsInline muted />
        </div>

        {!call.isVideo && (
          <div className="call-avatar-area">
            <div className="call-avatar">
              {call.peerName?.[0] || 'U'}
            </div>
          </div>
        )}

        <div className="call-info">
          <div className="call-name">{call.peerName || 'User'}</div>
          <div className="call-status">
            {phase === 'calling' && 'Calling…'}
            {phase === 'connecting' && 'Connecting…'}
            {phase === 'connected' && fmt(elapsed)}
          </div>
        </div>

        <div className="call-controls">
          {phase === 'connected' && (
            <>
              <button className="call-ctrl" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
                {muted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              {call.isVideo && (
                <button className="call-ctrl" onClick={toggleVideo} title={videoOff ? 'Show camera' : 'Hide camera'}>
                  {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
              )}
            </>
          )}

          <button className="call-ctrl call-decline" onClick={call.direction === 'incoming' ? rejectIncoming : hangUp} title="End call">
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </div>
  )
}
