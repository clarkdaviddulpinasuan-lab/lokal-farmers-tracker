import { useState } from 'react'
import { ShoppingCart, Plus, Search } from 'lucide-react'
import { useAppState, selectAggregatedInventory } from '../lib/store'
import { CreateOrderModal } from '../components/actions'
import { fmtMoney } from '../lib/calc'

export default function Market() {
  const s = useAppState()
  const aggregated = selectAggregatedInventory(s)
  const [query, setQuery] = useState('')
  const [orderProductId, setOrderProductId] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = aggregated.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><ShoppingCart size={24} /> Market Inventory</h1>
          <p className="page-subtitle">{aggregated.length} product{aggregated.length !== 1 ? 's' : ''} available</p>
        </div>
      </div>

      <div className="search-bar">
        <Search size={16} />
        <input
          className="search-input"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={40} strokeWidth={1} />
          <p>No products available</p>
        </div>
      ) : (
        <div className="market-grid">
          {filtered.map((ap) => (
            <article key={ap.productId} className="market-product-card">
              <div className="market-product-header">
                <span className="market-product-emoji">{ap.emoji}</span>
                <div>
                  <h3 className="market-product-name">{ap.name}</h3>
                  <span className="market-product-unit">{ap.unit}</span>
                </div>
              </div>
              <div className="market-product-stats">
                <div className="market-stat">
                  <span className="market-stat-label">Available</span>
                  <span className="market-stat-value">{ap.totalRemaining} {ap.unit}</span>
                </div>
                <div className="market-stat">
                  <span className="market-stat-label">Sold</span>
                  <span className="market-stat-value">{ap.totalSold} {ap.unit}</span>
                </div>
                <div className="market-stat">
                  <span className="market-stat-label">Revenue</span>
                  <span className="market-stat-value">{fmtMoney(ap.totalRevenue)}</span>
                </div>
                <div className="market-stat">
                  <span className="market-stat-label">Avg Price</span>
                  <span className="market-stat-value">{fmtMoney(ap.averageMarketPrice)}/{ap.unit}</span>
                </div>
              </div>
              {ap.totalRemaining > 0 && (
                <button
                  className="btn btn-primary btn-sm market-order-btn"
                  onClick={() => setOrderProductId(ap.productId)}
                >
                  <Plus size={14} /> Create Order
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {orderProductId && (
        <CreateOrderModal
          open
          onClose={() => setOrderProductId(null)}
          preselectedProductId={orderProductId}
        />
      )}
    </div>
  )
}
