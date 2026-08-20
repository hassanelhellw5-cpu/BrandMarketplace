import { Phone, PhoneOff, Video } from 'lucide-react'
import './IncomingCallPopup.css'

export default function IncomingCallPopup({ call, onAccept, onReject }) {
  return (
    <div className="icp-overlay">
      <div className="icp-card">
        <div className="icp-pulse-ring" />
        <div className="icp-avatar">
          {call.callerName?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="icp-name">{call.callerName || 'User'}</div>
        <div className="icp-type">{call.isVideo ? 'Incoming video call' : 'Incoming voice call'}</div>
        <div className="icp-actions">
          <button className="icp-btn icp-decline" onClick={onReject} title="Decline">
            <PhoneOff size={22} />
          </button>
          <button className="icp-btn icp-accept" onClick={onAccept} title="Accept">
            {call.isVideo ? <Video size={22} /> : <Phone size={22} />}
          </button>
        </div>
      </div>
    </div>
  )
}
