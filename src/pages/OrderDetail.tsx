import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Package } from 'lucide-react'
import { useAppState } from '../lib/store'
import { fmtMoney } from '../lib/calc'

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function OrderDetail() {
  const { id } = useParams()
  const s = useAppState()
  const order = s.orders.find((o) => o.id === id)

  if (!order) {
    return (
      <div className="page">
        <div className="empty-state"><p>Order not found.</p></div>
      </div>
    )
  }

  const allocations = s.farmerAllocations.filter((fa) =>
    order.items.some((oi) => oi.id === fa.orderItemId),
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/orders" className="back-link"><ArrowLeft size={16} /> Back to Orders</Link>
          <h1 className="page-title"><ShoppingCart size={24} /> {order.orderCode}</h1>
          <p className="page-subtitle">Created {fmtDate(order.createdAt)} by {order.recordedBy}</p>
        </div>
        <span className={`badge ${order.status === 'Confirmed' ? 'badge-green' : 'badge-red'}`}>{order.status}</span>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <span className="detail-label">Buyer</span>
          <span className="detail-value">{order.buyerName}</span>
        </div>
        <div className="detail-card">
          <span className="detail-label">Payment</span>
          <span className={`badge ${order.paymentMethod === 'Cash' ? 'badge-green' : 'badge-amber'}`}>{order.paymentMethod}</span>
        </div>
        <div className="detail-card">
          <span className="detail-label">Total Revenue</span>
          <span className="detail-value font-semibold">{fmtMoney(order.totalRevenue)}</span>
        </div>
      </div>

      <h2 className="section-title"><Package size={18} /> Order Items</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const product = s.products.find((p) => p.id === item.productId)
              return (
                <tr key={item.id}>
                  <td className="font-medium">{product?.emoji} {product?.name ?? item.productId}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>{fmtMoney(item.unitPrice)}</td>
                  <td className="font-semibold">{fmtMoney(item.lineTotal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {allocations.length > 0 && (
        <>
          <h2 className="section-title">Farmer Allocation</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Product</th>
                  <th>Allocated Qty</th>
                  <th>Payout</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => {
                  const farmer = s.farmers.find((f) => f.id === a.farmerId)
                  const product = s.products.find((p) => p.id === a.productId)
                  return (
                    <tr key={a.id}>
                      <td className="font-medium">{farmer?.firstName} {farmer?.lastName}</td>
                      <td>{product?.emoji} {product?.name}</td>
                      <td>{a.allocatedQuantity} {product?.defaultUnit ?? 'kg'}</td>
                      <td className="font-semibold">{fmtMoney(a.farmerPayout)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
