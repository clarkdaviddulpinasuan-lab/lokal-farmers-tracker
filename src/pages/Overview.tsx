import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NewDeliveryModal, CreateOrderModal } from '../components/actions'
import { ProgressBar } from '../components/ui'
import { fmtMoney, fmtNum, fmtWhen, humanDate, nowISO } from '../lib/calc'
import { selectAggregatedInventory, selectDemand, selectFarmerAttention, selectFarmerStats, selectHubStats, selectTotals, unreadCount, useAppState } from '../lib/store'

export default function Overview() {
  const s = useAppState()
  const navigate = useNavigate()
  const [showDelivery, setShowDelivery] = useState(false)
  const [showOrder, setShowOrder] = useState(false)

  const member = s.members.find((m) => m.id === s.session?.memberId)
  const hub = member?.hubId ? s.hubs.find((h) => h.id === member.hubId) : null
  const role = member?.role

  const totals = selectTotals(s)
  const demand = selectDemand(s)
  const attention = selectFarmerAttention(s)
  const needy = attention.filter((r) => r.needsAttention)
  const hubStats = hub ? selectHubStats(s, hub.id) : null
  const aggregated = selectAggregatedInventory(s)
  const unread = member ? unreadCount(s, member.id) : 0

  const pendingReturns = s.returnRequests.filter((r) => r.status === 'Pending Review')
  const myReturns = s.returnRequests.filter((r) => r.requestedBy === member?.firstName + ' ' + member?.lastName)
  const today = nowISO().slice(0, 10)
  const todayOrders = s.orders.filter((o) => o.createdAt.startsWith(today))
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalRevenue, 0)
  const totalFarmerRevenue = s.farmerAllocations.reduce((sum, fa) => sum + fa.farmerPayout, 0)
  const incomingGroups = s.deliveryGroups.filter((g) => g.status === 'On the Way')
  const availableProducts = aggregated.filter((p) => p.totalRemaining > 0)
  const urgentItems = demand.filter((d) => d.tone === 'urgent')

  const mySentGroups = s.deliveryGroups.filter((g) => g.createdBy === member?.id)
  const recentSales = [...s.sales].sort((a, b) => (a.soldAt < b.soldAt ? 1 : 0)).slice(0, 5)
  const recentDeliveries = [...s.deliveries].sort((a, b) => (a.deliveryDate < b.deliveryDate ? 1 : 0)).slice(0, 5)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div className="overview-hero">
        <div className="overview-hero-text">
          <p className="text-xs text-faint" style={{ textTransform: 'uppercase', letterSpacing: '.9px', fontWeight: 700, marginBottom: 8 }}>{humanDate(nowISO())}{hub ? ` · ${hub.name}` : ''}</p>
          <h1>{greeting}, {member?.firstName ?? 'User'}</h1>
          <p>{role === 'Admin' ? 'System-wide overview across all hubs.' : role === 'Staff A' ? `${hub?.name ?? 'Hub'} — collect, prepare, send.` : `${hub?.name ?? 'Hub'} — receive, sell, process.`}</p>
        </div>
        <div className="overview-actions">
          {role !== 'Staff B' && <button className="secondary-button" onClick={() => setShowDelivery(true)}><span>+</span> New delivery</button>}
          {role === 'Staff B' && <button className="primary-button" onClick={() => setShowOrder(true)}><span>+</span> Create order</button>}
          {role === 'Admin' && <Link className="secondary-button" to="/members"><span>👤</span> Members</Link>}
          {unread > 0 && <Link className="secondary-button" to="/notifications"><span>🔔</span> {unread} unread</Link>}
        </div>
      </div>

      {/* ═══════════════ ADMIN DASHBOARD ═══════════════ */}
      {role === 'Admin' && (
        <>
          <section className="overview-kpi-strip" aria-label="System overview">
            <article className="kpi-card kpi-violet">
              <div className="kpi-top"><span>Total members</span><span className="kpi-icon violet">👤</span></div>
              <strong>{s.members.length}</strong>
              <div className="kpi-meta"><span className="neutral">{s.members.filter((m) => m.status === 'Active').length} active</span></div>
            </article>
            <article className="kpi-card kpi-green">
              <div className="kpi-top"><span>Total farmers</span><span className="kpi-icon green">👥</span></div>
              <strong>{s.farmers.length}</strong>
              <div className="kpi-meta"><span className="neutral">{s.farmers.filter((f) => f.status === 'Active').length} active</span></div>
            </article>
            <article className="kpi-card kpi-amber">
              <div className="kpi-top"><span>Total orders</span><span className="kpi-icon amber">🛒</span></div>
              <strong>{s.orders.length}</strong>
              <div className="kpi-meta"><span className="neutral">{fmtMoney(totals.actual)} revenue</span></div>
            </article>
            <article className="kpi-card kpi-blue">
              <div className="kpi-top"><span>Pending returns</span><span className="kpi-icon blue">↩</span></div>
              <strong>{pendingReturns.length}</strong>
              <div className="kpi-meta"><span className="neutral">{s.returnRequests.length} total</span></div>
            </article>
          </section>

          <div className="overview-body">
            <div className="overview-main">
              <article className="panel">
                <div className="panel-header">
                  <div><h2>System activity</h2><p>All events across hubs</p></div>
                </div>
                <div className="activity-list">
                  {recentSales.map((sale) => {
                    const product = s.products.find((p) => p.id === sale.productId)
                    const farmer = s.farmers.find((f) => f.id === sale.farmerId)
                    return (
                      <div className="activity-item" key={sale.id}>
                        <span className="activity-icon green">↗</span>
                        <div className="activity-body">
                          <b>Sold {fmtNum(sale.quantity)} {sale.unit} {product?.name ?? ''} to {sale.buyerName}</b>
                          <span>{farmer ? `${farmer.firstName} ${farmer.lastName}` : '—'} · {fmtMoney(sale.quantity * sale.unitPrice)}</span>
                        </div>
                        <span className="activity-time">{fmtWhen(sale.soldAt)}</span>
                      </div>
                    )
                  })}
                  {recentDeliveries.map((d) => {
                    const farmer = s.farmers.find((f) => f.id === d.farmerId)
                    return (
                      <div className="activity-item" key={d.id}>
                        <span className="activity-icon violet">▣</span>
                        <div className="activity-body">
                          <b>Delivery {d.deliveryCode} — {d.status}</b>
                          <span>{farmer ? `${farmer.firstName} ${farmer.lastName}` : '—'}</span>
                        </div>
                        <span className="activity-time">{fmtWhen(d.deliveryDate)}</span>
                      </div>
                    )
                  })}
                  {s.orders.slice(0, 3).map((o) => (
                    <div className="activity-item" key={o.id} onClick={() => navigate(`/orders/${o.id}`)} style={{ cursor: 'pointer' }}>
                      <span className="activity-icon blue">🛒</span>
                      <div className="activity-body">
                        <b>Order {o.orderCode} — {o.buyerName}</b>
                        <span>{o.items.length} product{o.items.length !== 1 ? 's' : ''} · {fmtMoney(o.totalRevenue)}</span>
                      </div>
                      <span className="activity-time">{fmtWhen(o.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div><h2>Quick actions</h2><p>Manage the system</p></div>
                </div>
                <div className="quick-action-row">
                  <Link className="quick-action-btn" to="/members">
                    <span className="quick-action-icon green">👤</span>
                    Manage members
                  </Link>
                  <Link className="quick-action-btn" to="/farmers">
                    <span className="quick-action-icon amber">👥</span>
                    Farmer directory
                  </Link>
                  <Link className="quick-action-btn" to="/deliveries">
                    <span className="quick-action-icon violet">▣</span>
                    All deliveries
                  </Link>
                  <Link className="quick-action-btn" to="/market">
                    <span className="quick-action-icon blue">📦</span>
                    Market inventory
                  </Link>
                  <Link className="quick-action-btn" to="/orders">
                    <span className="quick-action-icon amber">🛒</span>
                    All orders
                  </Link>
                  <Link className="quick-action-btn" to="/reports">
                    <span className="quick-action-icon violet">📊</span>
                    Reports
                  </Link>
                </div>
              </article>
            </div>

            <div className="overview-side">
              {needy.length > 0 && (
                <article className="panel">
                  <div className="panel-header">
                    <div><h2>Farmers to follow up</h2><p>{needy.length} need attention</p></div>
                    <Link className="text-button" to="/farmers">View all <span>→</span></Link>
                  </div>
                  <div className="activity-list">
                    {needy.slice(0, 4).map((row) => (
                      <div className="activity-item" key={row.farmerId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/farmers/${row.farmerId}`)}>
                        <span className="activity-icon amber">!</span>
                        <div className="activity-body">
                          <b>{row.farmerName}</b>
                          <span>{row.reasons[0]?.slice(0, 60)}{row.reasons[0]?.length > 60 ? '…' : ''}</span>
                        </div>
                        {row.daysSinceLastDelivery > 0 && (
                          <span className="activity-time">{row.daysSinceLastDelivery}d ago</span>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              )}

              {urgentItems.length > 0 && (
                <article className="panel">
                  <div className="panel-header">
                    <div><h2>Supply gaps</h2><p>Products short of demand</p></div>
                    <Link className="text-button" to="/demand">View all <span>→</span></Link>
                  </div>
                  <div className="demand-compact">
                    {urgentItems.map((item) => (
                      <div className="demand-compact-row" key={item.productId}>
                        <span className="emoji">{item.emoji}</span>
                        <span className="name">{item.name}</span>
                        <ProgressBar pct={item.requested > 0 ? (item.available / item.requested) * 100 : 100} tone="violet" />
                        <span className="gap urgent">{fmtNum(item.gap)} kg</span>
                      </div>
                    ))}
                  </div>
                </article>
              )}

              <article className="panel">
                <div className="panel-header">
                  <div><h2>Hub comparison</h2><p>Performance across hubs</p></div>
                </div>
                {s.hubs.filter((h) => h.status === 'Active').map((h) => {
                  const stats = selectHubStats(s, h.id)
                  return (
                    <div key={h.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{h.name} — {h.municipality}</div>
                      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)' }}>
                        <span>{stats.deliveryCount} deliveries</span>
                        <span>{fmtMoney(stats.totalSold)} sold</span>
                        <span>{stats.completedCount} completed</span>
                      </div>
                    </div>
                  )
                })}
              </article>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ STAFF A DASHBOARD ═══════════════ */}
      {role === 'Staff A' && hubStats && (
        <>
          <section className="overview-kpi-strip" aria-label="Hub A overview">
            <article className="kpi-card kpi-violet">
              <div className="kpi-top"><span>Active farmers</span><span className="kpi-icon violet">👥</span></div>
              <strong>{s.farmers.filter((f) => f.status === 'Active').length}</strong>
              <div className="kpi-meta"><span className="neutral">registered</span></div>
            </article>
            <article className="kpi-card kpi-amber">
              <div className="kpi-top"><span>In transit</span><span className="kpi-icon amber">→</span></div>
              <strong>{hubStats.onTheWayCount}</strong>
              <div className="kpi-meta"><span className="neutral">sent to Hub B</span></div>
            </article>
            <article className="kpi-card kpi-blue">
              <div className="kpi-top"><span>Pending reviews</span><span className="kpi-icon blue">↩</span></div>
              <strong>{pendingReturns.length}</strong>
              <div className="kpi-meta"><span className="neutral">return requests</span></div>
            </article>
            <article className="kpi-card kpi-green">
              <div className="kpi-top"><span>Farmer revenue</span><span className="kpi-icon green">₱</span></div>
              <strong>{fmtMoney(totalFarmerRevenue)}</strong>
              <div className="kpi-meta"><span className="neutral">from allocations</span></div>
            </article>
          </section>

          <div className="overview-body">
            <div className="overview-main">
              {pendingReturns.length > 0 && (
                <article className="panel">
                  <div className="panel-header">
                    <div><h2>Pending return reviews</h2><p>{pendingReturns.length} need your approval</p></div>
                    <Link className="text-button" to="/returns">View all <span>→</span></Link>
                  </div>
                  <div className="activity-list">
                    {pendingReturns.slice(0, 4).map((rr) => {
                      const order = s.orders.find((o) => o.id === rr.orderId)
                      return (
                        <div className="activity-item" key={rr.id} onClick={() => navigate(`/returns/${rr.id}`)} style={{ cursor: 'pointer' }}>
                          <span className="activity-icon amber">↩</span>
                          <div className="activity-body">
                            <b>{rr.returnCode} — {rr.returnType}</b>
                            <span>Order {order?.orderCode ?? '—'} · {rr.items.length} product{rr.items.length !== 1 ? 's' : ''} · {rr.reason.slice(0, 40)}{rr.reason.length > 40 ? '…' : ''}</span>
                          </div>
                          <span className="activity-time">{fmtWhen(rr.createdAt)}</span>
                        </div>
                      )
                    })}
                  </div>
                </article>
              )}

              <article className="panel">
                <div className="panel-header">
                  <div><h2>My sent deliveries</h2><p>Groups sent to Hub B</p></div>
                  <Link className="text-button" to="/deliveries">View all <span>→</span></Link>
                </div>
                <div className="activity-list">
                  {mySentGroups.length === 0 ? (
                    <p className="text-sm text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>No deliveries sent yet.</p>
                  ) : (
                    mySentGroups.slice(0, 4).map((g) => (
                      <div className="activity-item" key={g.id} onClick={() => navigate(`/deliveries/${g.id}`)} style={{ cursor: 'pointer' }}>
                        <span className={`activity-icon ${g.status === 'Received' ? 'green' : 'amber'}`}>▣</span>
                        <div className="activity-body">
                          <b>{g.groupCode}</b>
                          <span>{g.status} · {fmtWhen(g.sentAt ?? g.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div><h2>Quick actions</h2><p>Hub A operations</p></div>
                </div>
                <div className="quick-action-row">
                  <button className="quick-action-btn" onClick={() => setShowDelivery(true)}>
                    <span className="quick-action-icon violet">▣</span>
                    New delivery
                  </button>
                  <Link className="quick-action-btn" to="/farmers">
                    <span className="quick-action-icon amber">👥</span>
                    Farmer directory
                  </Link>
                  <Link className="quick-action-btn" to="/returns">
                    <span className="quick-action-icon blue">↩</span>
                    Review returns
                  </Link>
                  <Link className="quick-action-btn" to="/settlements">
                    <span className="quick-action-icon green">₱</span>
                    Settlements
                  </Link>
                </div>
              </article>
            </div>

            <div className="overview-side">
              <article className="panel">
                <div className="panel-header">
                  <div><h2>Farmer performance</h2><p>Top contributors</p></div>
                  <Link className="text-button" to="/farmers">View all <span>→</span></Link>
                </div>
                <div className="activity-list">
                  {s.farmers.filter((f) => f.status === 'Active').slice(0, 4).map((f) => {
                    const stats = selectFarmerStats(s, f.id)
                    return (
                      <div className="activity-item" key={f.id} onClick={() => navigate(`/farmers/${f.id}`)} style={{ cursor: 'pointer' }}>
                        <span className="activity-icon violet">{f.firstName[0]}{f.lastName[0]}</span>
                        <div className="activity-body">
                          <b>{f.firstName} {f.lastName}</b>
                          <span>{fmtNum(stats.supplied)} kg supplied · {fmtNum(stats.sold)} kg sold · {fmtMoney(stats.actualValue)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>

              {urgentItems.length > 0 && (
                <article className="panel">
                  <div className="panel-header">
                    <div><h2>Supply gaps</h2><p>Products short of demand</p></div>
                    <Link className="text-button" to="/demand">Details <span>→</span></Link>
                  </div>
                  <div className="demand-compact">
                    {urgentItems.map((item) => (
                      <div className="demand-compact-row" key={item.productId}>
                        <span className="emoji">{item.emoji}</span>
                        <span className="name">{item.name}</span>
                        <ProgressBar pct={item.requested > 0 ? (item.available / item.requested) * 100 : 100} tone="violet" />
                        <span className="gap urgent">{fmtNum(item.gap)} kg</span>
                      </div>
                    ))}
                  </div>
                </article>
              )}

              <article className="panel">
                <div className="panel-header">
                  <div><h2>Inventory status</h2><p>Products at your hub</p></div>
                  <Link className="text-button" to="/market">Details <span>→</span></Link>
                </div>
                <div className="demand-compact">
                  {aggregated.slice(0, 5).map((ap) => (
                    <div className="demand-compact-row" key={ap.productId}>
                      <span className="emoji">{ap.emoji}</span>
                      <span className="name">{ap.name}</span>
                      <ProgressBar pct={ap.totalDelivered > 0 ? (ap.totalSold / ap.totalDelivered) * 100 : 0} tone="green" />
                      <span className="gap">{fmtNum(ap.totalRemaining)} {ap.unit}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ STAFF B DASHBOARD ═══════════════ */}
      {role === 'Staff B' && hubStats && (
        <>
          <section className="overview-kpi-strip" aria-label="Hub B overview">
            <article className="kpi-card kpi-green">
              <div className="kpi-top"><span>Products available</span><span className="kpi-icon green">📦</span></div>
              <strong>{availableProducts.length}</strong>
              <div className="kpi-meta"><span className="neutral">ready to sell</span></div>
            </article>
            <article className="kpi-card kpi-amber">
              <div className="kpi-top"><span>Incoming</span><span className="kpi-icon amber">🚚</span></div>
              <strong>{incomingGroups.length}</strong>
              <div className="kpi-meta"><span className="neutral">delivery groups</span></div>
            </article>
            <article className="kpi-card kpi-blue">
              <div className="kpi-top"><span>Today's orders</span><span className="kpi-icon blue">🛒</span></div>
              <strong>{todayOrders.length}</strong>
              <div className="kpi-meta"><span className="neutral">{fmtMoney(todayRevenue)} revenue</span></div>
            </article>
            <article className="kpi-card kpi-violet">
              <div className="kpi-top"><span>Total revenue</span><span className="kpi-icon violet">₱</span></div>
              <strong>{fmtMoney(totals.actual)}</strong>
              <div className="kpi-meta"><span className="neutral">{totals.saleCount} transactions</span></div>
            </article>
          </section>

          <div className="overview-body">
            <div className="overview-main">
              {incomingGroups.length > 0 && (
                <article className="panel">
                  <div className="panel-header">
                    <div><h2>Incoming deliveries</h2><p>{incomingGroups.length} group{incomingGroups.length !== 1 ? 's' : ''} to receive</p></div>
                    <Link className="text-button" to="/deliveries">View all <span>→</span></Link>
                  </div>
                  <div className="activity-list">
                    {incomingGroups.map((g) => {
                      const originHub = s.hubs.find((h) => h.id === g.originHubId)
                      return (
                        <div className="activity-item" key={g.id} onClick={() => navigate(`/deliveries/${g.id}`)} style={{ cursor: 'pointer' }}>
                          <span className="activity-icon amber">🚚</span>
                          <div className="activity-body">
                            <b>{g.groupCode}</b>
                            <span>From {originHub?.name ?? 'Hub A'} · Sent {fmtWhen(g.sentAt ?? g.createdAt)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </article>
              )}

              <article className="panel">
                <div className="panel-header">
                  <div><h2>Recent orders</h2><p>Today's sales</p></div>
                  <Link className="text-button" to="/orders">View all <span>→</span></Link>
                </div>
                <div className="activity-list">
                  {s.orders.length === 0 ? (
                    <p className="text-sm text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>No orders yet. Create one from the Market page.</p>
                  ) : (
                    s.orders.slice(0, 4).map((o) => (
                      <div className="activity-item" key={o.id} onClick={() => navigate(`/orders/${o.id}`)} style={{ cursor: 'pointer' }}>
                        <span className="activity-icon blue">🛒</span>
                        <div className="activity-body">
                          <b>{o.orderCode} — {o.buyerName}</b>
                          <span>{o.items.length} product{o.items.length !== 1 ? 's' : ''} · {fmtMoney(o.totalRevenue)} · {o.paymentMethod}</span>
                        </div>
                        <span className="activity-time">{fmtWhen(o.createdAt)}</span>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div><h2>Quick actions</h2><p>Hub B operations</p></div>
                </div>
                <div className="quick-action-row">
                  <button className="quick-action-btn" onClick={() => setShowOrder(true)}>
                    <span className="quick-action-icon blue">🛒</span>
                    Create order
                  </button>
                  <Link className="quick-action-btn" to="/market">
                    <span className="quick-action-icon green">📦</span>
                    Market inventory
                  </Link>
                  <Link className="quick-action-btn" to="/deliveries">
                    <span className="quick-action-icon amber">🚚</span>
                    Incoming deliveries
                  </Link>
                  <Link className="quick-action-btn" to="/returns">
                    <span className="quick-action-icon violet">↩</span>
                    Returns
                  </Link>
                </div>
              </article>
            </div>

            <div className="overview-side">
              <article className="panel">
                <div className="panel-header">
                  <div><h2>Market inventory</h2><p>Products ready to sell</p></div>
                  <Link className="text-button" to="/market">View all <span>→</span></Link>
                </div>
                <div className="demand-compact">
                  {availableProducts.slice(0, 5).map((ap) => (
                    <div className="demand-compact-row" key={ap.productId}>
                      <span className="emoji">{ap.emoji}</span>
                      <span className="name">{ap.name}</span>
                      <ProgressBar pct={ap.totalDelivered > 0 ? (ap.totalSold / ap.totalDelivered) * 100 : 0} tone="green" />
                      <span className="gap">{fmtNum(ap.totalRemaining)} {ap.unit}</span>
                    </div>
                  ))}
                </div>
              </article>

              {myReturns.length > 0 && (
                <article className="panel">
                  <div className="panel-header">
                    <div><h2>My return requests</h2><p>{myReturns.length} submitted</p></div>
                    <Link className="text-button" to="/returns">View all <span>→</span></Link>
                  </div>
                  <div className="activity-list">
                    {myReturns.slice(0, 3).map((rr) => (
                      <div className="activity-item" key={rr.id} onClick={() => navigate(`/returns/${rr.id}`)} style={{ cursor: 'pointer' }}>
                        <span className={`activity-icon ${rr.status === 'Approved' ? 'green' : rr.status === 'Rejected' ? 'red' : 'amber'}`}>↩</span>
                        <div className="activity-body">
                          <b>{rr.returnCode}</b>
                          <span>{rr.status} · {rr.returnType}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              )}

              {urgentItems.length > 0 && (
                <article className="panel">
                  <div className="panel-header">
                    <div><h2>Demand gaps</h2><p>Products customers want</p></div>
                    <Link className="text-button" to="/demand">Details <span>→</span></Link>
                  </div>
                  <div className="demand-compact">
                    {urgentItems.map((item) => (
                      <div className="demand-compact-row" key={item.productId}>
                        <span className="emoji">{item.emoji}</span>
                        <span className="name">{item.name}</span>
                        <ProgressBar pct={item.requested > 0 ? (item.available / item.requested) * 100 : 100} tone="violet" />
                        <span className="gap urgent">{fmtNum(item.gap)} kg</span>
                      </div>
                    ))}
                  </div>
                </article>
              )}
            </div>
          </div>
        </>
      )}

      {showDelivery && <NewDeliveryModal open onClose={() => setShowDelivery(false)} />}
      {showOrder && <CreateOrderModal open onClose={() => setShowOrder(false)} />}
    </>
  )
}
