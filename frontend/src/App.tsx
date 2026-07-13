import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { entityConfigs } from './config/entityConfigs'
import { NotFoundPage } from './pages/NotFoundPage'

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })),
)
const EntityPage = lazy(() =>
  import('./pages/EntityPage').then((module) => ({ default: module.EntityPage })),
)
const OrderBuilderPage = lazy(() =>
  import('./pages/OrderBuilderPage').then((module) => ({ default: module.OrderBuilderPage })),
)
const QuoteCalculatorPage = lazy(() =>
  import('./pages/QuoteCalculatorPage').then((module) => ({ default: module.QuoteCalculatorPage })),
)

const routeFallback = (
  <div className="dashboard-loading" aria-label="Loading page">
    <div className="skeleton skeleton-large" />
  </div>
)

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Suspense fallback={routeFallback}><DashboardPage /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={routeFallback}><AnalyticsPage /></Suspense>} />
        <Route path="order-builder" element={<Suspense fallback={routeFallback}><OrderBuilderPage /></Suspense>} />
        <Route path="quote-calculator" element={<Suspense fallback={routeFallback}><QuoteCalculatorPage /></Suspense>} />
        {entityConfigs.map((config) => (
          <Route
            key={config.path}
            path={config.path}
            element={<Suspense fallback={routeFallback}><EntityPage config={config} /></Suspense>}
          />
        ))}
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
