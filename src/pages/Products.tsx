import { useState } from 'react'
import { Package, Plus, Search } from 'lucide-react'
import { Modal } from '../components/ui'
import { addProduct } from '../lib/store'
import { useAppState } from '../lib/store'

const EMOJI_OPTIONS = ['🍅', '🍆', '🍌', '🥥', '🎃', '🥔', '🍠', '🌽', '🥬', '🫑', '🥕', '🧅', '🧄', '🍍', '🥭', '🍈', '西瓜', '🥑', '🫒', '🌶️']
const CATEGORY_OPTIONS = ['Vegetables', 'Fruits', 'Root crops', 'Herbs', 'Grains', 'Other']
const UNIT_OPTIONS = ['kg', 'pc', 'bundle', 'sack', 'tray']

export default function Products() {
  const s = useAppState()
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const q = query.trim().toLowerCase()
  const products = s.products.filter((p) => {
    if (!q) return true
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  })

  const categoryCounts = new Map<string, number>()
  for (const p of s.products) {
    categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Package size={24} /> Products</h1>
          <p className="page-subtitle">{s.products.length} product{s.products.length !== 1 ? 's' : ''} across {categoryCounts.size} categories</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add product
        </button>
      </div>

      <div className="search-bar">
        <Search size={16} />
        <input
          className="search-input"
          placeholder="Search products by name or category..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <Package size={40} strokeWidth={1} />
          <b>No products found</b>
          <p>{q ? 'Try a different search.' : 'Add your first product to get started.'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Default Unit</th>
                <th>Deliveries</th>
                <th>Batches</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const deliveries = s.deliveries.filter((d) =>
                  s.batches.some((b) => b.deliveryId === d.id && b.productId === product.id),
                ).length
                const batches = s.batches.filter((b) => b.productId === product.id).length
                return (
                  <tr key={product.id}>
                    <td>
                      <span className="farmer-cell">
                        <span className="market-product-emoji" style={{ width: 32, height: 32, fontSize: 18, borderRadius: 8 }}>{product.emoji}</span>
                        <span className="farmer-row-main">
                          <span className="farmer-row-name">{product.name}</span>
                        </span>
                      </span>
                    </td>
                    <td><span className="badge badge-gray">{product.category}</span></td>
                    <td>{product.defaultUnit}</td>
                    <td>{deliveries}</td>
                    <td>{batches}</td>
                    <td><span className="status stats-Active"><i />Active</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddProductModal open onClose={() => setShowAdd(false)} />}
    </>
  )
}

function AddProductModal({ onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '',
    category: 'Vegetables',
    defaultUnit: 'kg',
    emoji: '🍅',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Product name is required.'); return }
    setBusy(true)
    try {
      await addProduct({ name: form.name.trim(), category: form.category, defaultUnit: form.defaultUnit, emoji: form.emoji })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save product.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal eyebrow="New product" title="Add a product" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Emoji</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => set('emoji', emoji)}
                style={{
                  width: 36, height: 36, fontSize: 18,
                  display: 'grid', placeItems: 'center',
                  border: form.emoji === emoji ? '2px solid var(--purple)' : '1px solid var(--border)',
                  borderRadius: 8, background: form.emoji === emoji ? 'var(--purple-soft)' : 'var(--surface)',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Product name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Tomatoes"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Default unit</label>
            <select className="form-input" value={form.defaultUnit} onChange={(e) => set('defaultUnit', e.target.value)}>
              {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Add product'}</button>
        </div>
      </form>
    </Modal>
  )
}
