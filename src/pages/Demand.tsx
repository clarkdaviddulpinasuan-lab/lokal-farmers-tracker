import { Link } from 'react-router-dom'
import { EmptyState, MetricCard, PageHeading } from '../components/ui'
import { fmtNum, humanDate, nowISO } from '../lib/calc'
import { selectDemand, useAppState } from '../lib/store'

export default function Demand() {
  const state = useAppState()
  const rows = selectDemand(state)
  const totalRequested = rows.reduce((sum, r) => sum + r.requested, 0)
  const totalAvailable = rows.reduce((sum, r) => sum + r.available, 0)
  const urgent = rows.filter((r) => r.tone === 'urgent')
  const surplus = rows.filter((r) => r.tone === 'surplus')

  return (
    <>
      <PageHeading
        eyebrow={`${humanDate(nowISO())} · Demand planning`}
        title="Balance placement week demand"
        subtitle="Match what buyers have requested against current yard stock so farmers know exactly what to prioritize next delivery."
      />

      <section className="kpi-grid" aria-label="Demand overview">
        <MetricCard label="Requested" value={`${fmtNum(totalRequested)} kg`} icon="📋" tone="violet" meta={<span className="neutral">across all placements</span>} />
        <MetricCard label="Available" value={`${fmtNum(totalAvailable)} kg`} icon="📦" tone="green" meta={<span className="neutral">ready at the hub</span>} />
        <MetricCard label="Urgent gaps" value={fmtNum(urgent.length)} icon="⚡" tone="amber" meta={<span className="neutral">need top-up soon</span>} />
        <MetricCard label="Surplus lines" value={fmtNum(surplus.length)} icon="🌾" tone="blue" meta={<span className="neutral">push to the market</span>} />
      </section>

      {rows.length === 0 ? (
        <EmptyState icon="🍃" title="No demand recorded yet" copy="Add a delivery first — product demand and shortfalls will surface here once batches reach the hub." />
      ) : (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h4 className="eyebrow">Per-product</h4>
              <h2>Demand vs. available stock</h2>
              <p className="subheading">Gap is positive when stock exceeds the week&apos;s placement request.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Requested</th>
                  <th>Available</th>
                  <th>Gap</th>
                  <th>Direction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.productId}>
                    <td><b className="product-name">{r.name}</b></td>
                    <td>{fmtNum(r.requested)} kg</td>
                    <td>{fmtNum(r.available)} kg</td>
                    <td>
                      <b className={r.gap < 0 ? 'negative' : 'positive'}>
                        {r.gap >= 0 ? '+' : ''}{fmtNum(r.gap)} kg
                      </b>
                    </td>
                    <td>
                      <span className={`status demand-${r.tone}`}>
                        <i />
                        {r.tone === 'urgent' ? 'Short' : r.tone === 'surplus' ? 'Surplus' : 'Matched'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="demand-note">
        <span>💡 What to do next</span>
        <p>
          {urgent.length > 0 ? (
            <>Prioritize <b>{urgent.map((u) => u.name).join(', ')}</b> for the next collection so placement requests can be honored.</>
          ) : (
            <>Everything requested is covered — focus on moving surplus through the <Link to="/market">market</Link>.</>
          )}
        </p>
      </section>
    </>
  )
}
