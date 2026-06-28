import { Building2, CircleDollarSign, PackageCheck, ShoppingBag } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(`${date}T00:00:00`))
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
        <p>{error || 'The dashboard data could not be loaded.'}</p>
        <button className="button primary" type="button" onClick={() => void loadDashboard()}>
          Try again
        </button>
      </section>
    )
  }

  const cards = [
    { label: 'Total orders', value: data.totalOrders.toLocaleString(), icon: ShoppingBag },
    { label: 'Gross order value', value: money.format(data.totalSales), icon: CircleDollarSign },
    { label: 'Merchants', value: data.totalMerchants.toLocaleString(), icon: Building2 },
    { label: 'Active products', value: data.activeProducts.toLocaleString(), icon: PackageCheck },
  ]

  return (
    <div className="dashboard-page">
      {error ? <div className="alert error">{error}</div> : null}

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

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <header className="panel-header">
            <div>
              <h2>Order activity</h2>
              <p>Daily orders across the seeded period</p>
            </div>
            <span className="panel-meta">{data.orderActivity.length} active days</span>
          </header>
          <div className="chart-wrap" aria-label="Order activity line chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.orderActivity} margin={{ top: 16, right: 16, left: -22, bottom: 4 }}>
                <CartesianGrid stroke="#e7edf2" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => value.slice(5)}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => formatDate(String(value))}
                  contentStyle={{ borderRadius: 8, border: '1px solid #dbe3ea', boxShadow: '0 8px 24px rgba(15, 23, 42, .08)' }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#0f9b8e"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#fff', stroke: '#0f9b8e', strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="status-summary" aria-label="Order status summary">
            {data.orderStatuses.map((item) => (
              <div key={item.status}>
                <StatusBadge status={item.status} />
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel recent-panel">
          <header className="panel-header">
            <div>
              <h2>Recent orders</h2>
              <p>Latest customer transactions</p>
            </div>
            <Link to="/orders">View all</Link>
          </header>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong className="order-number">#{String(order.id).padStart(4, '0')}</strong>
                      <span className="cell-subtext">{formatDate(order.createdAt)}</span>
                    </td>
                    <td>{order.userName}</td>
                    <td>{money.format(order.totalAmount)}</td>
                    <td><StatusBadge status={order.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel product-panel">
        <header className="panel-header">
          <div>
            <h2>Product status</h2>
            <p>Catalog items requiring attention appear first</p>
          </div>
          <Link to="/products">View all</Link>
        </header>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Merchant</th>
                <th>Unit price</th>
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
  )
}
