import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { useAppState, markNotificationRead, markAllNotificationsRead } from '../lib/store'
import type { Notification } from '../types'

const typeIcons: Record<Notification['type'], string> = {
  delivery_incoming: '🚚',
  delivery_received: '✅',
  return_request: '↩️',
  return_approved: '👍',
  return_rejected: '👎',
  order_confirmed: '🛒',
}

const typeColors: Record<Notification['type'], string> = {
  delivery_incoming: 'notif-blue',
  delivery_received: 'notif-green',
  return_request: 'notif-amber',
  return_approved: 'notif-green',
  return_rejected: 'notif-red',
  order_confirmed: 'notif-purple',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function Notifications() {
  const s = useAppState()
  const navigate = useNavigate()
  const memberId = s.session?.memberId
  const notifications = s.notifications
    .filter((n) => n.targetMemberId === memberId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const unread = notifications.filter((n) => !n.read)

  async function handleClick(n: Notification) {
    if (!n.read) {
      try {
        await markNotificationRead(n.id)
      } catch {
        // non-blocking: navigation should still work
      }
    }
    if (n.relatedEntityType === 'Order') navigate(`/orders/${n.relatedEntityId}`)
    else if (n.relatedEntityType === 'ReturnRequest') navigate(`/returns/${n.relatedEntityId}`)
    else if (n.relatedEntityType === 'DeliveryGroup') navigate('/deliveries')
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead()
    } catch {
      // ignore
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Bell size={24} /> Notifications</h1>
          <p className="page-subtitle">{unread.length} unread</p>
        </div>
        {unread.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={handleMarkAll}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="empty-state">
          <Bell size={40} strokeWidth={1} />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((n) => (
            <button
              key={n.id}
              className={`notification-item ${!n.read ? 'notification-item--unread' : ''}`}
              onClick={() => handleClick(n)}
            >
              <span className={`notification-icon ${typeColors[n.type]}`}>{typeIcons[n.type]}</span>
              <div className="notification-body">
                <span className="notification-title">{n.title}</span>
                <span className="notification-message">{n.message}</span>
                <span className="notification-time">{timeAgo(n.createdAt)}</span>
              </div>
              <ExternalLink size={14} className="notification-link" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
