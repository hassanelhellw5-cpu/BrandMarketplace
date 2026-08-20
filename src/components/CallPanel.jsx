import { useState, useEffect, useRef, useCallback } from 'react'
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react'
import Peer from 'peerjs'
import { useAuth } from '../context/AuthContext'
import './CallPanel.css'

export default function CallPanel({ call, onEnd, hubConnection }) {
  const { user } = useAuth()
  const [phase, setPhase] = useState(call.direction === 'outgoing' ? 'calling' : 'connecting')
  const [isVideo, setIsVideo] = useState(call.isVideo)
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

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (peerRef.current) {
      peerRef.current.destroy()
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

  const setupPeer = useCallback((stream, onPeerOpen) => {
    const peer = new Peer(user.id)
    peerRef.current = peer

    peer.on('open', () => {
      onPeerOpen(peer)
    })

    peer.on('call', (conn) => {
      conn.answer(stream)
      conn.on('stream', (remote) => {
        remoteStreamRef.current = remote
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote
        setPhase('connected')
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
      })
      conn.on('close', hangUp)
      conn.on('error', hangUp)
    })

    peer.on('error', hangUp)
  }, [user?.id, hangUp])

  const getMedia = useCallback(async (video) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video,
      audio: true,
    })
    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream
    return stream
  }, [])

  // OUTGOING: caller creates peer and sends CallOffer
  useEffect(() => {
    if (call.direction !== 'outgoing') return
    if (startedRef.current) return
    startedRef.current = true
    let cancelled = false

    const start = async () => {
      try {
        const stream = await getMedia(call.isVideo)
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }

        setupPeer(stream, (peer) => {
          hubConnection?.invoke('CallOffer', call.peerUserId, peer.id, call.isVideo, user.displayName || user.userName).catch(() => {})
        })
      } catch {
        hangUp()
      }
    }

    start()
    return () => { cancelled = true }
  }, [call.direction === 'outgoing'])

  // INCOMING: auto-accept — user already accepted in popup
  useEffect(() => {
    if (call.direction !== 'incoming') return
    if (startedRef.current) return
    startedRef.current = true

    const start = async () => {
      try {
        const stream = await getMedia(call.isVideo)

        setupPeer(stream, (peer) => {
          hubConnection?.invoke('CallAnswer', call.callerId, peer.id).catch(() => {})
        })
      } catch {
        rejectIncoming()
      }
    }

    start()
  }, [call.direction === 'incoming'])

  // Listen for CallAnswer from SignalR (outgoing flow: callee answered)
  useEffect(() => {
    if (!hubConnection) return

    const handleAnswer = async (data) => {
      if (!peerRef.current) return
      try {
        const stream = localStreamRef.current
        if (!stream) return
        const conn = peerRef.current.call(data.peerId, stream)
        if (conn) {
          conn.on('stream', (remote) => {
            remoteStreamRef.current = remote
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote
            setPhase('connected')
            timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
          })
          conn.on('close', hangUp)
          conn.on('error', hangUp)
        }
      } catch { hangUp() }
    }

    const handleRejected = () => { cleanup(); onEnd() }
    const handleEnded = () => { cleanup(); onEnd() }

    hubConnection.on('CallAnswer', handleAnswer)
    hubConnection.on('CallRejected', handleRejected)
    hubConnection.on('CallEnded', handleEnded)

    return () => {
      hubConnection.off('CallAnswer', handleAnswer)
      hubConnection.off('CallRejected', handleRejected)
      hubConnection.off('CallEnded', handleEnded)
    }
  }, [hubConnection, hangUp, cleanup, onEnd])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  // Set local video stream when video element mounts
  useEffect(() => {
    if (isVideo && localStreamRef.current && localVideoRef.current && !localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [isVideo])

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
        {isVideo && (
          <video ref={remoteVideoRef} className="call-remote-video" autoPlay playsInline />
        )}

        {isVideo && (
          <div className="call-pip">
            <video ref={localVideoRef} autoPlay playsInline muted={true} />
          </div>
        )}

        {!isVideo && (
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
              {isVideo && (
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
