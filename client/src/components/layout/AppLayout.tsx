import { ReactNode } from 'react'
import { Outlet, Link, useLocation, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUIStore } from '../../store/uiStore'
import { useTheme } from '../../hooks/useTheme'
import { Truck, Users, MapPin, Wrench, Droplets, Receipt, BarChart2, Settings, LogOut, Menu, X, Bell, Bot, Sun, Moon, Shield, FileText } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: BarChart2, path: '/dashboard', roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'] },
  { label: 'Fleet', icon: Truck, path: '/vehicles', roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'] },
  { label: 'Drivers', icon: Users, path: '/drivers', roles: ['fleet_manager', 'dispatcher', 'safety_officer'] },
  { label: 'Trip Center', icon: MapPin, path: '/trips', roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'] },
  { label: 'Maintenance', icon: Wrench, path: '/maintenance', roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'] },
  { label: 'Fuel', icon: Droplets, path: '/fuel', roles: ['fleet_manager', 'dispatcher', 'financial_analyst'] },
  { label: 'Expenses', icon: Receipt, path: '/expenses', roles: ['fleet_manager', 'dispatcher', 'financial_analyst'] },
  { label: 'Analytics', icon: BarChart2, path: '/analytics', roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'] },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['fleet_manager'] },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  
  const filteredNav = navItems.filter(item => item.roles.includes(user?.role || ''))
  
  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-[var(--sidebar-border)]">
            <div className="w-8 h-8 bg-[var(--brand-primary)] rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-[var(--text-primary)]">TransitOps</span>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {filteredNav.map(item => {
              const Icon = item.icon
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 h-11 px-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-[var(--sidebar-item-active-bg)] text-[var(--sidebar-item-active-text)]' 
                      : 'text-[var(--sidebar-icon-inactive)] hover:bg-[var(--sidebar-item-hover)]'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
          
          {/* Bottom - User */}
          <div className="p-3 border-t border-[var(--sidebar-border)]">
            <div className="flex items-center gap-3 px-3">
              <div className="w-8 h-8 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white font-medium">
                {user?.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name}</p>
                <p className="text-xs text-[var(--text-muted)] capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <button onClick={logout} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top Navbar */}
        <header className="h-16 bg-[var(--bg-card)] border-b border-[var(--border-default)] flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="text-xl font-semibold text-[var(--text-primary)] hidden sm:block">
              {filteredNav.find(n => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))?.label || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
              aria-label={theme === 'light' ? 'Switch to Operations Night' : 'Switch to Operations Light'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-primary)]">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            
            {/* AI Chat button */}
            <button className="relative p-2 rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]">
              <Bot className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-[var(--brand-primary)] text-xs font-bold rounded-full flex items-center justify-center">AI</span>
            </button>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}