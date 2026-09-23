import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './Sidebar'
import { MobileSidebar } from './MobileSidebar'
import { TopBar } from './TopBar'
import { Breadcrumbs } from './Breadcrumbs'

interface AppShellProps {
  children: React.ReactNode
}

function getStoredCollapsed(): boolean {
  try {
    const v = localStorage.getItem('sidebarCollapsed')
    return v === 'true'
  } catch {
    return false
  }
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(getStoredCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', String(collapsed))
    } catch { /* noop */ }
  }, [collapsed])

  const toggleCollapse = useCallback(() => setCollapsed((c) => !c), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return (
    <div className="app-shell-new">
      <Sidebar collapsed={collapsed} onToggle={toggleCollapse} />
      <MobileSidebar open={mobileOpen} onClose={closeMobile} />
      <div className={`main-area ${collapsed ? 'main-area--sidebar-collapsed' : ''}`}>
        <TopBar onMenuClick={() => setMobileOpen(true)}>
          <Breadcrumbs />
        </TopBar>
        <main className="content-new">
          {children}
        </main>
      </div>
    </div>
  )
}