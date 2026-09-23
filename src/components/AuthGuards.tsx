import { Navigate } from 'react-router-dom'
import { useAppState } from '../lib/store'
import type { Role } from '../types'

function BootLoading() {
  return (
    <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
      <p className="text-muted">Loading LokalLink…</p>
    </div>
  )
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const state = useAppState()
  if (!state.authReady) return <BootLoading />
  if (!state.session) return <Navigate to="/login" replace />
  if (!state.dataReady && state.backend === 'supabase') return <BootLoading />
  if (state.loadError) {
    return (
      <div className="page" style={{ display: 'grid', placeItems: 'center', minHeight: '50vh', gap: 8 }}>
        <p className="form-error">{state.loadError}</p>
        <button className="secondary-button" type="button" onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }
  return <>{children}</>
}

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const state = useAppState()
  if (!state.authReady) return <BootLoading />
  if (!state.session) return <Navigate to="/login" replace />
  const member = state.members.find((m) => m.id === state.session!.memberId)
  if (!member) return <BootLoading />
  if (!roles.includes(member.role)) return <Navigate to="/" replace />
  return <>{children}</>
}
