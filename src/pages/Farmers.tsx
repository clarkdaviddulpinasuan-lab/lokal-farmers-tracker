import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddFarmerModal } from '../components/actions'
import { EmptyState, StatusBadge } from '../components/ui'
import { fmtMoney, fmtNum } from '../lib/calc'
import { useAppState } from '../lib/store'

type FilterStatus = 'all' | 'Active' | 'Inactive'

export default function Farmers() {
  const state = useAppState()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [showAdd, setShowAdd] = useState(false)

  const q = query.trim().toLowerCase()
  const farmers = state.farmers.filter((f) => {
    if (filter !== 'all' && f.status !== filter) return false
    if (!q) return true
    return `${f.firstName} ${f.lastName}`.toLowerCase().includes(q)
      || f.barangay.toLowerCase().includes(q)
      || f.farmerCode.toLowerCase().includes(q)
  })

  const totalFarmers = state.farmers.length
  const activeFarmers = state.farmers.filter((f) => f.status === 'Active').length
  const barangays = new Set(state.farmers.map((f) => f.barangay)).size
  const totalDeliveries = state.deliveries.length

  return (
    <>
      <div className="directory-header">
        <div>
          <h1>Farmer directory</h1>
          <p>{totalFarmers} registered growers across {barangays} barangays.</p>
        </div>
        <button className="primary-button" onClick={() => setShowAdd(true)}><span>＋</span> Add farmer</button>
      </div>

      <section className="directory-stats-row" aria-label="Farmer statistics">
        <div className="directory-stat-card">
          <span className="directory-stat-icon violet">👥</span>
          <div className="directory-stat-info">
            <span>Total farmers</span>
            <b>{totalFarmers}</b>
          </div>
        </div>
        <div className="directory-stat-card">
          <span className="directory-stat-icon green">✓</span>
          <div className="directory-stat-info">
            <span>Active</span>
            <b>{activeFarmers}</b>
          </div>
        </div>
        <div className="directory-stat-card">
          <span className="directory-stat-icon amber">📍</span>
          <div className="directory-stat-info">
            <span>Barangays</span>
            <b>{barangays}</b>
          </div>
        </div>
        <div className="directory-stat-card">
          <span className="directory-stat-icon blue">▣</span>
          <div className="directory-stat-info">
            <span>Total deliveries</span>
            <b>{totalDeliveries}</b>
          </div>
        </div>
      </section>

      <div className="panel">
        <div className="directory-controls">
          <input className="search-input directory-search" placeholder="Search farmers by name, barangay or ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="filter-chips">
            {(['all', 'Active', 'Inactive'] as const).map((f) => (
              <button
                key={f}
                className={`filter-chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>
        {farmers.length === 0 ? (
          <EmptyState icon="🌾" title="No farmers found" copy="Try a different search, or add a new farmer." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Farmer</th><th>ID</th><th>Barangay</th><th>Deliveries</th><th>Sold</th><th>Revenue</th><th>Sell-through</th><th>Status</th></tr>
              </thead>
              <tbody>
                {farmers.map((farmer) => {
                  const deliveries = state.deliveries.filter((d) => d.farmerId === farmer.id).length
                  const batches = state.batches.filter((b) => b.farmerId === farmer.id)
                  const sold = batches.reduce((sum, b) => sum + b.quantitySold, 0)
                  const supplied = batches.reduce((sum, b) => sum + b.originalQuantity, 0)
                  const sellThrough = supplied > 0 ? Math.min(100, Math.round((sold / supplied) * 100)) : 0
                  const revenue = state.farmerAllocations.filter((fa) => fa.farmerId === farmer.id).reduce((sum, fa) => sum + fa.farmerPayout, 0)
                  return (
                    <tr key={farmer.id} onClick={() => navigate(`/farmers/${farmer.id}`)}>
                      <td>
                        <span className="farmer-cell">
                          <span className="mini-avatar">{(farmer.firstName[0] ?? '')}{(farmer.lastName[0] ?? '')}</span>
                          {farmer.firstName} {farmer.lastName}
                        </span>
                      </td>
                      <td className="lot-code"><b>{farmer.farmerCode}</b></td>
                      <td>{farmer.barangay}</td>
                      <td>{deliveries}</td>
                      <td><b>{fmtNum(sold)} kg</b></td>
                      <td><b>{fmtMoney(revenue)}</b></td>
                      <td>
                        <span className={`status ${sellThrough >= 60 ? 'stats-Active' : sellThrough >= 30 ? 'stats-Reserved' : 'stats-Inactive'}`}>
                          <i />
                          {sellThrough}%
                        </span>
                      </td>
                      <td><StatusBadge status={farmer.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddFarmerModal open onClose={() => setShowAdd(false)} />}
    </>
  )
}
