import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { 
  LayoutDashboard, Building2, Package, LogOut, Sun, Moon, Menu, X, Shield, 
  Users, AlertOctagon, ShieldAlert, Database, CreditCard, Sliders, Megaphone, Settings 
} from 'lucide-react'
import { Button } from '../ui/ButtonWrapper'

const navGroups = [
  {
    title: 'Command Center',
    items: [
      { label: 'Overview', icon: LayoutDashboard, path: '/admin/dashboard' },
      { label: 'Organizations', icon: Building2, path: '/admin/companies' },
      { label: 'Global Users', icon: Users, path: '/admin/users' },
    ]
  },
  {
    title: 'Operations & Telemetry',
    items: [
      { label: 'Global Exceptions', icon: AlertOctagon, path: '/admin/exceptions' },
      { label: 'System Health', icon: Database, path: '/admin/system' },
      { label: 'Security & Audit', icon: ShieldAlert, path: '/admin/audit' },
    ]
  },
  {
    title: 'Business & Revenue',
    items: [
      { label: 'Plans & Pricing', icon: Package, path: '/admin/plans' },
      { label: 'Billing & Invoices', icon: CreditCard, path: '/admin/payments' },
    ]
  },
  {
    title: 'Platform Governance',
    items: [
      { label: 'Feature Flags', icon: Sliders, path: '/admin/feature-flags' },
      { label: 'Announcements', icon: Megaphone, path: '/admin/announcements' },
      { label: 'Platform Settings', icon: Settings, path: '/admin/settings' },
    ]
  }
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useUIStore()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <div className="md:hidden h-16 bg-card border-b border-border flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <span className="font-bold text-foreground tracking-tight">TransitOps Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar Overlay on Mobile */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-border gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold text-foreground tracking-tight block">TransitOps</span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-primary block">Super Admin</span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
                {group.title}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname.startsWith(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-medium text-xs ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name || 'Super Admin'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || 'admin@transitops.com'}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="hidden md:flex h-16 bg-card border-b border-border items-center justify-between px-8 shadow-xs">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <span className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs uppercase tracking-wider font-bold">Platform Ops</span>
            <span>/</span>
            <span className="capitalize text-foreground font-semibold">
              {location.pathname.split('/').filter(Boolean).slice(1).join(' / ') || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="gap-2 text-xs"
              aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </Button>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
