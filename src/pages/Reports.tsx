import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, EmptyState, MetricCard, StatusBadge, TrendChart } from '../components/ui'
import { fmtMoney, fmtNum } from '../lib/calc'
import { selectFarmerAttention, selectSalesTrend, selectTotals, useAppState } from '../lib/store'

type Tab = 'revenue' | 'produce' | 'farmers' | 'attention'

export default function Reports() {
  const state = useAppState()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('revenue')
  const totals = selectTotals(state)
  const attention = selectFarmerAttention(state)
  const trend = selectSalesTrend(state, 'Month')

  const needy = attention.filter((r) => r.needsAttention)
  const perItem = totals.potential > 0 ? (totals.actual / totals.potential) * 100 : 0

  const produceSales = state.products.map((product) => {
    const batches = state.batches.filter((b) => b.productId === product.id)
    const salesForProduct = state.sales.filter((s) => s.productId === product.id)
    const supplied = batches.reduce((sum, b) => sum + b.originalQuantity, 0)
    const sold = batches.reduce((sum, b) => sum + b.quantitySold, 0)
    const revenue = salesForProduct.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0)
    const sellThrough = supplied > 0 ? Math.min(100, Math.round((sold / supplied) * 100)) : 0
    return { id: product.id, name: product.name, emoji: product.emoji, supplied, sold, revenue, sellThrough }
  }).filter((p) => p.supplied > 0).sort((a, b) => b.revenue - a.revenue)

  const farmerRevenue = state.farmers.map((farmer) => {
    const farmerSales = state.sales.filter((s) => s.farmerId === farmer.id)
    const revenue = farmerSales.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0)
    const farmerShare = farmerSales.reduce((sum, s) => {
      const batch = state.batches.find((b) => b.id === s.batchId)
      return sum + s.quantity * (batch?.farmerPrice ?? 0)
    }, 0)
    const saleCount = farmerSales.length
    return { id: farmer.id, name: `${farmer.firstName} ${farmer.lastName}`, code: farmer.farmerCode, revenue, farmerShare, saleCount }
  }).filter((f) => f.saleCount > 0).sort((a, b) => b.revenue - a.revenue)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'produce', label: 'Produce sales' },
    { key: 'farmers', label: 'Farmer revenue' },
    { key: 'attention', label: 'Attention' },
  ]

  const initialsOf = (name: string) => {
    const parts = name.trim().split(/\s+/)
    return { first: parts[0] ?? '', last: parts[parts.length - 1] ?? '' }
  }

  function downloadCsv() {
    const rows: string[][] = [
      ['Report', 'Name', 'Supplied', 'Sold', 'Revenue'],
      ...produceSales.map((p) => ['Produce', p.name, String(p.supplied), String(p.sold), String(p.revenue)]),
      [''],
      ['Report', 'Farmer', 'Code', 'Sales', 'Revenue', 'Farmer share'],
      ...farmerRevenue.map((f) => ['Farmer revenue', f.name, f.code, String(f.saleCount), String(f.revenue), String(f.farmerShare)]),
      [''],
      ['Metric', 'Value'],
      ['Potential value', String(totals.potential)],
      ['Actual revenue', String(totals.actual)],
      ['Lab fees', String(totals.labFees)],
      ['Sell-through %', String(totals.sellThroughPct)],
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lokalink-reports-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="analytics-header">
        <div>
          <h1>Reports</h1>
          <p>Analytics across revenue, produce, and farmer performance.</p>
        </div>
        <button className="export-btn" onClick={downloadCsv}>↓ Export CSV</button>
      </div>

      <section className="analytics-kpis" aria-label="Performance totals">
        <MetricCard label="Potential value" value={fmtMoney(totals.potential)} icon="↗" tone="violet" meta={<span className="neutral">at stated market price</span>} />
        <MetricCard label="Realized" value={fmtMoney(totals.actual)} icon="◒" tone="green" meta={<span className="positive">{fmtNum(perItem)}% of potential</span>} />
        <MetricCard label="Sell-through" value={`${fmtNum(totals.sellThroughPct)}%`} icon="%" tone="blue" meta={<span className="neutral">of supplied quantity</span>} />
        <MetricCard label="Needs attention" value={fmtNum(needy.length)} icon="!" tone={needy.length > 0 ? 'amber' : 'green'} meta={<span className="neutral">{fmtNum(attention.length)} farmers tracked</span>} />
      </section>

      <nav className="analytics-tabs" aria-label="Report sections">
        {tabs.map((t) => (
          <button key={t.key} className={`analytics-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </nav>

      {tab === 'revenue' && (
        <div className="analytics-body">
          <div className="analytics-main">
            <article className="panel">
              <div className="panel-header">
                <div><h2>Sales trend</h2><p>Actual vs. potential value over time</p></div>
              </div>
              <TrendChart points={trend} />
            </article>
          </div>
          <div className="analytics-side">
            <article className="panel">
              <div className="panel-header">
                <div><h2>Revenue summary</h2><p>Key financial metrics</p></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="workspace-stat"><span>Gross potential</span><b>{fmtMoney(totals.potential)}</b></div>
                <div className="workspace-stat"><span>Actual revenue</span><b>{fmtMoney(totals.actual)}</b></div>
                <div className="workspace-stat"><span>Realization rate</span><b>{fmtNum(perItem)}%</b></div>
                <div className="workspace-stat"><span>LokalLink fees</span><b>{fmtMoney(totals.labFees)}</b></div>
                <div className="workspace-stat accent"><span>Pending payables</span><b>{fmtMoney(totals.payablesPending)}</b></div>
              </div>
            </article>
          </div>
        </div>
      )}

      {tab === 'produce' && (
        <div className="panel">
          <div className="panel-header">
            <div><h2>Produce sales report</h2><p>Performance by product type</p></div>
          </div>
          {produceSales.length === 0 ? (
            <EmptyState icon="📦" title="No produce sales yet" copy="Record sales to see product-level analytics here." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Supplied</th><th>Sold</th><th>Revenue</th><th>Sell-through</th></tr></thead>
                <tbody>
                  {produceSales.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.emoji} {p.name}</b></td>
                      <td>{fmtNum(p.supplied)} kg</td>
                      <td>{fmtNum(p.sold)} kg</td>
                      <td><b>{fmtMoney(p.revenue)}</b></td>
                      <td>
                        <span className={`status ${p.sellThrough >= 60 ? 'stats-Active' : p.sellThrough >= 30 ? 'stats-Reserved' : 'stats-Inactive'}`}>
                          <i />{p.sellThrough}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'farmers' && (
        <div className="panel">
          <div className="panel-header">
            <div><h2>Farmer revenue report</h2><p>Revenue by farmer, ranked by total sales value</p></div>
          </div>
          {farmerRevenue.length === 0 ? (
            <EmptyState icon="👥" title="No farmer sales yet" copy="Record sales to see farmer-level revenue analytics." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Farmer</th><th>Sales</th><th>Revenue</th><th>Farmer share</th></tr></thead>
                <tbody>
                  {farmerRevenue.map((f, i) => {
                    const nm = initialsOf(f.name)
                    return (
                      <tr key={f.id} onClick={() => navigate(`/farmers/${f.id}`)}>
                        <td><span className="farmer-rank-num">{i + 1}</span></td>
                        <td>
                          <span className="farmer-cell">
                            <Avatar first={nm.first} last={nm.last} size={28} />
                            <div className="farmer-row-main">
                              <span className="farmer-row-name">{f.name}</span>
                              <span className="farmer-row-meta">{f.code}</span>
                            </div>
                          </span>
                        </td>
                        <td>{f.saleCount}</td>
                        <td><b>{fmtMoney(f.revenue)}</b></td>
                        <td>{fmtMoney(f.farmerShare)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'attention' && (
        <div className="analytics-body">
          <div className="analytics-main">
            <article className="panel">
              <div className="panel-header">
                <div><h2>Farmers needing attention</h2><p>Ranked by urgency</p></div>
                <Link className="text-button" to="/farmers">View all <span>→</span></Link>
              </div>
              {needy.length === 0 ? (
                <EmptyState icon="✓" title="All caught up" copy="No farmer currently needs a follow-up." />
              ) : (
                <ul className="farmer-rank-list">
                  {needy.map((row, i) => {
                    const nm = initialsOf(row.farmerName)
                    return (
                      <li className="farmer-rank-item" key={row.farmerId} onClick={() => navigate(`/farmers/${row.farmerId}`)}>
                        <span className="farmer-rank-num">{i + 1}</span>
                        <Avatar first={nm.first} last={nm.last} size={32} />
                        <div className="farmer-rank-info">
                          <b>{row.farmerName}</b>
                          <span>{row.reasons[0]?.slice(0, 80)}{row.reasons[0]?.length > 80 ? '…' : ''}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <StatusBadge status="Needs attention" />
                          {row.daysSinceLastDelivery > 0 && (
                            <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>{row.daysSinceLastDelivery}d since delivery</div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </article>
          </div>
          <div className="analytics-side">
            <article className="panel">
              <div className="panel-header">
                <div><h2>Attention summary</h2><p>Overview of farmer health</p></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="workspace-stat"><span>Total farmers</span><b>{attention.length}</b></div>
                <div className="workspace-stat accent"><span>Need attention</span><b>{needy.length}</b></div>
                <div className="workspace-stat"><span>On track</span><b>{attention.length - needy.length}</b></div>
              </div>
            </article>
          </div>
        </div>
      )}
    </>
  )
}
