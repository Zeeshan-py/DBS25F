import {
  Building2,
  CircleDollarSign,
  ClipboardList,
  Globe2,
  Package,
  PackageCheck,
  ShoppingBag,
  Trophy,
  Users,
} from 'lucide-react'
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
    { label: 'Customers', value: data.totalCustomers.toLocaleString(), icon: Users },
    { label: 'Products', value: data.totalProducts.toLocaleString(), icon: Package },
    { label: 'Countries', value: data.totalCountries.toLocaleString(), icon: Globe2 },
    { label: 'Pending orders', value: data.pendingOrders.toLocaleString(), icon: ClipboardList },
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

      <section className="insight-strip" aria-label="Project highlights">
        <article>
          <span>Fulfillment rate</span>
          <strong>
            {data.totalOrders === 0
              ? '0%'
              : `${Math.round((data.completedOrders / data.totalOrders) * 100)}%`}
          </strong>
          <p>{data.completedOrders.toLocaleString()} completed orders</p>
        </article>
        <article>
          <span>Average order value</span>
          <strong>{money.format(data.totalOrders === 0 ? 0 : Math.round(data.totalSales / data.totalOrders))}</strong>
          <p>Calculated from non-cancelled order items</p>
        </article>
        <article>
          <span>Catalog health</span>
          <strong>{data.productStatusCounts.map((item) => `${item.status}: ${item.count}`).join(' / ')}</strong>
          <p>Status distribution from products table</p>
        </article>
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

      <div className="simple-dashboard-grid">
        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Top customers</h2>
              <p>Highest spending customers</p>
            </div>
            <Trophy size={18} />
          </header>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Orders</th>
                  <th>Total spent</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((customer) => (
                  <tr key={customer.userId}>
                    <td><strong>{customer.fullName}</strong></td>
                    <td>{customer.orderCount}</td>
                    <td>{money.format(customer.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Sales by country</h2>
              <p>Top customer countries by revenue</p>
            </div>
            <Globe2 size={18} />
          </header>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Orders</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                {data.salesByCountry.map((country) => (
                  <tr key={country.countryName}>
                    <td><strong>{country.countryName}</strong></td>
                    <td>{country.orderCount}</td>
                    <td>{money.format(country.totalSales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel">
        <header className="panel-header">
          <div>
            <h2>Merchant sales report</h2>
            <p>Best performing merchants calculated from products and order items</p>
          </div>
          <Link to="/merchants">Manage merchants</Link>
        </header>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Products</th>
                <th>Total sales</th>
              </tr>
            </thead>
            <tbody>
              {data.merchantSales.map((merchant) => (
                <tr key={merchant.merchantId}>
                  <td><strong>{merchant.merchantName}</strong></td>
                  <td>{merchant.productCount}</td>
                  <td>{money.format(merchant.totalSales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
