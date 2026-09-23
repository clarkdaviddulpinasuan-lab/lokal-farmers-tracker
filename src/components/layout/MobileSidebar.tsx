import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  PackageOpen,
  ChartNoAxesCombined,
  Settings,
  CircleHelp,
  X,
  UserCog,
  Inbox,
  ShoppingCart,
  RotateCcw,
} from 'lucide-react'
import { useAppState } from '../../lib/store'

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

function navItems(role: string | undefined) {
  const base = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
  ]
  if (role === 'Admin') {
    return [
      ...base,
      { label: 'Farmers', to: '/farmers', icon: Users },
      { label: 'Deliveries', to: '/deliveries', icon: PackageOpen },
      { label: 'Market', to: '/market', icon: PackageOpen },
      { label: 'Orders', to: '/orders', icon: ShoppingCart },
      { label: 'Returns', to: '/returns', icon: RotateCcw },
      { label: 'Settlements', to: '/settlements', icon: ChartNoAxesCombined },
      { label: 'Reports', to: '/reports', icon: ChartNoAxesCombined },
      { label: 'Members', to: '/members', icon: UserCog },
    ]
  }
  if (role === 'Staff A') {
    return [
      ...base,
      { label: 'Farmers', to: '/farmers', icon: Users },
      { label: 'Deliveries', to: '/deliveries', icon: PackageOpen },
      { label: 'Returns', to: '/returns', icon: RotateCcw },
      { label: 'Settlements', to: '/settlements', icon: ChartNoAxesCombined },
    ]
  }
  return [
    ...base,
    { label: 'Incoming', to: '/deliveries', icon: Inbox },
    { label: 'Market', to: '/market', icon: PackageOpen },
    { label: 'Orders', to: '/orders', icon: ShoppingCart },
    { label: 'Returns', to: '/returns', icon: RotateCcw },
  ]
}

const secondaryNav = [
  { label: 'Settings', to: '/settings', icon: Settings },
  { label: 'Help & Support', to: '/help', icon: CircleHelp },
]

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const location = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)
  const state = useAppState()
  const member = state.members.find((m) => m.id === state.session?.memberId)
  const hub = member?.hubId ? state.hubs.find((h) => h.id === member.hubId) : null

  const primaryNav = navItems(member?.role)
  const initials = member ? `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}` : '??'

  useEffect(() => {
    onClose()
  }, [location.pathname, onClose])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  function isActive(to: string) {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <>
      {open && <div className="mobile-sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <div
        ref={panelRef}
        className={`mobile-sidebar ${open ? 'mobile-sidebar--open' : ''}`}
        role="dialog"
        aria-label="Mobile navigation"
        aria-modal="true"
      >
        <div className="mobile-sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="12" r="2.5" />
                <circle cx="18" cy="6" r="2.5" />
                <circle cx="18" cy="18" r="2.5" />
                <path d="M8.5 12h3l5-4.5" />
                <path d="M8.5 12h3l5 5.5" />
              </svg>
            </div>
            <span className="sidebar-wordmark">LokalLink</span>
          </div>
          <button className="mobile-sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="mobile-sidebar-body">
          <div className="sidebar-section">
            <span className="sidebar-section-label">WORKSPACE</span>
            <nav className="sidebar-nav" aria-label="Primary navigation">
              {primaryNav.map((item) => {
                const Icon = item.icon
                const active = isActive(item.to)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`sidebar-nav-item ${active ? 'sidebar-nav-item--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-section">
            <span className="sidebar-section-label">MANAGEMENT</span>
            <nav className="sidebar-nav" aria-label="Secondary navigation">
              {secondaryNav.map((item) => {
                const Icon = item.icon
                const active = item.to !== '/help' && isActive(item.to)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`sidebar-nav-item ${active ? 'sidebar-nav-item--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </div>

        <div className="mobile-sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{member ? `${member.firstName} ${member.lastName}` : 'Guest'}</span>
              <span className="sidebar-user-role">{member?.role ?? '—'}{hub ? ` · ${hub.name}` : ''}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
