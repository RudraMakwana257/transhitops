import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { AlertOctagon, AlertTriangle, CheckCircle2, Building2, RefreshCw } from 'lucide-react'

export function AdminExceptions() {
  const [exceptions, setExceptions] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState('')

  const fetchExceptions = async () => {
    setLoading(true)
    try {
      const res: any = await adminApi.getExceptions({
        page,
        page_size: 25,
        company_id: selectedCompanyId || undefined
      })
      const data = res?.data || res || {}
      const items = data.items || []
      setExceptions(items)
      setTotal(data.total || items.length)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanies = async () => {
    try {
      const res: any = await adminApi.getCompanies({ page: 1, page_size: 100 })
      const data = res?.data || res || {}
      setCompanies(data.items || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    fetchExceptions()
  }, [page, selectedCompanyId, selectedSeverity])

  const criticalCount = exceptions.filter(e => e.severity === 'CRITICAL').length
  const highCount = exceptions.filter(e => e.severity === 'HIGH').length
  const mediumCount = exceptions.filter(e => e.severity === 'MEDIUM').length

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Global Incident & Exception Center</h1>
          <p className="text-muted-foreground mt-1 text-sm">Platform-wide autonomous anomaly detection, critical breakdowns, safety risks, and compliance breaches</p>
        </div>
        <Button onClick={fetchExceptions} variant="outline" size="sm" className="gap-2 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Incidents</span>
        </Button>
      </div>

      {/* Triage Severity Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-red-500/10 border-red-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Critical Incidents</span>
            <div className="text-2xl font-black text-foreground mt-0.5">{criticalCount}</div>
          </div>
          <AlertOctagon className="w-8 h-8 text-red-500" />
        </Card>

        <Card className="p-4 bg-amber-500/10 border-amber-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">High Priority</span>
            <div className="text-2xl font-black text-foreground mt-0.5">{highCount}</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </Card>

        <Card className="p-4 bg-blue-500/10 border-blue-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Medium / Warnings</span>
            <div className="text-2xl font-black text-foreground mt-0.5">{mediumCount}</div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-blue-500" />
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-card border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <select
            value={selectedCompanyId}
            onChange={(e) => { setSelectedCompanyId(e.target.value); setPage(1) }}
            className="h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm flex-1 max-w-xs"
          >
            <option value="">All Organizations</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => { setSelectedSeverity(e.target.value); setPage(1) }}
            className="h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm flex-1 max-w-xs"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Total Incidents: <span className="font-bold text-foreground">{total}</span>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Severity</th>
                <th className="px-6 py-3.5">Incident Title</th>
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Category & Entity</th>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {exceptions.map((ex) => (
                <tr key={ex.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                      ex.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' :
                      ex.severity === 'HIGH' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                    }`}>
                      {ex.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{ex.title || ex.type || 'Operational Anomaly'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{ex.description || 'No detailed diagnostic description.'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{ex.company_name || 'Organization'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                    {ex.entity_type ? `${ex.entity_type} (${ex.entity_id?.slice(0, 8)})` : 'System Exception'}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                    {ex.created_at || ex.occurred_at ? new Date(ex.created_at || ex.occurred_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {ex.status || 'OPEN'}
                    </span>
                  </td>
                </tr>
              ))}
              {loading && !exceptions.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Checking global incidents...</td>
                </tr>
              )}
              {!loading && !exceptions.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-foreground">Zero Critical Operational Exceptions</span>
                    <p className="text-xs text-muted-foreground mt-1">All tenant routes, maintenance schedules, and fleets are operating within normal telemetry parameters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
