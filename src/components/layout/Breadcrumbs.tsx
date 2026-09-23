import { Link, useLocation } from 'react-router-dom'

const routeLabels: Record<string, string> = {
  '/': 'Overview',
  '/farmers': 'Farmers',
  '/deliveries': 'Deliveries',
  '/market': 'Market',
  '/sales': 'Sales',
  '/settlements': 'Settlements',
  '/demand': 'Demand',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/help': 'Help & Support',
  '/orders': 'Orders',
  '/returns': 'Returns',
  '/notifications': 'Notifications',
  '/members': 'Members',
  '/products': 'Products',
}

export function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs: { label: string; to?: string }[] = []

  const firstSegment = '/' + segments[0]
  crumbs.push({
    label: routeLabels[firstSegment] ?? segments[0],
    to: segments.length > 1 ? firstSegment : undefined,
  })

  if (segments.length >= 2) {
    const secondPath = '/' + segments.slice(0, 2).join('/')
    const secondLabel = routeLabels[secondPath] ?? segments[1]
    crumbs.push({
      label: secondLabel,
      to: segments.length > 2 ? secondPath : undefined,
    })
  }

  if (segments.length >= 3) {
    crumbs.push({ label: segments[2] })
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-sep">/</span>}
          {crumb.to ? (
            <Link to={crumb.to} className="breadcrumb-link">{crumb.label}</Link>
          ) : (
            <span className="breadcrumb-current">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}