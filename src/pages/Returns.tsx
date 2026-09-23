import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw, Eye, Plus } from 'lucide-react'
import { useAppState } from '../lib/store'
import { CreateReturnRequestModal } from '../components/actions'
import type { ReturnRequestStatus } from '../types'

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }

const statusClass: Record<ReturnRequestStatus, string> = {
  'Pending Review': 'badge-amber',
  Approved: 'badge-green',
  Rejected: 'badge-red',
  Processed: 'badge-blue',
}

export default function Returns() {
  const s = useAppState()
  const memberId = s.session?.memberId
  const member = s.members.find((m) => m.id === memberId)
  const isStaffA = member?.role === 'Staff A'
  const [showCreate, setShowCreate] = useState(false)

  const returns = [...s.returnRequests].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><RotateCcw size={24} /> {isStaffA ? 'Return Reviews' : 'Returns'}</h1>
          <p className="page-subtitle">{returns.length} return request{returns.length !== 1 ? 's' : ''}</p>
        </div>
        {!isStaffA && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Return
          </button>
        )}
      </div>
      {returns.length === 0 ? (
        <div className="empty-state">
          <RotateCcw size={40} strokeWidth={1} />
          <p>No return requests</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Return Code</th>
                <th>Order</th>
                <th>Type</th>
                <th>Items</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => {
                const order = s.orders.find((o) => o.id === r.orderId)
                return (
                  <tr key={r.id}>
                    <td><span className="badge badge-blue">{r.returnCode}</span></td>
                    <td className="text-muted">{order?.orderCode ?? '—'}</td>
                    <td>
                      <span className={`badge ${r.returnType === 'Damaged' ? 'badge-red' : 'badge-green'}`}>
                        {r.returnType}
                      </span>
                    </td>
                    <td>{r.items.length} product{r.items.length !== 1 ? 's' : ''}</td>
                    <td className="text-muted text-sm">{r.reason.length > 40 ? r.reason.slice(0, 40) + '…' : r.reason}</td>
                    <td><span className={`badge ${statusClass[r.status]}`}>{r.status}</span></td>
                    <td className="text-muted">{fmtDate(r.createdAt)}</td>
                    <td>
                      <Link to={`/returns/${r.id}`} className="btn btn-ghost btn-sm">
                        <Eye size={14} /> View
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateReturnRequestModal open onClose={() => setShowCreate(false)} />}
    </div>
  )
}
