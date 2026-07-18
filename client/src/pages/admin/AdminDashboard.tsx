import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAdminStore } from '../../stores/adminStore'
import { Building2, Users, Truck, Activity } from 'lucide-react'
import { Card } from '../../components/ui/Card'

export function AdminDashboard() {
  const { dashboardStats, loading, error, fetchDashboardStats, companies, fetchCompanies } = useAdminStore()

  useEffect(() => {
    fetchDashboardStats()
    fetchCompanies({ page: 1, page_size: 5 })
  }, [fetchDashboardStats, fetchCompanies])

  if (loading && !dashboardStats) {
    return <div className="text-slate-500 animate-pulse">Loading dashboard...</div>
  }

  if (error) {
    return <div className="text-red-500">Error loading dashboard: {error}</div>
  }

  const stats = [
    { label: 'Total Companies', value: dashboardStats?.total_companies || 0, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Active Companies', value: dashboardStats?.active_companies || 0, icon: Activity, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Platform Users', value: dashboardStats?.total_users || 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Registered Vehicles', value: dashboardStats?.total_vehicles || 0, icon: Truck, color: 'text-amber-600', bg: 'bg-amber-100' }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
        <p className="text-slate-500 mt-1">Key metrics across all TransitOps tenants</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Companies</h2>
          <Link to="/admin/companies" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View all companies &rarr;
          </Link>
        </div>
        
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {companies?.items?.map((company: any) => (
                <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link to={`/admin/companies/${company.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {company.name}
                    </Link>
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
                </tr>
              ))}
              {!companies?.items?.length && !loading && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No companies found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
