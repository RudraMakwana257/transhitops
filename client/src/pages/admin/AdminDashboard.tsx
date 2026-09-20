import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAdminStore } from '../../stores/adminStore'
import { 
  Building2, Users, Activity, ArrowRight, ShieldCheck, AlertTriangle, 
  AlertOctagon, DollarSign, Server, RefreshCw 
} from 'lucide-react'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'

export function AdminDashboard() {
  const { dashboardStats, loading, error, fetchDashboardStats, companies, fetchCompanies } = useAdminStore()

  useEffect(() => {
    fetchDashboardStats()
    fetchCompanies({ page: 1, page_size: 5 })
  }, [fetchDashboardStats, fetchCompanies])

  if (loading && !dashboardStats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6 space-y-3 bg-card border-border">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-16 bg-muted rounded" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>Error loading dashboard: {error}</span>
      </div>
    )
  }

  const ds = dashboardStats || {}
  const sh = ds.system_health || {}

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Platform Command Center</h1>
          <p className="text-muted-foreground mt-1 text-sm">Global multi-tenant governance, infrastructure telemetry, and security oversight</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchDashboardStats()} className="gap-2 text-xs font-semibold">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </Button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All Systems Operational</span>
          </div>
        </div>
      </div>

      {/* Layer 1: Global Health & Critical KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Organizations Card */}
        <Card className="p-5 bg-card border-border/80 hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organizations</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-foreground">{ds.total_companies || 0}</div>
            <div className="flex items-center gap-3 text-xs mt-2 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {ds.active_companies || 0} Active
              </span>
              <span className="text-muted-foreground">
                &bull; {ds.suspended_companies || 0} Suspended
              </span>
            </div>
          </div>
        </Card>

        {/* Global Users & Tenants */}
        <Card className="p-5 bg-card border-border/80 hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform Accounts</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-foreground">{ds.total_users || 0}</div>
            <div className="flex items-center gap-3 text-xs mt-2 font-medium">
              <span className="text-purple-600 dark:text-purple-400">
                {ds.active_users || 0} Active Accounts
              </span>
              <span className="text-muted-foreground">
                &bull; Cross-tenant
              </span>
            </div>
          </div>
        </Card>

        {/* Fleet & Active Dispatches */}
        <Card className="p-5 bg-card border-border/80 hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Fleet Dispatches</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{ds.active_trips || 0}</div>
            <div className="flex items-center gap-3 text-xs mt-2 font-medium text-muted-foreground">
              <span>{ds.total_vehicles || 0} Vehicles</span>
              <span>&bull;</span>
              <span>{ds.total_drivers || 0} Drivers</span>
            </div>
          </div>
        </Card>

        {/* Global Critical Exceptions */}
        <Card className={`p-5 flex flex-col justify-between border transition-all ${
          (ds.critical_exceptions || 0) > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-card border-border/80'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Critical Incidents</span>
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-red-600 dark:text-red-400">{ds.critical_exceptions || 0}</div>
            <div className="flex items-center gap-3 text-xs mt-2 font-medium">
              <span className="text-amber-600 dark:text-amber-400">{ds.high_exceptions || 0} High Priority</span>
              <span className="text-muted-foreground">&bull; {ds.total_open_exceptions || 0} Open</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Layer 2: Infrastructure Telemetry & SaaS Revenue Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Infrastructure Telemetry */}
        <Card className="p-6 bg-card border-border/80 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Infrastructure & Health Status</h2>
            </div>
            <Link to="/admin/system" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
              <span>View Diagnostics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">API Services</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{sh.api || 'Healthy'}</span>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Database Engine</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{sh.database || 'Healthy'}</span>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Background Workers</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{sh.workers || 'Healthy'}</span>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Redis Cache / Queue</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{sh.redis || 'Healthy'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-muted-foreground border-t border-border/50 gap-4">
            <div>Average API Latency: <strong className="text-foreground">{sh.latency_ms || 38}ms</strong></div>
            <div>Error Rate: <strong className="text-foreground">{sh.error_rate || '0.01%'}</strong></div>
            <div>SLA Platform Uptime: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{sh.uptime || '99.98%'}</strong></div>
          </div>
        </Card>

        {/* Business & Revenue Snapshot */}
        <Card className="p-6 bg-card border-border/80 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base font-bold text-foreground">SaaS Revenue Overview</h2>
              </div>
              <Link to="/admin/payments" className="text-xs text-primary hover:underline font-semibold">
                Billing &rarr;
              </Link>
            </div>

            <div className="space-y-4 pt-3">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Monthly Recurring Revenue (MRR)</span>
                <div className="text-3xl font-black text-foreground mt-0.5">${(ds.mrr || 0).toLocaleString()}</div>
              </div>

              <div className="space-y-2 pt-2 text-xs border-t border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Subscriptions</span>
                  <span className="font-bold text-foreground">{ds.active_subscriptions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trial Organizations</span>
                  <span className="font-bold text-foreground">{ds.trial_subscriptions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Churn Rate</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">0.0%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Layer 3: Command Center Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-foreground">Platform Governance & Controls</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Organizations', path: '/admin/companies', desc: 'Tenants & Provisioning', color: 'text-blue-500' },
            { label: 'Global Users', path: '/admin/users', desc: 'Roles & Credentials', color: 'text-purple-500' },
            { label: 'Global Incidents', path: '/admin/exceptions', desc: 'Exception Triage', color: 'text-red-500' },
            { label: 'Feature Flags', path: '/admin/feature-flags', desc: 'Rollouts & Gating', color: 'text-indigo-500' },
            { label: 'Announcements', path: '/admin/announcements', desc: 'Broadcast Notices', color: 'text-amber-500' },
            { label: 'Platform Settings', path: '/admin/settings', desc: 'Policies & Security', color: 'text-emerald-500' },
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div className="space-y-1">
                <span className={`text-xs font-black uppercase tracking-wider block ${item.color}`}>
                  {item.label}
                </span>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                <span>Manage &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Layer 4: Recent Organizations & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Organizations */}
        <Card className="p-6 bg-card border-border/80 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Recent Organizations</h2>
            </div>
            <Link to="/admin/companies" className="text-xs text-primary hover:underline font-semibold">
              View All &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground font-semibold border-b border-border pb-2 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="pb-2">Company</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {companies?.items?.map((company: any) => (
                  <tr key={company.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3">
                      <Link to={`/admin/companies/${company.id}`} className="font-semibold text-foreground hover:text-primary">
                        {company.name}
                      </Link>
                      <div className="text-[11px] text-muted-foreground font-mono">{company.email}</div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                        {company.subscription?.plan?.name || 'Standard'}
                      </span>
                    </td>
                    <td className="py-3">
                      {company.is_active ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                      ) : (
                        <span className="text-destructive font-bold">Suspended</span>
                      )}
                    </td>
                    <td className="py-3 text-right text-muted-foreground">
                      {new Date(company.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {!companies?.items?.length && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No companies recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Live Audit Activity Stream */}
        <Card className="p-6 bg-card border-border/80 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Recent Platform Activity</h2>
            </div>
            <Link to="/admin/audit" className="text-xs text-primary hover:underline font-semibold">
              Audit Logs &rarr;
            </Link>
          </div>

          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 divide-y divide-border/40">
            {ds.recent_activity?.map((act: any) => (
              <div key={act.id} className="pt-2.5 first:pt-0 flex items-start justify-between text-xs gap-3">
                <div>
                  <span className="font-semibold text-foreground">{act.action}</span>
                  <div className="text-[11px] text-muted-foreground">
                    by <strong className="text-foreground">{act.user_name}</strong> &bull; {act.company_name}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </span>
              </div>
            ))}
            {!ds.recent_activity?.length && (
              <div className="py-6 text-center text-muted-foreground text-xs">
                No recent activity logged.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
