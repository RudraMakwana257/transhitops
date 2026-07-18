import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import type { MaintenanceLog, MaintenanceStatus, Vehicle } from '../types'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { PageWrapper } from '../components/layout/PageWrapper'
import { FilterBar, FilterChip, type FilterField } from '../components/ui/FilterBar'
import { Plus, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { toast } from '../store/toastStore'
import type { UserRole } from '../types'

const TABS: { key: MaintenanceStatus; label: string }[] = [
  { key: 'Open', label: 'Open' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Completed', label: 'Completed' },
]

export function Maintenance() {
  const { hasRole } = useAuth()
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<MaintenanceStatus>('Open')
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', vehicle_id: '', technician: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState({
    vehicle_id: '',
    type: '',
    description: '',
    cost: 0,
    technician: '',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    odometer_at_service: 0,
  })
  const [submitting, setSubmitting] = useState(false)
  
  const canManage = hasRole(['fleet_manager'] as UserRole[])
  
  useEffect(() => {
    fetchLogs()
    fetchVehicles()
  }, [activeTab, pagination.page, filters.search, filters.vehicle_id, filters.technician])
  
  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.pageSize.toString(),
        status: activeTab,
        ...filters,
      })
      const res = await api.get(`/maintenance?${params}`)
      if (res.data.success) {
        setLogs(res.data.data.items)
        setPagination(prev => ({ ...prev, total: res.data.data.total, totalPages: res.data.data.total_pages }))
      }
    } catch (err) {
      toast('Failed to load maintenance records', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles?page_size=100')
      if (res.data.success) setVehicles(res.data.data.items)
    } catch (err) {
      toast('Failed to load vehicles', 'error')
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.vehicle_id || !formData.type || !formData.scheduled_date) return
    
    setSubmitting(true)
    try {
      const res = await api.post('/maintenance', formData)
      if (res.data.success) {
        setShowCreate(false)
        setFormData({ vehicle_id: '', type: '', description: '', cost: 0, technician: '', scheduled_date: format(new Date(), 'yyyy-MM-dd'), odometer_at_service: 0 })
        fetchLogs()
        toast('Maintenance record created', 'success')
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to create maintenance', 'error')
    } finally {
      setSubmitting(false)
    }
  }
  
  const completeMaintenance = async (id: string) => {
    if (!confirm('Mark this maintenance as completed?')) return
    try {
      await api.put(`/maintenance/${id}/complete`, { 
        actual_cost: 0, 
        completed_date: format(new Date(), 'yyyy-MM-dd'),
        technician_notes: ''
      })
      toast('Maintenance marked as completed', 'success')
      fetchLogs()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to complete', 'error')
    }
  }
  
  const stats = useMemo(() => {
    const open = logs.filter(l => l.status === 'Open').length
    const inProgress = logs.filter(l => l.status === 'In Progress').length
    const completed = logs.filter(l => l.status === 'Completed').length
    return { open, inProgress, completed }
  }, [logs])
  
  const columns = [
    { key: 'vehicle', header: 'Vehicle', render: (l: MaintenanceLog) => l.vehicle ? `${l.vehicle.name} (${l.vehicle.reg_number})` : '—' },
    { key: 'type', header: 'Type', accessor: 'type' },
    { key: 'scheduled_date', header: 'Scheduled', accessor: 'scheduled_date', render: (l: MaintenanceLog) => l.scheduled_date ? format(new Date(l.scheduled_date), 'MMM d, yyyy') : '—' },
    { key: 'technician', header: 'Technician', accessor: 'technician' },
    { key: 'cost', header: 'Cost', accessor: 'cost', align: 'right' as const, render: (l: MaintenanceLog) => `₹${l.cost.toLocaleString()}` },
    { 
      key: 'status', 
      header: 'Status', 
      render: (l: MaintenanceLog) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={l.status} type="maintenance" />
          {l.status === 'In Progress' && canManage && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => completeMaintenance(l.id!)}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Complete
            </Button>
          )}
        </div>
      )
    },
  ]

  const maintenanceFields: FilterField[] = [
    { key: 'search', type: 'text', placeholder: 'Search vehicle/technician...' },
    { key: 'vehicle_id', type: 'select', options: [{ value: '', label: 'All Vehicles' }, ...vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.reg_number})` }))], placeholder: 'Filter by vehicle' },
    { key: 'technician', type: 'text', placeholder: 'Technician name' },
  ]
  
  const hasActiveFilters = !!(filters.search || filters.vehicle_id || filters.technician)
  
  const clearAllFilters = () => {
    setFilters({ search: '', vehicle_id: '', technician: '' })
  }

  const removeFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: '' }))
  }

  const activeFilterChips = [
    { key: 'vehicle_id', label: 'Vehicle', value: filters.vehicle_id ? vehicles.find(v => v.id === filters.vehicle_id)?.name || filters.vehicle_id : '' },
    { key: 'technician', label: 'Technician', value: filters.technician },
  ].filter(f => f.value)

  return (
    <PageWrapper 
      title="Maintenance" 
      description="Manage vehicle maintenance schedules and records"
      headerActions={
        canManage && <Button onClick={() => setShowCreate(true)} className="whitespace-nowrap"><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">New Maintenance</span></Button>
      }
      filters={
        <FilterBar
          fields={maintenanceFields}
          values={filters}
          onChange={(v) => setFilters(v as typeof filters)}
          onClear={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />
      }
    >
      {/* Tabs + Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex gap-1 bg-[var(--bg-sidebar)] rounded-lg p-1 border border-[var(--border-default)] w-fit">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPagination(prev => ({ ...prev, page: 1 })) }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-sidebar)] px-2 py-1 rounded-md border border-[var(--border-default)]">
            Total: {pagination.total}
          </span>
          {stats.open > 0 && (
            <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800 font-medium">
              {stats.open} open
            </span>
          )}
          {stats.inProgress > 0 && (
            <span className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-800 font-medium">
              {stats.inProgress} in progress
            </span>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilterChips.map(f => (
            <FilterChip key={f.key} label={f.label} value={f.value} onRemove={() => removeFilter(f.key)} />
          ))}
        </div>
      )}
      
      {/* Create Form */}
      {showCreate && (
        <Card className="mb-6 border-[var(--brand-primary-light)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create Maintenance Record</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Select
                {...{ value: formData.vehicle_id, onChange: (e) => setFormData({...formData, vehicle_id: e.target.value}) }}
                label="Vehicle *"
                options={vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.reg_number})` }))}
                placeholder="Select vehicle"
                required
              />
              <Input {...{ value: formData.type, onChange: (e) => setFormData({...formData, type: e.target.value}) }} label="Type *" placeholder="e.g., Oil Change" required />
              <Input {...{ value: formData.cost, onChange: (e) => setFormData({...formData, cost: Number(e.target.value)}) }} label="Est. Cost (₹)" type="number" min="0" step="1" />
              <Input {...{ value: formData.odometer_at_service, onChange: (e) => setFormData({...formData, odometer_at_service: Number(e.target.value)}) }} label="Odometer (km)" type="number" min="0" step="1" />
              <Input {...{ value: formData.description, onChange: (e) => setFormData({...formData, description: e.target.value}) }} label="Description" className="md:col-span-2" placeholder="Work details..." />
              <Input {...{ value: formData.technician, onChange: (e) => setFormData({...formData, technician: e.target.value}) }} label="Technician" placeholder="Workshop name" />
              <Input type="date" {...{ value: formData.scheduled_date, onChange: (e) => setFormData({...formData, scheduled_date: e.target.value}) }} label="Scheduled Date *" required />
              <div className="md:col-span-4 flex justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Create</span></Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
        }}
        emptyMessage={`No ${activeTab.toLowerCase()} maintenance records`}
        emptyAction={canManage && <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">New Maintenance</span></Button>}
      />
    </PageWrapper>
  )
}
