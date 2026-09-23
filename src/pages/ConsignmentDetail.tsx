import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RecordReturnModal, RecordSaleModal } from '../components/actions'
import { StatusBadge } from '../components/ui'
import {
  batchRemaining, farmerShareFor, fmtMoney, fmtNum, fmtWhen, labFeeFor, potentialValue,
} from '../lib/calc'
import { useAppState } from '../lib/store'

export default function ConsignmentDetail() {
  const { id } = useParams()
  const state = useAppState()
  const [showSale, setShowSale] = useState(false)
  const [showReturn, setShowReturn] = useState(false)

  const batch = state.batches.find((b) => b.id === id)
  if (!batch) return null

  const farmer = state.farmers.find((f) => f.id === batch.farmerId)
  const delivery = state.deliveries.find((d) => d.id === batch.deliveryId)
  const product = state.products.find((pr) => pr.id === batch.productId)
  const sales = state.sales.filter((s) => s.batchId === batch.id).sort((a, b) => (a.soldAt < b.soldAt ? 1 : -1))
  const returns = state.returns.filter((r) => r.batchId === batch.id).sort((a, b) => (a.returnedAt < b.returnedAt ? 1 : -1))
  const available = batchRemaining(batch)
  const soldValue = sales.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0)
  const farmerShareTotal = sales.reduce((sum, s) => sum + farmerShareFor(s.quantity, batch.farmerPrice), 0)
  const feeTotal = sales.reduce((sum, s) => sum + labFeeFor(s.quantity, batch.labFee), 0)
  const canSell = !['Sold', 'Returned', 'Closed'].includes(batch.status) && available > 0

  const steps: { time: string; label: string; sub: string; icon: string; current: boolean }[] = [
    { time: batch.receivedAt, label: 'Received', sub: `${fmtNum(batch.originalQuantity)} ${batch.unit}`, icon: '✓', current: false },
    { time: batch.receivedAt, label: 'Weighed', sub: `${batch.qualityGrade} verified`, icon: '✓', current: false },
    { time: batch.receivedAt, label: 'Priced', sub: `${fmtMoney(batch.marketPrice)} / ${batch.unit}`, icon: '✓', current: false },
    { time: delivery?.deliveryDate ?? batch.receivedAt, label: 'Delivered to General Luna Hub', sub: 'Hub inventory', icon: '✓', current: false },
    ...sales.map((s, i) => ({
      time: s.soldAt,
      label: `Sold ${fmtNum(s.quantity)} ${s.unit} · ${s.buyerName}`,
      sub: `${s.saleCode} · ${fmtMoney(farmerShareFor(s.quantity, batch.farmerPrice))} farmer`,
      icon: i === sales.length - 1 && returns.length === 0 && available === 0 ? '●' : '↗',
      current: false,
    })),
    ...returns.map((r) => ({
      time: r.returnedAt,
      label: `Returned ${fmtNum(r.quantity)} ${r.unit} · ${r.reason}`,
      sub: r.returnCode,
      icon: '↩',
      current: false,
    })),
  ]
  if (available > 0) {
    steps.push({ time: '', label: `${batch.status} · ${fmtNum(available)} ${batch.unit} remaining`, sub: 'Awaiting next movement', icon: '●', current: true })
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Consignment detail</p>
          <h1>{batch.batchCode}</h1>
          <p className="subheading">
            {product?.name ?? '—'} · {farmer ? `${farmer.firstName} ${farmer.lastName}` : '—'} · <StatusBadge status={batch.status} />
          </p>
        </div>
        <div className="heading-actions">
          <Link className="secondary-button" to="/market">← Market</Link>
          <button className="secondary-button" onClick={() => setShowReturn(true)} disabled={available <= 0}><span>↩</span> Return</button>
          <button className="primary-button" onClick={() => setShowSale(true)} disabled={!canSell}><span>↗</span> Record sale</button>
        </div>
      </div>

      <section className="consignment-top">
        <article className="panel consignment-photo">
          <span className="photo-emoji">{product?.emoji ?? '🍎'}</span>
          <div>
            <b>{product?.name ?? 'Product'}</b>
            <span className="subheading">Fresh harvest · {batch.qualityGrade} · received {fmtWhen(batch.receivedAt)}</span>
          </div>
        </article>

        <article className="panel pricing-card">
          <div className="panel-header"><div><h2>Pricing</h2><p>Fixed at intake, never rewritten retroactively</p></div></div>
          <div className="pricing-grid">
            <div className="stat-cell"><span>Farmer price</span><b>{fmtMoney(batch.farmerPrice)} <em>/{batch.unit}</em></b></div>
            <div className="stat-cell"><span>LokalLink fee</span><b>{fmtMoney(batch.labFee)} <em>/{batch.unit}</em></b></div>
            <div className="stat-cell"><span>Market price</span><b>{fmtMoney(batch.marketPrice)} <em>/{batch.unit}</em></b></div>
            <div className="stat-cell highlight"><span>Potential sales</span><b>{fmtMoney(potentialValue(batch))}</b></div>
          </div>
        </article>
      </section>

      <section className="consignment-grid">
        <article className="panel">
          <div className="panel-header"><div><h2>Movement record</h2><p>Sales and returns against this batch</p></div></div>
          <div className="stat-grid">
            <div className="stat-cell"><span>Available</span><b>{fmtNum(available)} {batch.unit}</b></div>
            <div className="stat-cell"><span>Sold</span><b>{fmtNum(batch.quantitySold)} {batch.unit}</b></div>
            <div className="stat-cell"><span>Returned</span><b>{fmtNum(batch.quantityReturned)} {batch.unit}</b></div>
          </div>
          <div className="stat-grid borders">
            <div className="stat-cell"><span>Actual sold value</span><b>{fmtMoney(soldValue)}</b></div>
            <div className="stat-cell"><span>Farmer earnings</span><b>{fmtMoney(farmerShareTotal)}</b></div>
            <div className="stat-cell"><span>LokalLink fees</span><b>{fmtMoney(feeTotal)}</b></div>
          </div>
          {sales.length === 0 && returns.length === 0 && (
            <p className="subheading move-note">No movements yet — record the first sale to start the journey.</p>
          )}
        </article>

        <article className="panel timeline-panel">
          <div className="panel-header">
            <div><h2>Consignment journey</h2><p>Full audit trail for {batch.batchCode}</p></div>
            <span className="sparkle">✦</span>
          </div>
          <div className="journey">
            {steps.map((step, index) => (
              <div className="journey-step" key={`${step.label}-${index}`}>
                <span className={step.current ? 'journey-dot current' : 'journey-dot'}>{step.icon}</span>
                <div><b>{step.label}</b><span>{step.sub}</span></div>
              </div>
            ))}
          </div>
        </article>
      </section>

      {showSale && <RecordSaleModal open onClose={() => setShowSale(false)} preselectBatchId={batch.id} />}
      {showReturn && <RecordReturnModal batch={batch} onClose={() => setShowReturn(false)} />}
    </>
  )
}