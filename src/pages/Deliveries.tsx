import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NewDeliveryModal } from '../components/actions'
import { EmptyState } from '../components/ui'
import { fmtNum, fmtWhen } from '../lib/calc'
import { sendDeliveryGroup, useAppState } from '../lib/store'

export default function Deliveries() {
  const s = useAppState()
  const navigate = useNavigate()
  const [showAdd, setShowAdd] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const memberId = s.session?.memberId
  const member = s.members.find((m) => m.id === memberId)
  const isStaffB = member?.role === 'Staff B'
  const canSend = member?.role === 'Staff A' || member?.role === 'Admin'

  const deliveryGroups = [...s.deliveryGroups].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  function getGroupDeliveries(groupId: string) {
    return s.deliveries.filter((d) => d.groupId === groupId)
  }

  function getGroupFarmerNames(groupId: string) {
    const deliveries = getGroupDeliveries(groupId)
    const names = deliveries.map((d) => {
      const farmer = s.farmers.find((f) => f.id === d.farmerId)
      return farmer ? `${farmer.firstName} ${farmer.lastName}` : '—'
    })
    return [...new Set(names)].join(', ')
  }

  function getGroupProductSummary(groupId: string) {
    const deliveries = getGroupDeliveries(groupId)
    const productMap = new Map<string, { name: string; emoji: string; total: number; unit: string }>()
    for (const d of deliveries) {
      const batches = s.batches.filter((b) => b.deliveryId === d.id)
      for (const b of batches) {
        const product = s.products.find((p) => p.id === b.productId)
        if (!product) continue
        const existing = productMap.get(b.productId)
        if (existing) {
          existing.total += b.originalQuantity
        } else {
          productMap.set(b.productId, { name: product.name, emoji: product.emoji, total: b.originalQuantity, unit: b.unit })
        }
      }
    }
    return Array.from(productMap.values())
  }

  async function handleSend(e: React.MouseEvent, groupId: string) {
    e.stopPropagation()
    setError('')
    setBusyId(groupId)
    try {
      await sendDeliveryGroup(groupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the delivery group.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isStaffB ? 'Incoming Deliveries' : 'Deliveries'}</h1>
          <p className="page-subtitle">{deliveryGroups.length} delivery group{deliveryGroups.length !== 1 ? 's' : ''}</p>
        </div>
        {!isStaffB && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ New Delivery</button>
        )}
      </div>

      {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}

      {deliveryGroups.length === 0 ? (
        <div className="empty-state">
          <EmptyState icon="▣" title="No delivery groups" copy="Create a delivery group to send produce to the receiving hub." />
        </div>
      ) : (
        <div className="delivery-groups">
          {deliveryGroups.map((group) => {
            const deliveries = getGroupDeliveries(group.id)
            const farmerNames = getGroupFarmerNames(group.id)
            const products = getGroupProductSummary(group.id)
            const totalQty = products.reduce((sum, p) => sum + p.total, 0)
            const hub = s.hubs.find((h) => h.id === group.originHubId)
            return (
              <div key={group.id} className="delivery-group-card" onClick={() => navigate(`/deliveries/${group.id}`)}>
                <div className="delivery-group-header">
                  <span className="badge badge-blue">{group.groupCode}</span>
                  <span className={`badge ${group.status === 'Received' ? 'badge-green' : group.status === 'On the Way' ? 'badge-amber' : 'badge-gray'}`}>
                    {group.status}
                  </span>
                  {canSend && group.status === 'Pending' && (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={busyId === group.id}
                      onClick={(e) => handleSend(e, group.id)}
                    >
                      {busyId === group.id ? 'Sending…' : 'Send'}
                    </button>
                  )}
                </div>
                <div className="delivery-group-body">
                  <p className="delivery-group-farmers">{farmerNames}</p>
                  <div className="delivery-group-products">
                    {products.map((p) => (
                      <span key={p.name} className="delivery-group-product">{p.emoji} {p.name} {fmtNum(p.total)} {p.unit}</span>
                    ))}
                  </div>
                  <div className="delivery-group-meta">
                    <span>{deliveries.length} farmer{deliveries.length !== 1 ? 's' : ''}</span>
                    <span>{fmtNum(totalQty)} total</span>
                    <span>{hub?.name ?? '—'}</span>
                    <span>{fmtWhen(group.createdAt)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAdd && <NewDeliveryModal open onClose={() => setShowAdd(false)} />}
    </div>
  )
}
