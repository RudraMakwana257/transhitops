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
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} lg:translate-x-0 lg:shadow-none flex flex-col`}>
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-6 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-sm shadow-primary/20">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">TransitOps</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto scrollbar-thin">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Menu</div>
          {filteredNav.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
                className={`flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? 'text-primary bg-primary/10 shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Admin Link for Super Admins */}
        {user?.role === 'super_admin' && (
          <div className="p-4 border-t border-border">
            <Link
              to="/admin"
              className="flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-medium transition-colors text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-900"
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Admin Panel</span>
            </Link>
          </div>
        )}

        {/* Bottom - User */}
        <div className="p-4 border-t border-border bg-card/50">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold border border-primary/20">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground capitalize truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button onClick={logout} className="text-muted-foreground hover:text-destructive p-2 rounded-xl transition-colors hover:bg-destructive/10" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 h-screen">
        {/* Top Navbar */}
        <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 supports-[backdrop-filter]:bg-background/60 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-xl hover:bg-muted text-foreground transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-bold tracking-tight text-foreground hidden sm:block animate-in fade-in slide-in-from-left-4 duration-500">
              {filteredNav.find(n => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-muted text-foreground transition-all duration-200 hover:scale-110"
              aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-500" />}
            </button>

            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-muted text-foreground transition-all duration-200 hover:scale-110"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute 2 top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground border-2 border-background animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

            {/* AI Chat button */}
            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className="relative px-3 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 font-medium text-sm flex items-center gap-2 group border border-primary/20"
            >
              <Bot className="w-4 h-4 group-hover:animate-bounce" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-muted/30">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </div>
        </main>
      </div>

      <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} unreadCount={unreadCount} setUnreadCount={setUnreadCount} />
      <AIChatPanel open={showAIChat} onClose={() => setShowAIChat(false)} />
    </div>
  )
}
