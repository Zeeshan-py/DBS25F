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
import { ProductStatusChart, SalesByCountryChart } from '../components/BusinessCharts'
import { StatusBadge } from '../components/StatusBadge'
import { apiService, getErrorMessage } from '../services/api'
import type { BusinessKpis, DashboardSummary } from '../types/api'
import { wholeMoney as money } from '../utils/format'

function formatDate(value: string) {
  const [date] = value.split(' ')
  return date
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [kpis, setKpis] = useState<BusinessKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dashboard, businessKpis] = await Promise.all([
        apiService.getDashboard(),
        apiService.getBusinessKpis(),
      ])
      setData(dashboard)
      setKpis(businessKpis)
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
          <article className={`metric-card ${label === 'Total sales' ? 'metric-card-wide-value' : ''}`} key={label}>
            <span className="metric-icon"><Icon size={21} /></span>
            <div>
              <span>{label}</span>
              <strong title={value}>{value}</strong>
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
          <strong>{money.format(kpis?.averageOrderValue ?? 0)}</strong>
          <p>Calculated from non-cancelled order items</p>
        </article>
        <article>
          <span>Catalog health</span>
          <strong>{data.activeProducts.toLocaleString()} active · {Math.max(0, data.totalProducts - data.activeProducts).toLocaleString()} unavailable</strong>
          <p>{data.productStatusCounts.map((item) => `${item.status}: ${item.count}`).join(' / ') || 'No products recorded'}</p>
        </article>
      </section>

      <div className="chart-dashboard-grid">
        <section className="panel chart-panel" aria-labelledby="product-status-chart-title">
          <header className="panel-header">
            <div>
              <h2 id="product-status-chart-title">Catalog availability</h2>
              <p>Current distribution of product statuses</p>
            </div>
            <Link to="/products">Manage catalog</Link>
          </header>
          <ProductStatusChart data={data.productStatusCounts} />
        </section>

        <section className="panel chart-panel" aria-labelledby="country-sales-chart-title">
          <header className="panel-header">
            <div>
              <h2 id="country-sales-chart-title">Revenue by country</h2>
              <p>Top markets measured by order value</p>
            </div>
            <Link to="/analytics">Open analytics</Link>
          </header>
          <SalesByCountryChart data={data.salesByCountry} />
        </section>
      </div>

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
              <caption className="sr-only">Most recently created customer orders</caption>
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
              <caption className="sr-only">Recent products and their catalog statuses</caption>
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
              <caption className="sr-only">Customers ranked by total spending</caption>
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
              <caption className="sr-only">Countries ranked by total sales</caption>
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
            <caption className="sr-only">Merchants ranked by total product sales</caption>
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
