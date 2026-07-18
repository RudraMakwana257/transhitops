import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/authStore'
import { LayoutDashboard, Building2, Package, LogOut } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Companies', icon: Building2, path: '/admin/companies' },
  { label: 'Plans', icon: Package, path: '/admin/plans' },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="h-16 flex items-center px-6 bg-slate-950">
          <span className="text-xl font-bold text-white tracking-wide">TransitOps Admin</span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">Super Admin</p>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-white transition-colors" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs uppercase tracking-wider font-bold">Super Admin</span>
            <span>/</span>
            <span className="capitalize">{location.pathname.split('/').filter(Boolean).slice(1).join(' / ')}</span>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
