import { useState } from 'react'
import { RecordSaleModal } from '../components/actions'
import { EmptyState, PageHeading } from '../components/ui'
import { farmerShareFor, fmtMoney, fmtNum, fmtWhen, labFeeFor, humanDate, nowISO, saleSubtotal } from '../lib/calc'
import { useAppState } from '../lib/store'

export default function Sales() {
  const state = useAppState()
  const [showSale, setShowSale] = useState(false)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const sales = [...state.sales]
    .filter((s) => {
      if (!q) return true
      const product = state.products.find((pr) => pr.id === s.productId)
      return `${s.saleCode} ${s.buyerName} ${product?.name ?? ''}`.toLowerCase().includes(q)
    })
    .sort((a, b) => (a.soldAt < b.soldAt ? 1 : -1))

  return (
    <>
      <PageHeading
        eyebrow={`${humanDate(nowISO())} · Sales`}
        title="Sales history"
        subtitle={`${state.sales.length} transactions, each traceable to its consignment.`}
        actions={
          <div className="heading-actions">
            <input className="search-input head" placeholder="Search sale, buyer or product…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="primary-button" onClick={() => setShowSale(true)}><span>↗</span> Record sale</button>
          </div>
        }
      />

      <div className="panel">
        {sales.length === 0 ? (
          <EmptyState icon="↗" title="No sales recorded" copy="Record the first sale to see it here and update farmer balances." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Sale</th><th>Product</th><th>Batch</th><th>Buyer</th><th>Qty</th><th>Value</th><th>Farmer</th><th>Fee</th><th>When</th></tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const batch = state.batches.find((b) => b.id === sale.batchId)
                  const product = state.products.find((pr) => pr.id === sale.productId)
                  return (
                    <tr key={sale.id}>
                      <td><b className="lot-code">{sale.saleCode}</b></td>
                      <td>{product?.emoji} {product?.name ?? '—'}</td>
                      <td>{batch?.batchCode ?? '—'}</td>
                      <td>{sale.buyerName}</td>
                      <td>{fmtNum(sale.quantity)} {sale.unit}</td>
                      <td><b>{fmtMoney(saleSubtotal(sale))}</b></td>
                      <td>{fmtMoney(farmerShareFor(sale.quantity, batch?.farmerPrice ?? 0))}</td>
                      <td>{fmtMoney(labFeeFor(sale.quantity, batch?.labFee ?? 0))}</td>
                      <td>{fmtWhen(sale.soldAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showSale && <RecordSaleModal open onClose={() => setShowSale(false)} />}
    </>
  )
}