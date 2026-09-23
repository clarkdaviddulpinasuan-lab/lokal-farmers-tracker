import { Link } from 'react-router-dom'
import { Menu, Bell } from 'lucide-react'
import { useAppState, unreadCount } from '../../lib/store'

interface TopBarProps {
  onMenuClick: () => void
  children?: React.ReactNode
}

export function TopBar({ onMenuClick, children }: TopBarProps) {
  const s = useAppState()
  const memberId = s.session?.memberId
  const unread = memberId ? unreadCount(s, memberId) : 0

  return (
    <div className="topbar-new">
      <button
        className="mobile-menu-btn"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu size={20} strokeWidth={1.75} />
      </button>
      <div className="topbar-content">
        {children}
      </div>
      <Link to="/notifications" className="topbar-notification-btn" aria-label={`Notifications (${unread} unread)`}>
        <Bell size={20} strokeWidth={1.75} />
        {unread > 0 && <span className="notification-badge">{unread > 99 ? '99+' : unread}</span>}
      </Link>
    </div>
  )
}