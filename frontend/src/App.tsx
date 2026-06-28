import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { entityConfigs } from './config/entityConfigs'
import { NotFoundPage } from './pages/NotFoundPage'

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
)
const EntityPage = lazy(() =>
  import('./pages/EntityPage').then((module) => ({ default: module.EntityPage })),
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
