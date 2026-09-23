import { useState } from 'react'
import type { FormEvent } from 'react'
import { batchRemaining, farmerShareFor, fmtMoney, fmtNum, labFeeFor, saleSubtotal } from '../lib/calc'
import {
  addFarmer, createDeliveryGroup, createOrder, createReturnRequest, isSellableBatch,
  recordReturn, recordSale, selectAggregatedInventory, useAppState,
} from '../lib/store'
import type { Batch, Sale } from '../types'
import { Field, FormError, Modal } from './ui'

const BUYERS = ['Walk-in customer', 'Harana Kitchen', 'Bravo Restaurant', 'Mom\u2019s Kitchen', 'Casa del Sol']

function productName(state: ReturnType<typeof useAppState>, id: string): string {
  return state.products.find((pr) => pr.id === id)?.name ?? 'Product'
}

export function RecordSaleModal({ open, onClose, preselectBatchId }: { open: boolean; onClose: () => void; preselectBatchId?: string }) {
  const state = useAppState()
  const [batchId, setBatchId] = useState(preselectBatchId ?? '')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [buyer, setBuyer] = useState(BUYERS[0])
  const [payment, setPayment] = useState<Sale['paymentMethod']>('Cash')
  const [error, setError] = useState('')
  const [sale, setSale] = useState<Sale | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null
  const sellable = state.batches.filter((b) => isSellableBatch(state, b))
  const batch = sellable.find((b) => b.id === (batchId || preselectBatchId))
  const available = batch ? batchRemaining(batch) : 0
  const qty = Number(quantity)
  const price = Number(unitPrice || batch?.marketPrice)
  const subtotal = Number.isFinite(qty) && Number.isFinite(price) ? saleSubtotal({ quantity: qty, unitPrice: price }) : 0
  const share = batch && Number.isFinite(qty) ? farmerShareFor(qty, batch.farmerPrice) : 0
  const fee = batch && Number.isFinite(qty) ? labFeeFor(qty, batch.labFee) : 0

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!batchId && !preselectBatchId) {
      setError('Choose a product or batch to sell.')
      return
    }
    setBusy(true)
    try {
      const made = await recordSale({
        batchId: batchId || (preselectBatchId as string),
        quantity: qty,
        unitPrice: price,
        buyerName: buyer,
        paymentMethod: payment,
      })
      setSale(made)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the sale.')
    } finally {
      setBusy(false)
    }
  }

  function closeQuiet() {
    setSale(null)
    setError('')
    setQuantity('')
    onClose()
  }

  if (sale) {
    return (
      <Modal eyebrow="Sale confirmed" title={`Sale #${sale.saleCode}`} onClose={closeQuiet}>
        <div className="success-hero">
          <span className="success-check">✓</span>
          <b>{fmtMoney(saleSubtotal(sale))}</b>
          <p>{fmtNum(sale.quantity)} {sale.unit} to {sale.buyerName}</p>
        </div>
        <div className="sale-summary">
          <span>Market value <b>{fmtMoney(saleSubtotal(sale))}</b></span>
          <span>Farmer share <b>{fmtMoney(farmerShareFor(sale.quantity, batch?.farmerPrice ?? 0))}</b></span>
          <span>LokalLink fee <b>{fmtMoney(labFeeFor(sale.quantity, batch?.labFee ?? 0))}</b></span>
        </div>
        <p className="success-note">✓ Inventory updated · ✓ Farmer balance updated</p>
        <div className="modal-actions">
          <button className="primary-button" onClick={closeQuiet}>Done <span>✓</span></button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal eyebrow="Market workflow" title="Record a sale" copy="Sell from a tracked consignment and keep the farmer share visible." onClose={onClose}>
      <form onSubmit={submit}>
        {preselectBatchId ? (
          <div className="preselected">
            <span>{batch ? productName(state, batch.productId) : productName(state, batchId)}</span>
            <b>{batch?.batchCode ?? ''}</b>
          </div>
        ) : (
          <Field label="Product or batch">
            {sellable.length === 0 ? (
              <p className="inline-empty">No sellable inventory right now.</p>
            ) : (
              <select value={batchId} onChange={(e) => { setBatchId(e.target.value); setQuantity('') }}>
                <option value="">Choose a product or batch</option>
                {sellable.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchCode} · {productName(state, b.productId)} · {fmtNum(batchRemaining(b))} {b.unit} available
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        {batch && <p className="availability-note">Available: <b>{fmtNum(available)} {batch.unit}</b> · Farmer price {fmtMoney(batch.farmerPrice)}/{batch.unit}</p>}
        <div className="modal-row">
          <Field label="Quantity sold">
            <input type="number" min="0" step="0.1" placeholder="0.0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Unit">
            <select value={batch?.unit ?? 'kg'}>
              <option>{batch?.unit ?? 'kg'}</option>
            </select>
          </Field>
        </div>
        <Field label="Selling price">
          <input type="number" min="0" step="0.5" placeholder={`Default ${batch?.marketPrice ?? ''}`} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
        </Field>
        <Field label="Buyer">
          <select value={buyer} onChange={(e) => setBuyer(e.target.value)}>
            {BUYERS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Payment">
          <select value={payment} onChange={(e) => setPayment(e.target.value as Sale['paymentMethod'])}>
            <option>Cash</option>
            <option>On credit</option>
          </select>
        </Field>
        <div className="sale-summary">
          <span>Estimated sale <b>{fmtMoney(subtotal)}</b></span>
          <span>Farmer share <b>{fmtMoney(share)}</b></span>
          <span>LokalLink fee <b>{fmtMoney(fee)}</b></span>
        </div>
        <FormError message={error} />
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Confirm sale'} <span>✓</span></button>
        </div>
      </form>
    </Modal>
  )
}

interface ProductEntry {
  productId: string
  quantity: string
  unit: string
  grade: string
  farmerPrice: string
  labFee: string
}

interface FarmerEntry {
  farmerId: string
  products: ProductEntry[]
}

function freshProduct(products: ReturnType<typeof useAppState>['products']): ProductEntry {
  return { productId: products[0]?.id ?? '', quantity: '', unit: products[0]?.defaultUnit ?? 'kg', grade: 'Grade A', farmerPrice: '', labFee: '' }
}

function freshFarmer(products: ReturnType<typeof useAppState>['products']): FarmerEntry {
  return { farmerId: '', products: [freshProduct(products)] }
}

export function NewDeliveryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useAppState()
  const [farmers, setFarmers] = useState<FarmerEntry[]>(() => [freshFarmer(state.products)])
  const [location, setLocation] = useState('General Luna Hub')
  const [error, setError] = useState('')
  const [created, setCreated] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null
  const activeFarmers = state.farmers.filter((f) => f.status === 'Active')

  function updateFarmer(fi: number, key: keyof FarmerEntry, value: string) {
    setFarmers((prev) => prev.map((f, i) => i === fi ? { ...f, [key]: value } : f))
  }

  function updateProduct(fi: number, pi: number, key: keyof ProductEntry, value: string) {
    setFarmers((prev) => prev.map((f, i) => {
      if (i !== fi) return f
      return { ...f, products: f.products.map((p, j) => j === pi ? { ...p, [key]: value } : p) }
    }))
  }

  function setProductAndUnit(fi: number, pi: number, id: string) {
    updateProduct(fi, pi, 'productId', id)
    const pr = state.products.find((p) => p.id === id)
    if (pr) updateProduct(fi, pi, 'unit', pr.defaultUnit)
  }

  function addFarmer() {
    setFarmers((prev) => [...prev, freshFarmer(state.products)])
  }

  function removeFarmer(fi: number) {
    setFarmers((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== fi))
  }

  function addProduct(fi: number) {
    setFarmers((prev) => prev.map((f, i) => i === fi ? { ...f, products: [...f.products, freshProduct(state.products)] } : f))
  }

  function removeProduct(fi: number, pi: number) {
    setFarmers((prev) => prev.map((f, i) => {
      if (i !== fi) return f
      return { ...f, products: f.products.length <= 1 ? f.products : f.products.filter((_, j) => j !== pi) }
    }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const items: {
      farmerId: string
      productId: string
      quantity: number
      unit: string
      qualityGrade: string
      farmerPrice: number
      labFee: number
      marketPrice: number
    }[] = []
    try {
      for (const fe of farmers) {
        if (!fe.farmerId) throw new Error('Each farmer entry needs a farmer selected.')
        for (const pe of fe.products) {
          const qty = Number(pe.quantity)
          if (!pe.productId) throw new Error('Each product entry needs a product selected.')
          if (!qty || qty <= 0) throw new Error('Quantity must be greater than zero for every product.')
          items.push({
            farmerId: fe.farmerId,
            productId: pe.productId,
            quantity: qty,
            unit: pe.unit,
            qualityGrade: pe.grade,
            farmerPrice: Number(pe.farmerPrice),
            labFee: Number(pe.labFee),
            marketPrice: Number(pe.farmerPrice) + Number(pe.labFee),
          })
        }
      }
      setBusy(true)
      const result = await createDeliveryGroup({ items, collectionLocation: location })
      setCreated(result.groupCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the delivery group.')
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <Modal eyebrow="Delivery group created" title={created} onClose={() => { setCreated(null); onClose() }}>
        <div className="success-hero compact">
          <span className="success-check">✓</span>
          <b>{created} ready to send</b>
          <p>Deliveries were added to the pending group. Send it from the Deliveries list when ready.</p>
        </div>
        <div className="modal-actions">
          <button className="primary-button" onClick={() => { setCreated(null); onClose() }}>Done <span>✓</span></button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal eyebrow="New workflow" title="Receive a delivery" copy="Capture new consignments across farmers and products. Each farmer gets a separate delivery." onClose={onClose}>
      <form onSubmit={submit}>
        {farmers.map((fe, fi) => (
          <div key={fi} className="delivery-farmer-group">
            <div className="delivery-farmer-header">
              <span className="delivery-farmer-label">Farmer {farmers.length > 1 ? `${fi + 1}` : ''}</span>
              {farmers.length > 1 && (
                <button type="button" className="text-button danger" onClick={() => removeFarmer(fi)}><span>×</span> Remove</button>
              )}
            </div>
            <Field label="Farmer">
              {activeFarmers.length === 0 ? (
                <p className="inline-empty">No active farmers yet.</p>
              ) : (
                <select value={fe.farmerId} onChange={(e) => updateFarmer(fi, 'farmerId', e.target.value)}>
                  <option value="">Choose a farmer</option>
                  {activeFarmers.map((f) => <option key={f.id} value={f.id}>{f.firstName} {f.lastName}</option>)}
                </select>
              )}
            </Field>

            {fe.products.map((pe, pi) => (
              <div key={pi} className="delivery-product-group">
                <div className="delivery-product-header">
                  <span className="delivery-product-label">Product {fe.products.length > 1 ? pi + 1 : ''}</span>
                  {fe.products.length > 1 && (
                    <button type="button" className="text-button danger" onClick={() => removeProduct(fi, pi)}><span>×</span> Remove</button>
                  )}
                </div>
                <Field label="Product">
                  <select value={pe.productId} onChange={(e) => setProductAndUnit(fi, pi, e.target.value)}>
                    {state.products.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                  </select>
                </Field>
                <div className="modal-row">
                  <Field label="Quantity">
                    <input type="number" min="0" step="0.1" placeholder="0.0" value={pe.quantity} onChange={(e) => updateProduct(fi, pi, 'quantity', e.target.value)} />
                  </Field>
                  <Field label="Unit">
                    <select value={pe.unit} onChange={(e) => updateProduct(fi, pi, 'unit', e.target.value)}>
                      {['kg', 'g', 'piece', 'bundle', 'crate', 'sack', 'bottle', 'tray', 'box'].map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Quality grade">
                  <select value={pe.grade} onChange={(e) => updateProduct(fi, pi, 'grade', e.target.value)}>
                    <option>Grade A</option>
                    <option>Grade B</option>
                    <option>Grade C</option>
                    <option>Premium</option>
                  </select>
                </Field>
                <div className="modal-row">
                  <Field label="Farmer price">
                    <input type="number" min="0" step="0.5" placeholder="₱ / unit" value={pe.farmerPrice} onChange={(e) => updateProduct(fi, pi, 'farmerPrice', e.target.value)} />
                  </Field>
                  <Field label="LokalLink fee">
                    <input type="number" min="0" step="0.5" placeholder="₱ / unit" value={pe.labFee} onChange={(e) => updateProduct(fi, pi, 'labFee', e.target.value)} />
                  </Field>
                </div>
                <div className="auto-price-row">
                  <span>Market price</span>
                  <b>{fmtMoney(Number(pe.farmerPrice || 0) + Number(pe.labFee || 0))}</b>
                </div>
              </div>
            ))}
            <button type="button" className="text-button add-product-btn" onClick={() => addProduct(fi)}><span>+</span> Add product</button>
          </div>
        ))}

        <button type="button" className="secondary-button add-farmer-btn" onClick={addFarmer}><span>+</span> Add another farmer</button>

        <Field label="Collection location">
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <div className="projected-revenue">
          <span>Projected revenue</span>
          <b>{fmtMoney(farmers.reduce((total, fe) =>
            total + fe.products.reduce((sum, pe) => {
              const qty = Number(pe.quantity)
              const market = Number(pe.farmerPrice || 0) + Number(pe.labFee || 0)
              return sum + (Number.isFinite(qty) ? qty * market : 0)
            }, 0), 0))}</b>
        </div>
        <FormError message={error} />
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? 'Saving…' : `Create consignment${farmers.some((f) => f.products.length > 1 || farmers.length > 1) ? 's' : ''}`} <span>→</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function AddFarmerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', age: '', gender: 'Female', address: '', barangay: '', municipality: 'General Luna', phone: '' })
  const [error, setError] = useState('')
  const [created, setCreated] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open) return null

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Full name is required.')
      return
    }
    setBusy(true)
    try {
      await addFarmer({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        age: Number(form.age) || 0,
        gender: form.gender,
        address: form.address.trim(),
        barangay: form.barangay.trim(),
        municipality: form.municipality.trim(),
        phone: form.phone.trim(),
      })
      setCreated(`${form.firstName.trim()} ${form.lastName.trim()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the farmer.')
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <Modal eyebrow="Farmer directory" title="Farmer added" onClose={() => { setCreated(''); onClose() }}>
        <div className="success-hero compact">
          <span className="success-check">✓</span>
          <b>{created}</b>
          <p>Now ready to receive deliveries.</p>
        </div>
        <div className="modal-actions">
          <button className="primary-button" onClick={() => { setCreated(''); onClose() }}>Done <span>✓</span></button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal eyebrow="Farmer directory" title="Add a farmer" copy="Create a profile so their consignments stay traceable from the first delivery." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-row">
          <Field label="First name"><input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
          <Field label="Last name"><input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></Field>
        </div>
        <div className="modal-row">
          <Field label="Age"><input type="number" value={form.age} onChange={(e) => set('age', e.target.value)} /></Field>
          <Field label="Gender">
            <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option>Female</option>
              <option>Male</option>
            </select>
          </Field>
        </div>
        <Field label="Address"><input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Purok / sitio" /></Field>
        <div className="modal-row">
          <Field label="Barangay"><input value={form.barangay} onChange={(e) => set('barangay', e.target.value)} /></Field>
          <Field label="Municipality"><input value={form.municipality} onChange={(e) => set('municipality', e.target.value)} /></Field>
        </div>
        <Field label="Contact number"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="09xx xxx xxxx" /></Field>
        <FormError message={error} />
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Add farmer'} <span>→</span></button>
        </div>
      </form>
    </Modal>
  )
}

export function RecordReturnModal({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('Unsold')
  const [condition, setCondition] = useState('Good')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)
  const available = batchRemaining(batch)
  const qty = Number(quantity)

  if (done) {
    return (
      <Modal eyebrow="Return recorded" title={done} onClose={onClose}>
        <div className="success-hero compact">
          <span className="success-check">✓</span>
          <b>{fmtNum(qty)} {batch.unit} returned</b>
          <p>Remaining stock and farmer balance updated.</p>
        </div>
        <div className="modal-actions">
          <button className="primary-button" onClick={onClose}>Done <span>✓</span></button>
        </div>
      </Modal>
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await recordReturn({ batchId: batch.id, quantity: qty, reason, condition })
      setDone(`Batch ${batch.batchCode}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the return.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal eyebrow="Market workflow" title="Return unsold produce" copy={`Return stays linked to ${batch.batchCode} and reduces what the farmer is billed for.`} onClose={onClose}>
      <div className="preselected">
        <span>{batch.batchCode}</span>
        <b>{fmtNum(available)} {batch.unit} remaining</b>
      </div>
      <form onSubmit={submit}>
        <Field label="Quantity to return">
          <input type="number" min="0" step="0.1" placeholder={`Max ${fmtNum(available)}`} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <div className="modal-row">
          <Field label="Reason">
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option>Unsold</option>
              <option>Spoiled</option>
              <option>Damaged</option>
              <option>Buyer cancelled</option>
            </select>
          </Field>
          <Field label="Condition">
            <select value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option>Good</option>
              <option>Minor damage</option>
              <option>Unsellable</option>
            </select>
          </Field>
        </div>
        <FormError message={error} />
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="primary-button danger-button" disabled={busy}>{busy ? 'Saving…' : 'Record return'} <span>↩</span></button>
        </div>
      </form>
    </Modal>
  )
}

// ── Create Order Modal ───────────────────────────────────────────────────────

interface OrderLine {
  productId: string
  quantity: string
  unitPrice: string
}

export function CreateOrderModal({ open, onClose, preselectedProductId }: { open: boolean; onClose: () => void; preselectedProductId?: string }) {
  const s = useAppState()
  const aggregated = selectAggregatedInventory(s)
  const [buyerName, setBuyerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'On credit'>('Cash')
  const [lines, setLines] = useState<OrderLine[]>(() => [
    { productId: preselectedProductId ?? '', quantity: '', unitPrice: '' },
  ])
  const [error, setError] = useState('')
  const [created, setCreated] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  function updateLine(i: number, key: keyof OrderLine, value: string) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)))
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: '', quantity: '', unitPrice: '' }])
  }

  function removeLine(i: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  function getAvailable(productId: string): number {
    const ap = aggregated.find((a) => a.productId === productId)
    return ap?.totalRemaining ?? 0
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!buyerName.trim()) { setError('Buyer name is required.'); return }
    setBusy(true)
    try {
      const order = await createOrder({
        buyerName: buyerName.trim(),
        paymentMethod,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice || (aggregated.find((a) => a.productId === l.productId)?.averageMarketPrice ?? 0)),
        })),
      })
      setCreated(order.orderCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create order.')
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <Modal eyebrow="Order created" title={created} onClose={() => { setCreated(null); onClose() }}>
        <div className="success-hero compact">
          <span className="success-check">✓</span>
          <b>Order {created} confirmed</b>
          <p>Farmer allocations computed automatically.</p>
        </div>
        <div className="modal-actions">
          <button className="primary-button" onClick={() => { setCreated(null); onClose() }}>Done <span>✓</span></button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal eyebrow="New order" title="Create an order" copy="Select products and quantities. The system will auto-allocate across farmer batches." onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Buyer name">
          <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="e.g. Harana Kitchen" />
        </Field>
        <Field label="Payment method">
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'On credit')}>
            <option>Cash</option>
            <option>On credit</option>
          </select>
        </Field>

        {lines.map((line, i) => {
          const ap = aggregated.find((a) => a.productId === line.productId)
          const avail = getAvailable(line.productId)
          return (
            <div key={i} className="order-line">
              <div className="order-line-header">
                <span className="order-line-label">Item {lines.length > 1 ? i + 1 : ''}</span>
                {lines.length > 1 && (
                  <button type="button" className="text-button danger" onClick={() => removeLine(i)}>Remove</button>
                )}
              </div>
              <Field label="Product">
                <select value={line.productId} onChange={(e) => updateLine(i, 'productId', e.target.value)}>
                  <option value="">Choose a product</option>
                  {aggregated.filter((a) => a.totalRemaining > 0).map((a) => (
                    <option key={a.productId} value={a.productId}>{a.emoji} {a.name} — {a.totalRemaining} {a.unit} available</option>
                  ))}
                </select>
              </Field>
              {ap && <p className="availability-note">Available: <b>{fmtNum(avail)} {ap.unit}</b></p>}
              <div className="modal-row">
                <Field label="Quantity">
                  <input type="number" min="0" step="0.1" placeholder={`Max ${fmtNum(avail)}`} value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} />
                </Field>
                <Field label="Unit price">
                  <input type="number" min="0" step="0.5" placeholder={`Default ${ap?.averageMarketPrice ?? ''}`} value={line.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} />
                </Field>
              </div>
            </div>
          )
        })}

        <button type="button" className="text-button add-product-btn" onClick={addLine}><span>+</span> Add another product</button>

        <div className="projected-revenue">
          <span>Order total</span>
          <b>{fmtMoney(lines.reduce((sum, l) => {
            const qty = Number(l.quantity)
            const price = Number(l.unitPrice || (aggregated.find((a) => a.productId === l.productId)?.averageMarketPrice ?? 0))
            return sum + (Number.isFinite(qty) ? qty * price : 0)
          }, 0))}</b>
        </div>
        <FormError message={error} />
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Confirm order'} <span>✓</span></button>
        </div>
      </form>
    </Modal>
  )
}

// ── Create Return Request Modal ──────────────────────────────────────────────

export function CreateReturnRequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useAppState()
  const [orderId, setOrderId] = useState('')
  const [items, setItems] = useState<{ productId: string; quantity: string }[]>([{ productId: '', quantity: '' }])
  const [returnType, setReturnType] = useState<'Normal' | 'Damaged'>('Normal')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [created, setCreated] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const order = s.orders.find((o) => o.id === orderId)
  const orderProducts = order
    ? order.items.map((item) => {
        const product = s.products.find((p) => p.id === item.productId)
        return { ...item, name: product?.name ?? item.productId, emoji: product?.emoji ?? '' }
      })
    : []

  function updateItem(i: number, key: 'productId' | 'quantity', value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: '', quantity: '' }])
  }

  function removeItem(i: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!orderId) { setError('Select an order.'); return }
    const validItems = items.filter((it) => it.productId && Number(it.quantity) > 0)
    if (validItems.length === 0) { setError('Add at least one product with a valid quantity.'); return }
    if (!reason.trim()) { setError('Reason is required.'); return }
    setBusy(true)
    try {
      await createReturnRequest({
        orderId,
        items: validItems.map((it) => ({ productId: it.productId, quantity: Number(it.quantity) })),
        returnType,
        reason: reason.trim(),
        notes: notes.trim(),
      })
      setCreated('Return request submitted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create return request.')
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <Modal eyebrow="Return request" title={created} onClose={() => { setCreated(null); onClose() }}>
        <div className="success-hero compact">
          <span className="success-check">✓</span>
          <b>{created}</b>
          <p>Staff A will review and process this request.</p>
        </div>
        <div className="modal-actions">
          <button className="primary-button" onClick={() => { setCreated(null); onClose() }}>Done <span>✓</span></button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal eyebrow="Return workflow" title="Create a return request" copy="Submit a return for Staff A review. You can add multiple products from the same order." onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Order">
          <select value={orderId} onChange={(e) => { setOrderId(e.target.value); setItems([{ productId: '', quantity: '' }]) }}>
            <option value="">Choose an order</option>
            {s.orders.map((o) => (
              <option key={o.id} value={o.id}>{o.orderCode} — {o.buyerName}</option>
            ))}
          </select>
        </Field>
        {order && (
          <>
            {items.map((item, i) => (
              <div key={i} className="order-line">
                <div className="order-line-header">
                  <span className="order-line-label">Item {items.length > 1 ? i + 1 : ''}</span>
                  {items.length > 1 && (
                    <button type="button" className="text-button danger" onClick={() => removeItem(i)}>Remove</button>
                  )}
                </div>
                <Field label="Product">
                  <select value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)}>
                    <option value="">Choose a product from this order</option>
                    {orderProducts.map((op) => (
                      <option key={op.productId} value={op.productId}>{op.emoji} {op.name} — {op.quantity} {op.unit} ordered</option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantity to return">
                  <input type="number" min="0" step="0.1" placeholder="0.0" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
                </Field>
              </div>
            ))}
            <button type="button" className="text-button add-product-btn" onClick={addItem}><span>+</span> Add another product</button>
          </>
        )}
        <Field label="Return type">
          <select value={returnType} onChange={(e) => setReturnType(e.target.value as 'Normal' | 'Damaged')}>
            <option>Normal</option>
            <option>Damaged</option>
          </select>
        </Field>
        <Field label="Reason">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being returned?" />
        </Field>
        <Field label="Notes (optional)">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." rows={2} />
        </Field>
        <FormError message={error} />
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Submit return request'} <span>↩</span></button>
        </div>
      </form>
    </Modal>
  )
}