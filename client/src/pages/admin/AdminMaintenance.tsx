import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Plus, Search, Edit2, Trash2, X, Building2, Calendar } from 'lucide-react'

export function AdminMaintenance() {
  const [logs, setLogs] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    company_id: '',
    vehicle_id: '',
    type: 'Scheduled Service',
    description: '',
    status: 'Open',
    cost: 0,
    technician: '',
    scheduled_date: '',
    completed_date: '',
    odometer_at_service: 0
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res: any = await adminApi.getMaintenanceLogs({
        page,
        page_size: 20,
        search,
        company_id: selectedCompanyId || undefined,
        status: selectedStatus || undefined
      })
      const data = res?.data || res || {}
      setLogs(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDependencies = async () => {
    try {
      const [compRes, vehRes]: any[] = await Promise.all([
        adminApi.getCompanies({ page: 1, page_size: 100 }),
        adminApi.getVehicles({ page: 1, page_size: 100 })
      ])
      const compData = compRes?.data || compRes || {}
      const vehData = vehRes?.data || vehRes || {}
      setCompanies(compData.items || [])
      setVehicles(vehData.items || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchDependencies()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [page, search, selectedCompanyId, selectedStatus])

  const handleOpenCreate = () => {
    const defaultComp = companies[0]?.id || ''
    const compVehs = vehicles.filter(v => v.company_id === defaultComp)
    setFormData({
      company_id: defaultComp,
      vehicle_id: compVehs[0]?.id || vehicles[0]?.id || '',
      type: 'Scheduled Service',
      description: '',
      status: 'Open',
      cost: 0,
      technician: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      completed_date: '',
      odometer_at_service: 0
    })
    setEditingLog(null)
    setError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (l: any) => {
    setFormData({
      company_id: l.company_id || '',
      vehicle_id: l.vehicle_id,
      type: l.type,
      description: l.description || '',
      status: l.status,
      cost: l.cost || 0,
      technician: l.technician || '',
      scheduled_date: l.scheduled_date || '',
      completed_date: l.completed_date || '',
      odometer_at_service: l.odometer_at_service || 0
    })
    setEditingLog(l)
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingLog) {
        await adminApi.updateMaintenanceLog(editingLog.id, formData)
      } else {
        await adminApi.createMaintenanceLog(formData)
      }
      setIsModalOpen(false)
      fetchLogs()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save maintenance record')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (l: any) => {
    if (!window.confirm(`Delete maintenance record (${l.type})?`)) return
    try {
      await adminApi.deleteMaintenanceLog(l.id)
      fetchLogs()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete record')
    }
  }

  const filteredVehicles = formData.company_id 
    ? vehicles.filter(v => v.company_id === formData.company_id)
    : vehicles

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Global Maintenance Logs</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor garage orders, parts costs, technician schedules across all tenants</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 font-semibold">
          <Plus className="w-4 h-4" />
          <span>New Work Order</span>
        </Button>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-card border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search description, technician..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
            />
          </div>

          <select
            value={selectedCompanyId}
            onChange={(e) => { setSelectedCompanyId(e.target.value); setPage(1) }}
            className="h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Organizations</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1) }}
            className="h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Total Logs: <span className="font-bold text-foreground">{total}</span>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Service Type</th>
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Vehicle</th>
                <th className="px-6 py-3.5">Status & Cost</th>
                <th className="px-6 py-3.5">Dates</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{l.type}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{l.description || 'No notes'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{l.company_name || 'Platform'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-foreground">
                    {l.vehicle_name || 'Vehicle'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mb-1 block w-max ${
                      l.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                      l.status === 'In Progress' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                      {l.status}
                    </span>
                    <div className="text-xs font-bold text-foreground">${l.cost?.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span>Sched: {l.scheduled_date || '—'}</span>
                    </div>
                    {l.completed_date && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Done: {l.completed_date}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(l)} title="Edit Log" className="text-xs text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(l)} title="Delete Log" className="text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {loading && !logs.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading maintenance logs...</td>
                </tr>
              )}
              {!loading && !logs.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No maintenance records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-foreground mb-1">
              {editingLog ? 'Edit Maintenance Work Order' : 'Create Maintenance Record'}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Record repair orders, scheduled services, and garage expenses.</p>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Organization</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">-- Select Company --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Vehicle</label>
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    required
                  >
                    <option value="">-- Select Vehicle --</option>
                    {filteredVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.reg_number})</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Service Type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Technician / Garage"
                  value={formData.technician}
                  onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                />
                <Input
                  label="Cost ($)"
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Scheduled Date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
                <Input
                  label="Completed Date"
                  type="date"
                  value={formData.completed_date}
                  onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Work Order Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description & Parts</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="font-semibold">
                  {editingLog ? 'Update Work Order' : 'Record Work Order'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
