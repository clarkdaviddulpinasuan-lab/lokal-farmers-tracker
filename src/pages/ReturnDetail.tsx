import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, CheckCircle, XCircle } from 'lucide-react'
import { useAppState, reviewReturnRequest } from '../lib/store'

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function ReturnDetail() {
  const { id } = useParams()
  const s = useAppState()
  const rr = s.returnRequests.find((r) => r.id === id)
  const memberId = s.session?.memberId
  const member = s.members.find((m) => m.id === memberId)
  const isStaffA = member?.role === 'Staff A'
  const [reviewNote, setReviewNote] = useState('')
  const [confirmAction, setConfirmAction] = useState<'Approved' | 'Rejected' | null>(null)
  const [busy, setBusy] = useState(false)
  const [reviewError, setReviewError] = useState('')

  if (!rr) {
    return (
      <div className="page">
        <div className="empty-state"><p>Return request not found.</p></div>
      </div>
    )
  }

  const order = s.orders.find((o) => o.id === rr!.orderId)

  async function handleReview(decision: 'Approved' | 'Rejected') {
    setReviewError('')
    setBusy(true)
    try {
      await reviewReturnRequest(rr!.id, decision, reviewNote || undefined)
      setConfirmAction(null)
      setReviewNote('')
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Could not review the return request.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/returns" className="back-link"><ArrowLeft size={16} /> Back to Returns</Link>
          <h1 className="page-title"><RotateCcw size={24} /> {rr.returnCode}</h1>
          <p className="page-subtitle">Created {fmtDate(rr.createdAt)} by {rr.requestedBy}</p>
        </div>
        <span className={`badge ${rr.status === 'Pending Review' ? 'badge-amber' : rr.status === 'Approved' ? 'badge-green' : rr.status === 'Rejected' ? 'badge-red' : 'badge-blue'}`}>
          {rr.status}
        </span>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <span className="detail-label">Order</span>
          <span className="detail-value">{order?.orderCode ?? '—'}</span>
        </div>
        <div className="detail-card">
          <span className="detail-label">Return Type</span>
          <span className={`badge ${rr.returnType === 'Damaged' ? 'badge-red' : 'badge-green'}`}>{rr.returnType}</span>
        </div>
        <div className="detail-card">
          <span className="detail-label">Reason</span>
          <span className="detail-value">{rr.reason}</span>
        </div>
        {rr.notes && (
          <div className="detail-card">
            <span className="detail-label">Notes</span>
            <span className="detail-value">{rr.notes}</span>
          </div>
        )}
      </div>

      <h2 className="section-title">Items</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {rr.items.map((item) => {
              const product = s.products.find((p) => p.id === item.productId)
              return (
                <tr key={item.id}>
                  <td className="font-medium">{product?.emoji} {product?.name ?? item.productId}</td>
                  <td>{item.quantity} {item.unit}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {rr.reviewedBy && (
        <div className="detail-card" style={{ marginTop: '1rem' }}>
          <span className="detail-label">Reviewed by</span>
          <span className="detail-value">{rr.reviewedBy} on {rr.reviewedAt ? fmtDate(rr.reviewedAt) : '—'}</span>
          {rr.reviewNote && <p className="text-muted" style={{ marginTop: '0.5rem' }}>{rr.reviewNote}</p>}
        </div>
      )}

      {isStaffA && rr.status === 'Pending Review' && (
        <div className="review-actions" style={{ marginTop: '1.5rem' }}>
          {!confirmAction ? (
            <>
              <div className="form-group">
                <label className="form-label">Review Note (optional)</label>
                <input
                  className="form-input"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Add a note for Staff B..."
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn btn-success btn-sm" onClick={() => setConfirmAction('Approved')}>
                  <CheckCircle size={14} /> Approve
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmAction('Rejected')}>
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </>
          ) : (
            <div className="confirm-dialog">
              <p>Are you sure you want to <strong>{confirmAction.toLowerCase()}</strong> this return request?</p>
              {reviewError && <p className="form-error">{reviewError}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  className={`btn btn-sm ${confirmAction === 'Approved' ? 'btn-success' : 'btn-danger'}`}
                  disabled={busy}
                  onClick={() => handleReview(confirmAction)}
                >
                  {busy ? 'Saving…' : `Confirm ${confirmAction}`}
                </button>
                <button className="btn btn-outline btn-sm" disabled={busy} onClick={() => setConfirmAction(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
