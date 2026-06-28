import {
  Building2,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Users,
  Warehouse,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Countries', path: '/countries', icon: Globe2 },
  { label: 'Users', path: '/users', icon: Users },
  { label: 'Merchants', path: '/merchants', icon: Building2 },
  { label: 'Products', path: '/products', icon: Package },
  { label: 'Orders', path: '/orders', icon: ShoppingBag },
  { label: 'Order Items', path: '/order-items', icon: ClipboardList },
]

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [moduleSearch, setModuleSearch] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const current = navigation.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
  )

  function jumpToModule(event: React.FormEvent) {
    event.preventDefault()
    const term = moduleSearch.trim().toLowerCase()
    const match = navigation.find((item) => item.label.toLowerCase().includes(term))
    if (match) {
      navigate(match.path)
      setModuleSearch('')
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><Warehouse size={24} /></span>
          <span>Wholesale Hub</span>
        </div>
        <button
          className="sidebar-close"
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">AD</div>
          <div>
            <strong>Administrator</strong>
            <span>Database manager</span>
          </div>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          className="sidebar-scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu"
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <div>
              <span className="topbar-context">Wholesale operations</span>
              <h1>{current?.label ?? 'Page not found'}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <form className="module-search" onSubmit={jumpToModule}>
              <Search size={17} aria-hidden="true" />
              <input
                list="module-list"
                value={moduleSearch}
                onChange={(event) => setModuleSearch(event.target.value)}
                placeholder="Jump to a module..."
                aria-label="Jump to a module"
              />
              <datalist id="module-list">
                {navigation.map((item) => <option key={item.path} value={item.label} />)}
              </datalist>
            </form>
            <button className="button primary topbar-create" type="button" onClick={() => navigate('/orders?create=1')}>
              <Plus size={17} />
              New order
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
