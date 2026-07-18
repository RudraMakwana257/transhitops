import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUIStore } from '../../store/uiStore'
import { useTheme } from '../../hooks/useTheme'
import { Truck, Users, MapPin, Wrench, Droplets, Receipt, BarChart2, Settings, LogOut, Menu, X, Bell, Bot, Sun, Moon } from 'lucide-react'
import { NotificationPanel } from './NotificationPanel'
import { AIChatPanel } from './AIChatPanel'

const navItems = [
  { label: 'Dashboard', icon: BarChart2, path: '/dashboard', roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'] },
  { label: 'Fleet', icon: Truck, path: '/vehicles', roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'] },
  { label: 'Drivers', icon: Users, path: '/drivers', roles: ['fleet_manager', 'dispatcher', 'safety_officer'] },
  { label: 'Trip Center', icon: MapPin, path: '/trips', roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'] },
  { label: 'Maintenance', icon: Wrench, path: '/maintenance', roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'] },
  { label: 'Fuel', icon: Droplets, path: '/fuel', roles: ['fleet_manager', 'dispatcher'] },
  { label: 'Expenses', icon: Receipt, path: '/expenses', roles: ['fleet_manager', 'dispatcher', 'financial_analyst'] },
  { label: 'Analytics', icon: BarChart2, path: '/analytics', roles: ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'] },
  { label: 'Settings', icon: Settings, path: '/settings', roles: ['fleet_manager'] },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showAIChat, setShowAIChat] = useState(false)

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

          {/* Admin Link for Super Admins */}
          {user?.role === 'super_admin' && (
            <div className="p-3 border-t border-[var(--sidebar-border)]">
              <Link
                to="/admin"
                className="flex items-center gap-3 h-11 px-3 rounded-lg text-sm font-medium transition-colors text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Admin Panel</span>
              </Link>
            </div>
          )}

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
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-[var(--bg-card)]">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>

            {/* AI Chat button */}
            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className="relative p-2 rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]"
            >
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

      {/* Notification Panel */}
      <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} unreadCount={unreadCount} setUnreadCount={setUnreadCount} />

      {/* AI Chat Panel */}
      <AIChatPanel open={showAIChat} onClose={() => setShowAIChat(false)} />
    </div>
  )
}
