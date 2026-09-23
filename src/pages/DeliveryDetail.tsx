import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, Users, CheckCircle, Truck } from 'lucide-react'
import { batchRemaining, fmtMoney, fmtNum, fmtWhen } from '../lib/calc'
import { useAppState, receiveDeliveryGroup, sendDeliveryGroup } from '../lib/store'

type Tab = 'products' | 'farmers'

export default function DeliveryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const s = useAppState()
  const [tab, setTab] = useState<Tab>('products')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const group = s.deliveryGroups.find((g) => g.id === id)
  const memberId = s.session?.memberId
  const member = s.members.find((m) => m.id === memberId)
  const isStaffB = member?.role === 'Staff B'
  const isStaffA = member?.role === 'Staff A' || member?.role === 'Admin'

  if (!group) {
    return (
      <div className="page">
        <div className="empty-state"><p>Delivery group not found.</p></div>
      </div>
    )
  }

  const deliveries = s.deliveries.filter((d) => d.groupId === group.id)
  const allBatches = deliveries.flatMap((d) => s.batches.filter((b) => b.deliveryId === d.id))
  const hub = s.hubs.find((h) => h.id === group.originHubId)

  const productMap = new Map<string, { name: string; emoji: string; total: number; sold: number; remaining: number; unit: string; revenue: number }>()
  for (const b of allBatches) {
    const product = s.products.find((p) => p.id === b.productId)
    if (!product) continue
    const existing = productMap.get(b.productId)
    if (existing) {
      existing.total += b.originalQuantity
      existing.sold += b.quantitySold
      existing.remaining += batchRemaining(b)
      existing.revenue += b.quantitySold * b.marketPrice
    } else {
      productMap.set(b.productId, { name: product.name, emoji: product.emoji, total: b.originalQuantity, sold: b.quantitySold, remaining: batchRemaining(b), unit: b.unit, revenue: b.quantitySold * b.marketPrice })
    }
  }

  const farmerMap = new Map<string, { name: string; products: { name: string; emoji: string; qty: number; unit: string }[]; totalQty: number }>()
  for (const d of deliveries) {
    const farmer = s.farmers.find((f) => f.id === d.farmerId)
    if (!farmer) continue
    const existing = farmerMap.get(d.farmerId)
    const batches = s.batches.filter((b) => b.deliveryId === d.id)
    for (const b of batches) {
      const product = s.products.find((p) => p.id === b.productId)
      if (!product) continue
      if (existing) {
        existing.totalQty += b.originalQuantity
        const prodEntry = existing.products.find((p) => p.name === product.name)
        if (prodEntry) { prodEntry.qty += b.originalQuantity } else { existing.products.push({ name: product.name, emoji: product.emoji, qty: b.originalQuantity, unit: b.unit }) }
      } else {
        farmerMap.set(d.farmerId, { name: `${farmer.firstName} ${farmer.lastName}`, products: [{ name: product.name, emoji: product.emoji, qty: b.originalQuantity, unit: b.unit }], totalQty: b.originalQuantity })
      }
    }
  }

  const totalQty = allBatches.reduce((sum, b) => sum + b.originalQuantity, 0)
  const totalSold = allBatches.reduce((sum, b) => sum + b.quantitySold, 0)
  const totalRevenue = allBatches.reduce((sum, b) => sum + b.quantitySold * b.marketPrice, 0)
  const currentGroup = group!

  async function handleSend() {
    setActionError('')
    setBusy(true)
    try {
      await sendDeliveryGroup(currentGroup.id)
      navigate('/deliveries')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not send the delivery group.')
    } finally {
      setBusy(false)
    }
  }

  async function handleReceive() {
    setActionError('')
    setBusy(true)
    try {
      await receiveDeliveryGroup(currentGroup.id)
      navigate('/deliveries')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not receive the delivery group.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/deliveries" className="back-link"><ArrowLeft size={16} /> Back to Deliveries</Link>
          <h1 className="page-title">Delivery Group {group.groupCode}</h1>
          <p className="page-subtitle">{hub?.name ?? '—'} · {fmtWhen(group.createdAt)} · {deliveries.length} farmer{deliveries.length !== 1 ? 's' : ''}</p>
        </div>
        <span className={`badge ${group.status === 'Received' ? 'badge-green' : group.status === 'On the Way' ? 'badge-amber' : 'badge-gray'}`}>
          {group.status}
        </span>
        {isStaffA && group.status === 'Pending' && (
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={handleSend}>
            <Truck size={14} /> {busy ? 'Sending…' : 'Send Delivery'}
          </button>
        )}
        {isStaffB && group.status === 'On the Way' && !confirming && (
          <button className="btn btn-success btn-sm" disabled={busy} onClick={() => setConfirming(true)}>
            <CheckCircle size={14} /> Receive Delivery
          </button>
        )}
      </div>

      {actionError && <p className="form-error" style={{ marginBottom: '1rem' }}>{actionError}</p>}

      {isStaffB && group.status === 'On the Way' && confirming && (
        <div className="receive-confirm-panel">
          <div className="receive-confirm-header">
            <Truck size={20} />
            <div>
              <h3>Confirm Receipt</h3>
              <p>Verify that this delivery group has arrived and all items are accounted for.</p>
            </div>
          </div>
          <div className="receive-confirm-checklist">
            <label className="receive-check-item">
              <input type="checkbox" id="chk-qty" />
              <span>Physical quantity matches the manifest ({fmtNum(totalQty)} kg total)</span>
            </label>
            <label className="receive-check-item">
              <input type="checkbox" id="chk-products" />
              <span>All {productMap.size} product{productMap.size !== 1 ? 's' : ''} accounted for</span>
            </label>
            <label className="receive-check-item">
              <input type="checkbox" id="chk-farmers" />
              <span>{deliveries.length} farmer delivery{deliveries.length !== 1 ? 'ies' : ''} in this group</span>
            </label>
          </div>
          <div className="receive-confirm-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setConfirming(false)}>Cancel</button>
            <button className="btn btn-success btn-sm" disabled={busy} onClick={handleReceive}>
              <CheckCircle size={14} /> {busy ? 'Receiving…' : 'Confirm — Delivery Received'}
            </button>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-card">
          <span className="detail-label">Total Quantity</span>
          <span className="detail-value">{fmtNum(totalQty)} kg</span>
        </div>
        <div className="detail-card">
          <span className="detail-label">Total Sold</span>
          <span className="detail-value">{fmtNum(totalSold)} kg</span>
        </div>
        <div className="detail-card">
          <span className="detail-label">Revenue</span>
          <span className="detail-value font-semibold">{fmtMoney(totalRevenue)}</span>
        </div>
      </div>

      <nav className="workspace-tabs" aria-label="Delivery detail tabs">
        <button className={`workspace-tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}><Package size={14} /> Products</button>
        <button className={`workspace-tab ${tab === 'farmers' ? 'active' : ''}`} onClick={() => setTab('farmers')}><Users size={14} /> Farmers</button>
      </nav>

      <div className="workspace-tab-content">
        {tab === 'products' && (
          <div className="panel">
            <div className="panel-header"><div><h2>Product Summary</h2><p>Aggregated product totals across all farmers</p></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Total</th><th>Sold</th><th>Remaining</th><th>Revenue</th></tr></thead>
                <tbody>
                  {[...productMap.values()].map((p) => (
                    <tr key={p.name}>
                      <td><b>{p.emoji} {p.name}</b></td>
                      <td>{fmtNum(p.total)} {p.unit}</td>
                      <td>{fmtNum(p.sold)} {p.unit}</td>
                      <td>{fmtNum(p.remaining)} {p.unit}</td>
                      <td><b>{fmtMoney(p.revenue)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'farmers' && (
          <div className="panel">
            <div className="panel-header"><div><h2>Farmer Breakdown</h2><p>Per-farmer contributions to this delivery group</p></div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Farmer</th><th>Products</th><th>Total Qty</th></tr></thead>
                <tbody>
                  {[...farmerMap.values()].map((f) => (
                    <tr key={f.name}>
                      <td className="font-medium">{f.name}</td>
                      <td>{f.products.map((p) => `${p.emoji} ${p.name} ${fmtNum(p.qty)} ${p.unit}`).join(', ')}</td>
                      <td><b>{fmtNum(f.totalQty)} kg</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
