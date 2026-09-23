import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/ui'
import { fmtMoney, fmtNum, fmtWhen, initials } from '../lib/calc'
import { selectFarmerStats, useAppState } from '../lib/store'

type Tab = 'overview' | 'produce' | 'deliveries' | 'revenue' | 'allocations' | 'activity'

export default function FarmerDetail() {
  const { id } = useParams()
  const state = useAppState()
  const [tab, setTab] = useState<Tab>('overview')
  const farmer = state.farmers.find((f) => f.id === id)
  if (!farmer) return null

  const stats = selectFarmerStats(state, farmer.id)
  const deliveries = state.deliveries.filter((d) => d.farmerId === farmer.id)
  const batches = state.batches.filter((b) => b.farmerId === farmer.id)
  const sales = state.sales.filter((s) => s.farmerId === farmer.id)
  const farmerReturns = state.returns.filter((r) => {
    const batch = state.batches.find((b) => b.id === r.batchId)
    return batch?.farmerId === farmer.id
  })

  const produceMap = new Map<string, { name: string; emoji: string; supplied: number; sold: number; returned: number; revenue: number }>()
  for (const b of batches) {
    const product = state.products.find((p) => p.id === b.productId)
    const existing = produceMap.get(b.productId) ?? { name: product?.name ?? 'Product', emoji: product?.emoji ?? '', supplied: 0, sold: 0, returned: 0, revenue: 0 }
    existing.supplied += b.originalQuantity
    existing.sold += b.quantitySold
    existing.returned += b.quantityReturned
    existing.revenue += b.quantitySold * b.farmerPrice
    produceMap.set(b.productId, existing)
  }

  const allocations = state.farmerAllocations.filter((fa) => fa.farmerId === farmer.id)

  const events = [
    ...sales.map((s) => ({ time: s.soldAt, title: `Sold ${fmtNum(s.quantity)} ${s.unit} to ${s.buyerName}`, detail: fmtMoney(s.quantity * s.unitPrice), icon: '↗', color: 'green' as const })),
    ...farmerReturns.map((r) => ({ time: r.returnedAt, title: `Returned ${fmtNum(r.quantity)} ${r.unit} — ${r.reason}`, detail: r.condition, icon: '↩', color: 'amber' as const })),
    ...deliveries.map((d) => ({ time: d.deliveryDate, title: `Delivery ${d.deliveryCode} received`, detail: d.collectionLocation, icon: '▣', color: 'violet' as const })),
    ...state.settlements.filter((st) => st.farmerId === farmer.id).map((st) => ({ time: st.createdAt, title: `Settlement ${st.settlementCode} ${st.status.toLowerCase()}`, detail: fmtMoney(st.payable), icon: '₱', color: 'violet' as const })),
  ].sort((a, b) => (a.time < b.time ? 1 : -1))

  const totalRevenue = sales.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0)
  const totalFarmerShare = sales.reduce((sum, s) => {
    const batch = batches.find((b) => b.id === s.batchId)
    return sum + s.quantity * (batch?.farmerPrice ?? 0)
  }, 0)
  const totalFees = sales.reduce((sum, s) => {
    const batch = batches.find((b) => b.id === s.batchId)
    return sum + s.quantity * (batch?.labFee ?? 0)
  }, 0)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'produce', label: 'Produce' },
    { key: 'deliveries', label: 'Deliveries' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'allocations', label: 'Allocations' },
    { key: 'activity', label: 'Activity' },
  ]

  return (
    <>
      <div className="workspace-header">
        <span className="workspace-avatar">{initials(farmer.firstName, farmer.lastName)}</span>
        <div className="workspace-info">
          <h1>{farmer.firstName} {farmer.lastName}</h1>
          <p>{farmer.farmerCode} · {farmer.barangay}, {farmer.municipality} · joined {new Date(farmer.createdAt).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })} <StatusBadge status={farmer.status} /></p>
        </div>
        <div className="workspace-actions">
          <Link className="secondary-button" to="/farmers"><span>←</span> Directory</Link>
        </div>
      </div>

      <section className="workspace-stats" aria-label="Farmer statistics">
        <div className="workspace-stat"><span>Total supplied</span><b>{fmtNum(stats.supplied)} kg</b></div>
        <div className="workspace-stat"><span>Total sold</span><b>{fmtNum(stats.sold)} kg</b></div>
        <div className="workspace-stat"><span>Sell-through</span><b>{fmtNum(stats.sellThroughPct)}%</b></div>
        <div className="workspace-stat"><span>Potential value</span><b>{fmtMoney(stats.potential)}</b></div>
        <div className="workspace-stat"><span>Actual revenue</span><b>{fmtMoney(stats.actualValue)}</b></div>
        <div className="workspace-stat accent"><span>Pending payable</span><b>{fmtMoney(stats.pendingPayable)}</b></div>
      </section>

      <nav className="workspace-tabs" aria-label="Farmer details">
        {tabs.map((t) => (
          <button key={t.key} className={`workspace-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </nav>

      <div className="workspace-tab-content">
        {tab === 'overview' && (
          <div className="panel">
            <div className="panel-header"><div><h2>Profile</h2><p>Personal and contact details</p></div></div>
            <div className="profile-card-enhanced">
              <dl className="profile-field"><dt>Full name</dt><dd>{farmer.firstName} {farmer.lastName}</dd></dl>
              <dl className="profile-field"><dt>Farmer code</dt><dd>{farmer.farmerCode}</dd></dl>
              <dl className="profile-field"><dt>Age</dt><dd>{farmer.age} years old</dd></dl>
              <dl className="profile-field"><dt>Gender</dt><dd>{farmer.gender}</dd></dl>
              <dl className="profile-field"><dt>Address</dt><dd>{farmer.address}, {farmer.barangay}</dd></dl>
              <dl className="profile-field"><dt>Municipality</dt><dd>{farmer.municipality}</dd></dl>
              <dl className="profile-field"><dt>Contact</dt><dd>{farmer.phone}</dd></dl>
              <dl className="profile-field"><dt>Status</dt><dd><StatusBadge status={farmer.status} /></dd></dl>
            </div>
          </div>
        )}

        {tab === 'produce' && (
          <div className="panel">
            <div className="panel-header"><div><h2>Products supplied</h2><p>What this farmer has delivered</p></div></div>
            {produceMap.size === 0 ? (
              <p className="text-sm text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>No produce recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Product</th><th>Supplied</th><th>Sold</th><th>Returned</th><th>Revenue</th><th>Sell-through</th></tr></thead>
                  <tbody>
                    {[...produceMap.entries()].map(([productId, p]) => {
                      const st = p.supplied > 0 ? Math.min(100, Math.round((p.sold / p.supplied) * 100)) : 0
                      return (
                        <tr key={productId}>
                          <td><b>{p.emoji} {p.name}</b></td>
                          <td>{fmtNum(p.supplied)} kg</td>
                          <td>{fmtNum(p.sold)} kg</td>
                          <td>{fmtNum(p.returned)} kg</td>
                          <td><b>{fmtMoney(p.revenue)}</b></td>
                          <td>
                            <span className={`status ${st >= 60 ? 'stats-Active' : st >= 30 ? 'stats-Reserved' : 'stats-Inactive'}`}>
                              <i />{st}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'deliveries' && (
          <div className="panel">
            <div className="panel-header"><div><h2>Delivery history</h2><p>{deliveries.length} delivery{deliveries.length !== 1 ? 'ies' : ''} on record</p></div></div>
            {deliveries.length === 0 ? (
              <p className="text-sm text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>No deliveries yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Delivery</th><th>Date</th><th>Location</th><th>Batches</th><th>Status</th></tr></thead>
                  <tbody>
                    {deliveries.sort((a, b) => (a.deliveryDate < b.deliveryDate ? 1 : 0)).map((d) => {
                      const batchCount = state.batches.filter((b) => b.deliveryId === d.id).length
                      return (
                        <tr key={d.id}>
                          <td><b className="lot-code">{d.deliveryCode}</b></td>
                          <td>{fmtWhen(d.deliveryDate)}</td>
                          <td>{d.collectionLocation}</td>
                          <td>{batchCount}</td>
                          <td><StatusBadge status={d.status} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'revenue' && (
          <div className="panel">
            <div className="panel-header"><div><h2>Revenue breakdown</h2><p>Sales value, farmer share, and fees</p></div></div>
            <div className="card-grid-3" style={{ marginBottom: 20 }}>
              <div className="workspace-stat"><span>Total revenue</span><b>{fmtMoney(totalRevenue)}</b></div>
              <div className="workspace-stat"><span>Farmer share</span><b>{fmtMoney(totalFarmerShare)}</b></div>
              <div className="workspace-stat"><span>LokalLink fees</span><b>{fmtMoney(totalFees)}</b></div>
            </div>
            {sales.length === 0 ? (
              <p className="text-sm text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>No sales recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Sale</th><th>Buyer</th><th>Qty</th><th>Value</th><th>Farmer share</th><th>Fee</th><th>Date</th></tr></thead>
                  <tbody>
                    {sales.sort((a, b) => (a.soldAt < b.soldAt ? 1 : 0)).map((s) => {
                      const batch = batches.find((b) => b.id === s.batchId)
                      return (
                        <tr key={s.id}>
                          <td><b className="lot-code">{s.saleCode}</b></td>
                          <td>{s.buyerName}</td>
                          <td>{fmtNum(s.quantity)} {s.unit}</td>
                          <td><b>{fmtMoney(s.quantity * s.unitPrice)}</b></td>
                          <td>{fmtMoney(s.quantity * (batch?.farmerPrice ?? 0))}</td>
                          <td>{fmtMoney(s.quantity * (batch?.labFee ?? 0))}</td>
                          <td>{fmtWhen(s.soldAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'allocations' && (
          <div className="panel">
            <div className="panel-header"><div><h2>Auto-calculated allocations</h2><p>System-computed revenue from market orders</p></div></div>
            {allocations.length === 0 ? (
              <p className="text-sm text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>No allocations yet. Allocations are created automatically when orders are placed.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Product</th><th>Allocated Qty</th><th>Payout</th></tr></thead>
                  <tbody>
                    {allocations.sort((a, b) => (a.createdAt < b.createdAt ? 1 : 0)).map((a) => {
                      const product = state.products.find((p) => p.id === a.productId)
                      return (
                        <tr key={a.id}>
                          <td>{fmtWhen(a.createdAt)}</td>
                          <td>{product?.emoji} {product?.name ?? '—'}</td>
                          <td>{fmtNum(a.allocatedQuantity)} {product?.defaultUnit ?? 'kg'}</td>
                          <td><b>{fmtMoney(a.farmerPayout)}</b></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="panel">
            <div className="panel-header"><div><h2>Activity timeline</h2><p>Deliveries, sales, returns, and settlements</p></div></div>
            {events.length === 0 ? (
              <p className="text-sm text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>No recorded activity yet.</p>
            ) : (
              <div className="activity-list">
                {events.map((event, index) => (
                  <div className="activity-item" key={`${event.title}-${index}`}>
                    <span className={`activity-icon ${event.color}`}>{event.icon}</span>
                    <div className="activity-body">
                      <b>{event.title}</b>
                      <span>{event.detail}</span>
                    </div>
                    <span className="activity-time">{fmtWhen(event.time)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
