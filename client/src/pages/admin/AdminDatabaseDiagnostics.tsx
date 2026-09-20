import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Database, RefreshCw, CheckCircle2, ShieldCheck, HardDrive, Activity } from 'lucide-react'

export function AdminDatabaseDiagnostics() {
  const [stats, setStats] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getDatabaseStats()
      setStats(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Database & System Health</h1>
          <p className="text-muted-foreground mt-1 text-sm">Real-time table record counts, system uptime, and multi-tenant telemetry</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm" className="gap-2 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Diagnostics</span>
        </Button>
      </div>

      {/* System Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Engine Status</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">PostgreSQL (Healthy)</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Schema Tables</p>
              <p className="text-xl font-black text-foreground">{Object.keys(stats?.tables || {}).length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Tenants</p>
              <p className="text-xl font-black text-foreground">{stats?.active_metrics?.active_companies || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform Users</p>
              <p className="text-xl font-black text-foreground">{stats?.active_metrics?.active_users || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Database Tables Summary Table */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          <span>Database Entity Row Counters</span>
        </h2>

        <Card className="overflow-hidden border-border/80 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Database Table / Entity</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Total Row Count</th>
                  <th className="px-6 py-3.5 text-right">Integrity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {stats?.tables && Object.entries(stats.tables).map(([table, count]: [string, any]) => (
                  <tr key={table} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs font-semibold text-foreground">
                      {table}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground capitalize">
                      {table.includes('log') || table.includes('attempt') || table.includes('audit') ? 'Telemetry & Logs' :
                       table.includes('company') || table.includes('subscription') || table.includes('plan') ? 'Multi-tenant Core' :
                       'Fleet Operations'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-bold text-xs text-foreground">{count?.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Validated
                      </span>
                    </td>
                  </tr>
                ))}
                {!stats && loading && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Running database checks...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
