import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState, MetricCard, PageHeading, StatusBadge } from '../components/ui'
import { fmtMoney, fmtNum, humanDate } from '../lib/calc'
import { farmerShareFor, saleSubtotal } from '../lib/calc'
import { generateSettlement, markPaid, salesForSettlement, selectFarmerStats, useAppState } from '../lib/store'
import type { Settlement } from '../types'

export default function SettlementDetail() {
  const { farmerId = '' } = useParams()
  const state = useAppState()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const farmer = state.farmers.find((f) => f.id === farmerId)
  if (!farmer) {
    return (
      <EmptyState
        icon="🧾"
        title="Farmer not found"
        copy="This farmer may have been removed. Go back to settlements and pick an active statement."
      />
    )
  }

  const stats = selectFarmerStats(state, farmer.id)
  const settlement = state.settlements.find(
    (st) => st.farmerId === farmerId && (st.status === 'Pending' || st.status === 'Paid'),
  )
  const pendingSales = salesForSettlement(state, farmerId)
  const statement: Settlement | null = settlement ?? null
  const lineItems = statement
    ? statement.items
    : pendingSales.map((sl) => ({
        saleId: sl.id,
        quantity: sl.quantity,
        farmerAmount: farmerShareFor(sl.quantity, 0),
      }))
  const paid = settlement?.status === 'Paid'

  async function handleGenerate() {
    setError('')
    setBusy(true)
    try {
      await generateSettlement(farmerId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the statement.')
    } finally {
      setBusy(false)
    }
  }

  async function handleMarkPaid() {
    if (!settlement) return
    setError('')
    setBusy(true)
    try {
      await markPaid(settlement.id, 'Cash')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark the settlement as paid.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeading
        eyebrow={`Settlement · ${farmer.farmerCode}`}
        title={`${farmer.firstName} ${farmer.lastName}`}
        subtitle={`${humanDate(state.settlements.find((st) => st.farmerId === farmerId)?.createdAt ?? '')} · ${stats.sold} kg sold · ${stats.deliveries} kg delivered`}
        actions={
          <Link className="secondary-button" to="/settlements">
            <span>←</span> All settlements
          </Link>
        }
      />

      {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}

      <section className="kpi-grid" aria-label="Statement totals">
        <MetricCard label="Gross sales" value={fmtMoney(stats.actualValue)} icon="💰" tone="green" meta={<span className="neutral">actual recorded value</span>} />
        <MetricCard label="Farmer share" value={fmtMoney(statement?.payable ?? 0)} icon="🤝" tone="violet" meta={<span className="neutral">70% of each sale</span>} />
        <MetricCard label="Pending payable" value={fmtMoney(stats.pendingPayable)} icon="⏳" tone="amber" meta={<span className="neutral">still owed to farmer</span>} />
        <MetricCard label="Settled" value={paid ? 'Yes' : 'No'} icon={paid ? '✅' : '🕑'} tone={paid ? 'blue' : 'gray'} meta={<span className="neutral">{settlement?.paymentMethod ?? 'awaiting payment'}</span>} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h4 className="eyebrow">Sales on this statement</h4>
            <h2>Line items</h2>
            <p className="subheading">Each sale contributes the farmer&apos;s share to this settlement.</p>
          </div>
          <div className="heading-actions">
            {!statement && pendingSales.length > 0 && (
              <button className="primary-button" disabled={busy} onClick={handleGenerate}>
                {busy ? 'Saving…' : 'Generate statement'} <span>→</span>
              </button>
            )}
            {statement && !paid && statement.id && (
              <button className="primary-button" disabled={busy} onClick={handleMarkPaid}>
                {busy ? 'Saving…' : 'Mark paid'} <span>✓</span>
              </button>
            )}
          </div>
        </div>
        {lineItems.length === 0 ? (
          <EmptyState icon="🧾" title="Nothing owed right now" copy="New sales will appear here and roll into the next auto-generated statement." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sale</th>
                  <th>Qty</th>
                  <th>Gross</th>
                  <th>Farmer share</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((it) => {
                  const sale = state.sales.find((sl) => sl.id === it.saleId)
                  return (
                    <tr key={it.saleId}>
                      <td><b className="product-name">{sale?.buyerName ?? '—'}</b></td>
                      <td>{fmtNum(it.quantity)}</td>
                      <td>{fmtMoney(sale ? saleSubtotal(sale) : 0)}</td>
                      <td><b>{fmtMoney(it.farmerAmount)}</b></td>
                      <td>{paid ? <StatusBadge status="Paid" /> : <StatusBadge status="Pending" />}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
