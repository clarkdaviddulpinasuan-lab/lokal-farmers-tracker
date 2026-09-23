import { Link } from 'react-router-dom'
import { ShoppingCart, Eye } from 'lucide-react'
import { useAppState } from '../lib/store'
import { fmtMoney } from '../lib/calc'

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }

export default function Orders() {
  const s = useAppState()
  const orders = [...s.orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title"><ShoppingCart size={24} /> Orders</h1>
          <p className="page-subtitle">{orders.length} orders</p>
        </div>
      </div>
      {orders.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={40} strokeWidth={1} />
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Buyer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><span className="badge badge-blue">{o.orderCode}</span></td>
                  <td className="font-medium">{o.buyerName}</td>
                  <td>{o.items.length} product{o.items.length !== 1 ? 's' : ''}</td>
                  <td className="font-semibold">{fmtMoney(o.totalRevenue)}</td>
                  <td>
                    <span className={`badge ${o.paymentMethod === 'Cash' ? 'badge-green' : 'badge-amber'}`}>
                      {o.paymentMethod}
                    </span>
                  </td>
                  <td className="text-muted">{fmtDate(o.createdAt)}</td>
                  <td>
                    <Link to={`/orders/${o.id}`} className="btn btn-ghost btn-sm">
                      <Eye size={14} /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
