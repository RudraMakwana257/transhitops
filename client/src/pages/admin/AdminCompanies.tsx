import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../stores/adminStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Plus, Search, Eye, Ban, CheckCircle } from 'lucide-react'

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-slate-500 mt-1">Manage tenant organizations on the platform</p>
        </div>
        <Button onClick={() => navigate('/admin/companies/new')} className="gap-2">
          <Plus className="w-4 h-4" />
          New Company
        </Button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white shadow-sm border border-slate-200">
        <form onSubmit={handleSearch} className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </form>
        <div className="text-sm text-slate-500">
          Showing {companies?.items?.length || 0} of {companies?.total || 0} companies
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {companies?.items?.map((company: any) => (
                <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{company.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{company.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      {company.subscription?.plan?.name || 'No Plan'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {company.is_active ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">Suspended</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/companies/${company.id}`)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                    {company.is_active ? (
                      <Button variant="outline" size="sm" onClick={() => suspendCompany(company.id)} className="text-amber-600 border-amber-200 hover:bg-amber-50">
                        <Ban className="w-4 h-4 mr-1" /> Suspend
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => activateCompany(company.id)} className="text-green-600 border-green-200 hover:bg-green-50">
                        <CheckCircle className="w-4 h-4 mr-1" /> Activate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {loading && !companies?.items?.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 animate-pulse">Loading companies...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Simple Pagination */}
        {companies && companies.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <Button 
              variant="outline" 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600">Page {page} of {companies.total_pages}</span>
            <Button 
              variant="outline" 
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
