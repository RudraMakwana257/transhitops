import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Search, Building2, CheckCircle, XCircle } from 'lucide-react'

export function AdminAuditLogs() {
  const [tab, setTab] = useState<'audit' | 'logins' | 'exceptions'>('audit')
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loginAttempts, setLoginAttempts] = useState<any[]>([])
  const [exceptions, setExceptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchData = async () => {
    setLoading(true)
    try {
      if (tab === 'audit') {
        const res: any = await adminApi.getAuditLogs({ page, page_size: 50, action: search || undefined })
        const data = res?.data || res || {}
        setAuditLogs(data.items || [])
        setTotalPages(data.total_pages || 1)
      } else if (tab === 'logins') {
        const res: any = await adminApi.getLoginAttempts({ page, page_size: 50, email: search || undefined })
        const data = res?.data || res || {}
        setLoginAttempts(data.items || [])
        setTotalPages(data.total_pages || 1)
      } else if (tab === 'exceptions') {
        const res: any = await adminApi.getExceptions({ page, page_size: 50 })
        const data = res?.data || res || {}
        setExceptions(data.items || [])
        setTotalPages(data.total_pages || 1)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [tab, page, search])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Security & Audit Logs</h1>
          <p className="text-muted-foreground mt-1 text-sm">System audit trails, access attempts, and operational exception telemetry</p>
        </div>

        <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border">
          <button
            onClick={() => { setTab('audit'); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'audit' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Audit Trail
          </button>
          <button
            onClick={() => { setTab('logins'); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'logins' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Login Attempts
          </button>
          <button
            onClick={() => { setTab('exceptions'); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'exceptions' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Operational Exceptions
          </button>
        </div>
      </div>

      <Card className="p-4 flex gap-4 justify-between items-center bg-card border-border/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={tab === 'logins' ? 'Search by email...' : 'Search by action or keyword...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
          />
        </div>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card">
        {tab === 'audit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Actor / User</th>
                  <th className="px-6 py-3.5">Organization</th>
                  <th className="px-6 py-3.5">Entity</th>
                  <th className="px-6 py-3.5">IP Address</th>
                  <th className="px-6 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {auditLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-foreground text-xs">{l.action}</span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-semibold text-foreground">{l.user_name || 'System'}</div>
                      <div className="text-muted-foreground font-mono text-[11px]">{l.user_email || 'internal'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{l.company_name || 'Platform'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                      {l.entity_type ? `${l.entity_type} (${l.entity_id?.slice(0, 8)}...)` : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                      {l.ip_address || '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {loading && !auditLogs.length && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading audit trail...</td></tr>
                )}
                {!loading && !auditLogs.length && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No audit logs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'logins' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Attempt Email</th>
                  <th className="px-6 py-3.5">Result</th>
                  <th className="px-6 py-3.5">IP Address</th>
                  <th className="px-6 py-3.5 text-right">Attempt Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loginAttempts.map((la) => (
                  <tr key={la.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground font-mono text-xs">{la.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {la.success ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                      {la.ip_address || '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(la.attempted_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {loading && !loginAttempts.length && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading login history...</td></tr>
                )}
                {!loading && !loginAttempts.length && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-sm">No login attempts recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'exceptions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Exception Type</th>
                  <th className="px-6 py-3.5">Severity</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5 text-right">Occurred At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {exceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground text-xs">{ex.type || ex.exception_type}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        {ex.severity || 'Medium'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{ex.description || '—'}</td>
                    <td className="px-6 py-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(ex.occurred_at || ex.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {loading && !exceptions.length && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading exceptions...</td></tr>
                )}
                {!loading && !exceptions.length && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground text-sm">No operational exceptions recorded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <span className="text-xs font-medium text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
