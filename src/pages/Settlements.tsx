import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MetricCard, StatusBadge } from '../components/ui'
import { farmerShareFor, fmtMoney, fmtNum } from '../lib/calc'
import { farmerPendingPayable, generateSettlement, markPaid, useAppState } from '../lib/store'

export default function Settlements() {
  const state = useAppState()
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const pendingTotal = state.farmers.reduce((sum, f) => sum + farmerPendingPayable(state, f.id), 0)
  const paidTotal = state.settlements.filter((st) => st.status === 'Paid').reduce((sum, st) => sum + st.payable, 0)
  const pendingCount = state.settlements.filter((st) => st.status !== 'Paid' && st.status !== 'Cancelled').length
  const farmersWithBalance = state.farmers.filter((f) => farmerPendingPayable(state, f.id) > 0 || state.settlements.some((st) => st.farmerId === f.id))

  async function runAction(id: string, action: () => Promise<unknown>) {
    setError('')
    setBusyId(id)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Settlement action failed.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <>
      <div className="settlement-header">
        <div>
          <h1>Farmer settlements</h1>
          <p>Payments built from actual sold units — never from potential sales.</p>
        </div>
      </div>

      {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}

      <section className="settlement-kpis" aria-label="Settlement totals">
        <MetricCard label="Total payable" value={fmtMoney(pendingTotal)} icon="₱" tone="amber" meta={<span className="neutral"><b>{pendingCount}</b> pending settlements</span>} />
        <MetricCard label="Paid to farmers" value={fmtMoney(paidTotal)} icon="✓" tone="green" meta={<span className="positive">on record</span>} />
        <MetricCard label="Farmers settled" value={fmtNum(state.settlements.length)} icon="👥" tone="violet" meta={<span className="neutral">statements</span>} />
        <MetricCard label="LokalLink fees" value={fmtMoney(state.sales.reduce((sum, s) => { const b = state.batches.find((x) => x.id === s.batchId); return sum + (b ? s.quantity * b.labFee : 0) }, 0))} icon="◒" tone="blue" meta={<span className="neutral">fees earned</span>} />
      </section>

      {farmersWithBalance.length === 0 ? (
        <div className="panel"><p className="text-sm text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>All farmer settlements are up to date.</p></div>
      ) : (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {farmersWithBalance.map((farmer) => {
            const payable = farmerPendingPayable(state, farmer.id)
            const open = state.settlements.find((st) => st.farmerId === farmer.id && st.status !== 'Paid' && st.status !== 'Cancelled')
            const paid = state.settlements.find((st) => st.farmerId === farmer.id && st.status === 'Paid')
            const soldValue = state.sales
              .filter((s) => s.farmerId === farmer.id)
              .reduce((sum, s) => sum + farmerShareFor(s.quantity, state.batches.find((b) => b.id === s.batchId)?.farmerPrice ?? 0), 0)
            return (
              <article className="settlement-card-enhanced" key={farmer.id}>
                <div className="settlement-card-top">
                  <span className="settlement-card-avatar">{(farmer.firstName[0] ?? '')}{(farmer.lastName[0] ?? '')}</span>
                  <div className="settlement-card-info">
                    <b>{farmer.firstName} {farmer.lastName}</b>
                    <span>{farmer.farmerCode} · total sold {fmtMoney(soldValue)}</span>
                  </div>
                  {open && <StatusBadge status={open.status} />}
                </div>
                <div className="settlement-card-numbers">
                  <div className="settlement-num"><span>Pending payable</span><b>{fmtMoney(payable)}</b></div>
                  <div className="settlement-num"><span>Last settled</span><b>{paid ? fmtMoney(paid.payable) : '—'}</b></div>
                  <div className="settlement-num"><span>Status</span><b>{open ? open.status : payable > 0 ? 'Unsettled' : 'Settled'}</b></div>
                </div>
                <div className="settlement-card-actions">
                  <Link className="secondary-button" to={`/settlements/${farmer.id}`}>View statement <span>→</span></Link>
                  {open ? (
                    <button
                      className="primary-button"
                      disabled={busyId === open.id}
                      onClick={() => runAction(open.id, () => markPaid(open.id, 'Cash'))}
                    >
                      {busyId === open.id ? 'Saving…' : 'Mark as paid (Cash)'} <span>✓</span>
                    </button>
                  ) : payable > 0 ? (
                    <button
                      className="primary-button"
                      disabled={busyId === farmer.id}
                      onClick={() => runAction(farmer.id, () => generateSettlement(farmer.id))}
                    >
                      {busyId === farmer.id ? 'Saving…' : 'Generate statement'} <span>→</span>
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </>
  )
}
