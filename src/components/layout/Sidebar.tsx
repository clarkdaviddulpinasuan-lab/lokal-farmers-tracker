import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  PackageOpen,
  ChartNoAxesCombined,
  Settings,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Inbox,
  ShoppingCart,
  RotateCcw,
  Package,
  Bell,
  LogOut,
} from 'lucide-react'
import { logout, useAppState } from '../../lib/store'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

function navItems(role: string | undefined) {
  const base = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
  ]
  if (role === 'Admin') {
    return [
      ...base,
      { label: 'Farmers', to: '/farmers', icon: Users },
      { label: 'Products', to: '/products', icon: Package },
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
      { label: 'Products', to: '/products', icon: Package },
      { label: 'Deliveries', to: '/deliveries', icon: PackageOpen },
      { label: 'Returns', to: '/returns', icon: RotateCcw },
      { label: 'Settlements', to: '/settlements', icon: ChartNoAxesCombined },
    ]
  }
  // Staff B
  return [
    ...base,
    { label: 'Incoming', to: '/deliveries', icon: Inbox },
    { label: 'Market', to: '/market', icon: PackageOpen },
    { label: 'Orders', to: '/orders', icon: ShoppingCart },
    { label: 'Returns', to: '/returns', icon: RotateCcw },
  ]
}

const secondaryNav = [
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Settings', to: '/settings', icon: Settings },
  { label: 'Help & Support', to: '/help', icon: CircleHelp },
]

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const state = useAppState()
  const member = state.members.find((m) => m.id === state.session?.memberId)
  const hub = member?.hubId ? state.hubs.find((h) => h.id === member.hubId) : null

  async function handleLogout() {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  const primaryNav = navItems(member?.role)

  function isActive(to: string) {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  const initials = member ? `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}` : '??'

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`} aria-label="Sidebar navigation">
      <div className="sidebar-header">
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
          {!collapsed && <span className="sidebar-wordmark">LokalLink</span>}
        </div>
      </div>

      <div className="sidebar-body">
        <div className="sidebar-section">
          {!collapsed && <span className="sidebar-section-label">WORKSPACE</span>}
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
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-section">
          {!collapsed && <span className="sidebar-section-label">MANAGEMENT</span>}
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
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{member ? `${member.firstName} ${member.lastName}` : 'Guest'}</span>
              <span className="sidebar-user-role">{member?.role ?? '—'}{hub ? ` · ${hub.name}` : ''}</span>
            </div>
          </div>
        )}
        <button
          className="sidebar-nav-item"
          onClick={handleLogout}
          aria-label="Log out"
          title={collapsed ? 'Log out' : undefined}
          style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          <LogOut size={18} strokeWidth={1.75} />
          {!collapsed && <span>Log out</span>}
        </button>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} strokeWidth={2} /> : <ChevronLeft size={16} strokeWidth={2} />}
        </button>
      </div>
    </aside>
  )
}
