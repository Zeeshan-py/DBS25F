import { Building2, CircleDollarSign, PackageCheck, ShoppingBag } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { apiService, getErrorMessage } from '../services/api'
import type { DashboardSummary } from '../types/api'

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function formatDate(value: string) {
  const [date] = value.split(' ')
  return date
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await apiService.getDashboard())
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  if (loading) {
    return (
      <div className="dashboard-loading" aria-label="Loading dashboard">
        <div className="skeleton-row">
          {[1, 2, 3, 4].map((item) => <div className="skeleton skeleton-card" key={item} />)}
        </div>
        <div className="skeleton skeleton-large" />
      </div>
    )
  }

  if (!data) {
    return (
      <section className="error-state">
        <h2>Dashboard unavailable</h2>
        <p>{error || 'Start the API and MySQL database, then try again.'}</p>
        <button className="button primary" type="button" onClick={() => void loadDashboard()}>
          Try again
        </button>
      </section>
    )
  }

  const cards = [
    { label: 'Total orders', value: data.totalOrders.toLocaleString(), icon: ShoppingBag },
    { label: 'Total sales', value: money.format(data.totalSales), icon: CircleDollarSign },
    { label: 'Merchants', value: data.totalMerchants.toLocaleString(), icon: Building2 },
    { label: 'Active products', value: data.activeProducts.toLocaleString(), icon: PackageCheck },
  ]

  return (
    <div className="dashboard-page">
      <section className="metric-grid" aria-label="Business totals">
        {cards.map(({ label, value, icon: Icon }) => (
          <article className="metric-card" key={label}>
            <span className="metric-icon"><Icon size={21} /></span>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </article>
        ))}
      </section>

      <div className="simple-dashboard-grid">
        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Recent orders</h2>
              <p>Latest customer orders</p>
            </div>
            <Link to="/orders">View all</Link>
          </header>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td><strong className="order-number">#{order.id}</strong></td>
                    <td>{order.userName}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{money.format(order.totalAmount)}</td>
                    <td><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Products</h2>
              <p>Product status overview</p>
            </div>
            <Link to="/products">View all</Link>
          </header>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Merchant</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.productStatuses.map((product) => (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong></td>
                    <td>{product.merchantName}</td>
                    <td>{money.format(product.price)}</td>
                    <td><StatusBadge status={product.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
