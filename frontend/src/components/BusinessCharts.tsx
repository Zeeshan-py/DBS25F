import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  MerchantSales,
  OrderStatusMetric,
  ProductStatusCount,
  SalesByCountry,
  SalesTrendPoint,
  TopProductMetric,
} from '../types/api'
import { compactMoney, wholeMoney as money } from '../utils/format'

const fallbackColors = ['#087f76', '#246b9c', '#9b6b26', '#7557a6', '#c24b5a', '#4c7085']
const statusColors: Record<string, string> = {
  active: '#087f76',
  inactive: '#d09a35',
  'out of stock': '#c24b5a',
}

interface ChartEmptyProps {
  message: string
}

function ChartEmpty({ message }: ChartEmptyProps) {
  return <div className="chart-empty">{message}</div>
}

interface ProductStatusChartProps {
  data: ProductStatusCount[]
}

export function ProductStatusChart({ data }: ProductStatusChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  if (data.length === 0 || total === 0) {
    return <ChartEmpty message="No product status data is available yet." />
  }

  return (
    <>
      <div
        className="chart-canvas donut-canvas"
        role="img"
        aria-label={`Product catalog distribution. ${data.map((item) => `${item.status}: ${item.count}`).join(', ')}.`}
      >
        <ResponsiveContainer width="100%" height={270}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="46%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              stroke="#ffffff"
              strokeWidth={3}
            >
              {data.map((item, index) => (
                <Cell
                  key={item.status}
                  fill={statusColors[item.status.toLowerCase()] ?? fallbackColors[index % fallbackColors.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Products']} />
            <Legend verticalAlign="bottom" iconType="circle" iconSize={9} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-total" aria-hidden="true">
          <strong>{total.toLocaleString()}</strong>
          <span>Products</span>
        </div>
      </div>
      <details className="chart-data-details">
        <summary>View chart data</summary>
        <table>
          <thead><tr><th>Status</th><th>Products</th><th>Share</th></tr></thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.status}>
                <td>{item.status}</td>
                <td>{item.count.toLocaleString()}</td>
                <td>{Math.round((item.count / total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}

interface SalesByCountryChartProps {
  data: SalesByCountry[]
}

export function SalesByCountryChart({ data }: SalesByCountryChartProps) {
  const chartData = [...data]
    .sort((left, right) => right.totalSales - left.totalSales)
    .slice(0, 6)
  if (chartData.length === 0) {
    return <ChartEmpty message="Country sales will appear after orders are created." />
  }

  return (
    <>
      <div
        className="chart-canvas"
        role="img"
        aria-label={`Revenue by country. ${chartData.map((item) => `${item.countryName}: ${money.format(item.totalSales)}`).join(', ')}.`}
      >
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 18, bottom: 8, left: 6 }}>
            <CartesianGrid stroke="#e7edf2" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => compactMoney.format(Number(value))}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="countryName"
              width={92}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#334155', fontSize: 11 }}
            />
            <Tooltip formatter={(value) => [money.format(Number(value)), 'Sales']} cursor={{ fill: '#f1f7f7' }} />
            <Bar dataKey="totalSales" name="Sales" fill="#087f76" radius={[0, 5, 5, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data-details">
        <summary>View chart data</summary>
        <table>
          <thead><tr><th>Country</th><th>Orders</th><th>Sales</th></tr></thead>
          <tbody>
            {chartData.map((item) => (
              <tr key={item.countryName}>
                <td>{item.countryName}</td>
                <td>{item.orderCount.toLocaleString()}</td>
                <td>{money.format(item.totalSales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}

interface MerchantSalesChartProps {
  data: MerchantSales[]
}

export function MerchantSalesChart({ data }: MerchantSalesChartProps) {
  const chartData = [...data]
    .sort((left, right) => right.totalSales - left.totalSales)
    .slice(0, 6)
  if (chartData.length === 0) {
    return <ChartEmpty message="Merchant performance will appear after sales are recorded." />
  }

  return (
    <>
      <div
        className="chart-canvas"
        role="img"
        aria-label={`Merchant revenue comparison. ${chartData.map((item) => `${item.merchantName}: ${money.format(item.totalSales)}`).join(', ')}.`}
      >
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={chartData} margin={{ top: 8, right: 10, bottom: 52, left: 2 }}>
            <CartesianGrid stroke="#e7edf2" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="merchantName"
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-28}
              textAnchor="end"
              height={62}
              tick={{ fill: '#475569', fontSize: 10 }}
            />
            <YAxis
              tickFormatter={(value) => compactMoney.format(Number(value))}
              axisLine={false}
              tickLine={false}
              width={58}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip formatter={(value) => [money.format(Number(value)), 'Sales']} cursor={{ fill: '#f1f7f7' }} />
            <Bar dataKey="totalSales" name="Sales" fill="#246b9c" radius={[5, 5, 0, 0]} maxBarSize={46} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data-details">
        <summary>View chart data</summary>
        <table>
          <thead><tr><th>Merchant</th><th>Products</th><th>Sales</th></tr></thead>
          <tbody>
            {chartData.map((item) => (
              <tr key={item.merchantId}>
                <td>{item.merchantName}</td>
                <td>{item.productCount.toLocaleString()}</td>
                <td>{money.format(item.totalSales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}

interface SalesTrendChartProps {
  data: SalesTrendPoint[]
}

function shortDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  const chartData = data.map((item) => ({ ...item, label: shortDate(item.date) }))
  if (chartData.length === 0) {
    return <ChartEmpty message="No sales were recorded during this date range." />
  }

  return (
    <>
      <div
        className="chart-canvas trend-chart-canvas"
        role="img"
        aria-label={`Daily sales trend with ${chartData.length} data points. Total revenue is ${money.format(chartData.reduce((sum, item) => sum + item.totalSales, 0))}.`}
      >
        <ResponsiveContainer width="100%" height={310}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 12, bottom: 2, left: 4 }}>
            <defs>
              <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#087f76" stopOpacity={0.26} />
                <stop offset="100%" stopColor="#087f76" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e7edf2" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              minTickGap={28}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              yAxisId="sales"
              tickFormatter={(value) => compactMoney.format(Number(value))}
              axisLine={false}
              tickLine={false}
              width={62}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              yAxisId="orders"
              orientation="right"
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={32}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip
              formatter={(value, name) => [
                name === 'Revenue' ? money.format(Number(value)) : Number(value).toLocaleString(),
                name,
              ]}
              labelFormatter={(label) => String(label)}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} />
            <Area
              yAxisId="sales"
              type="monotone"
              dataKey="totalSales"
              name="Revenue"
              stroke="#087f76"
              fill="url(#salesArea)"
              strokeWidth={2.5}
            />
            <Line
              yAxisId="orders"
              type="monotone"
              dataKey="orderCount"
              name="Orders"
              stroke="#246b9c"
              strokeWidth={2}
              dot={{ r: 3, fill: '#246b9c', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data-details">
        <summary>View daily sales data</summary>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Date</th><th>Orders</th><th>Units</th><th>Revenue</th></tr></thead>
            <tbody>
              {chartData.map((item) => (
                <tr key={item.date}>
                  <td>{item.label}</td>
                  <td>{item.orderCount.toLocaleString()}</td>
                  <td>{item.unitsSold.toLocaleString()}</td>
                  <td>{money.format(item.totalSales)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  )
}

interface OrderStatusChartProps {
  data: OrderStatusMetric[]
}

const orderStatusColors: Record<string, string> = {
  pending: '#d09a35',
  processing: '#246b9c',
  shipped: '#7557a6',
  completed: '#087f76',
  cancelled: '#c24b5a',
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const totalOrders = data.reduce((sum, item) => sum + item.orderCount, 0)
  if (data.length === 0 || totalOrders === 0) return <ChartEmpty message="No order status data is available yet." />
  return (
    <>
      <div
        className="chart-canvas"
        role="img"
        aria-label={`Order status distribution. ${data.map((item) => `${item.status}: ${item.orderCount} orders`).join(', ')}.`}
      >
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="orderCount"
              nameKey="status"
              cx="50%"
              cy="45%"
              innerRadius={52}
              outerRadius={86}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={3}
            >
              {data.map((item, index) => (
                <Cell
                  key={item.status}
                  fill={orderStatusColors[item.status.toLowerCase()] ?? fallbackColors[index % fallbackColors.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Orders']} />
            <Legend verticalAlign="bottom" iconType="circle" iconSize={9} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data-details">
        <summary>View status data</summary>
        <table>
          <thead><tr><th>Status</th><th>Orders</th><th>Share</th><th>Revenue</th></tr></thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.status}>
                <td>{item.status}</td>
                <td>{item.orderCount.toLocaleString()}</td>
                <td>{item.percentage.toFixed(1)}%</td>
                <td>{money.format(item.totalSales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}

interface TopProductsChartProps {
  data: TopProductMetric[]
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  const chartData = data.slice(0, 8)
  if (chartData.length === 0) return <ChartEmpty message="Top products will appear after sales are recorded." />

  return (
    <>
      <div
        className="chart-canvas"
        role="img"
        aria-label={`Top products by revenue. ${chartData.map((item) => `${item.productName}: ${money.format(item.totalSales)}`).join(', ')}.`}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="#e7edf2" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => compactMoney.format(Number(value))}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="productName"
              width={112}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#334155', fontSize: 11 }}
            />
            <Tooltip formatter={(value) => [money.format(Number(value)), 'Sales']} cursor={{ fill: '#f1f7f7' }} />
            <Bar dataKey="totalSales" name="Sales" fill="#087f76" radius={[0, 5, 5, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data-details">
        <summary>View product data</summary>
        <table>
          <thead><tr><th>Product</th><th>Merchant</th><th>Units</th><th>Sales</th></tr></thead>
          <tbody>
            {chartData.map((item) => (
              <tr key={item.productId}>
                <td>{item.productName}</td>
                <td>{item.merchantName}</td>
                <td>{item.unitsSold.toLocaleString()}</td>
                <td>{money.format(item.totalSales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}
