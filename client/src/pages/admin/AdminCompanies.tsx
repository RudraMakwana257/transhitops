import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../stores/adminStore'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Plus, Search, Eye, Ban, CheckCircle, Building2, Shield } from 'lucide-react'

export function AdminCompanies() {
  const { companies, loading, fetchCompanies, suspendCompany, activateCompany } = useAdminStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    fetchCompanies({ page, page_size: 20, search: searchTerm })
  }, [fetchCompanies, page, searchTerm])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchCompanies({ page: 1, page_size: 20, search: searchTerm })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Tenant Organizations</h1>
          <p className="text-muted-foreground mt-1 text-sm">Provision, configure, and monitor customer fleet accounts</p>
        </div>
        <Button onClick={() => navigate('/admin/companies/new')} className="gap-2 shadow-sm font-semibold">
          <Plus className="w-4 h-4" />
          <span>New Company</span>
        </Button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border-border/80 shadow-xs">
        <form onSubmit={handleSearch} className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground placeholder:text-muted-foreground"
          />
        </form>
        <div className="text-xs font-medium text-muted-foreground">
          Showing {companies?.items?.length || 0} of {companies?.total || 0} companies
        </div>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Company</th>
                <th className="px-6 py-3.5">Plan</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {companies?.items?.map((company: any) => (
                <tr key={company.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{company.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{company.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      {company.subscription?.plan?.name || 'Standard'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {company.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                        Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={async () => {
                        if (!window.confirm(`Impersonate organization admin for ${company.name}?`)) return
                        try {
                          const res = await adminApi.impersonate({ company_id: company.id })
                          const authPayload = res.data?.data || res.data
                          if (authPayload && authPayload.access_token) {
                            const authStorageStr = localStorage.getItem('auth-storage')
                            let currentToken = localStorage.getItem('accessToken') || ''
                            let currentUser = localStorage.getItem('user') || ''
                            if (authStorageStr) {
                              try {
                                const parsed = JSON.parse(authStorageStr)
                                if (parsed.state?.token) currentToken = parsed.state.token
                                if (parsed.state?.user) currentUser = JSON.stringify(parsed.state.user)
                              } catch {
                                // fallback
                              }
                            }
                            localStorage.setItem('transitops_impersonator_token', currentToken)
                            localStorage.setItem('transitops_impersonator_user', currentUser)
                            localStorage.setItem('accessToken', authPayload.access_token)
                            localStorage.setItem('user', JSON.stringify(authPayload.user))
                            
                            // Also update Zustand authStore in localStorage
                            const authStorage = {
                              state: {
                                user: authPayload.user,
                                token: authPayload.access_token,
                                isAuthenticated: true
                              },
                              version: 0
                            }
                            localStorage.setItem('auth-storage', JSON.stringify(authStorage))
                            window.location.href = '/dashboard'
                          }
                        } catch (err: any) {
                          alert(err.response?.data?.message || 'Failed to impersonate')
                        }
                      }}
                      className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
                      title="Impersonate Tenant Admin"
                    >
                      <Shield className="w-3.5 h-3.5 mr-1" /> Login As
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/companies/${company.id}`)} className="text-xs">
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                    {company.is_active ? (
                      <Button variant="outline" size="sm" onClick={() => suspendCompany(company.id)} className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
                        <Ban className="w-3.5 h-3.5 mr-1" /> Suspend
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => activateCompany(company.id)} className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Activate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {loading && !companies?.items?.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading companies...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Simple Pagination */}
        {companies && companies.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
            <Button 
              variant="outline" 
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-xs font-medium text-muted-foreground">Page {page} of {companies.total_pages}</span>
            <Button 
              variant="outline" 
              size="sm"
              disabled={page === companies.total_pages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
