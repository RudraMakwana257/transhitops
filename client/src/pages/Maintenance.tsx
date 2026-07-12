import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { MaintenanceLog, MaintenanceStatus, Vehicle } from '../types'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Wrench, Plus, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'

export function Maintenance() {
  const { hasRole } = useAuth()
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<MaintenanceStatus>('Open')
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
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
  
  const canManage = hasRole(['fleet_manager'])
  
  useEffect(() => {
    fetchLogs()
    fetchVehicles()
  }, [activeTab, pagination.page])
  
  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.pageSize.toString(),
        status: activeTab,
      })
      const res = await api.get(`/maintenance?${params}`)
      if (res.data.success) {
        setLogs(res.data.data.items)
        setPagination(prev => ({ ...prev, total: res.data.data.total, totalPages: res.data.data.total_pages }))
      }
    } catch (err) {
      console.error('Failed to fetch maintenance:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles?page_size=100')
      if (res.data.success) setVehicles(res.data.data.items)
    } catch (err) {
      console.error('Failed to fetch vehicles:', err)
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
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create maintenance')
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
      fetchLogs()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete')
    }
  }
  
  const columns = [
    { key: 'vehicle', header: 'Vehicle', render: (l: MaintenanceLog) => l.vehicle ? `${l.vehicle.name} (${l.vehicle.reg_number})` : '—' },
    { key: 'type', header: 'Type', accessor: 'type' },
    { key: 'scheduled_date', header: 'Scheduled', accessor: 'scheduled_date', render: (d: string) => format(new Date(d), 'MMM d, yyyy') },
    { key: 'technician', header: 'Technician', accessor: 'technician' },
    { key: 'cost', header: 'Cost', accessor: 'cost', align: 'right' as const, render: (c: number) => `₹${c.toLocaleString()}` },
    { 
      key: 'status', 
      header: 'Status', 
      render: (l: MaintenanceLog) => <StatusBadge status={l.status} type="maintenance" /> 
    },
  ]
  
  return (
    <PageWrapper 
      title="Maintenance" 
      description="Manage vehicle maintenance schedules and records"
      headerActions={
        canManage && <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />New Maintenance</Button>
      }
      filters={
        <div className="flex gap-4">
          <div className="flex gap-2 bg-[var(--bg-sidebar)] p-1 rounded-lg" role="tablist">
            {(['Open', 'In Progress', 'Completed'] as MaintenanceStatus[]).map(status => (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === status 
                    ? 'bg-[var(--brand-primary)] text-white' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                role="tab"
                aria-selected={activeTab === status}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Maintenance Record</CardTitle>
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
              <Input {...{ value: formData.type, onChange: (e) => setFormData({...formData, type: e.target.value}) }} label="Type *" placeholder="Oil Change / Brake Service" required />
              <Input {...{ value: formData.cost, onChange: (e) => setFormData({...formData, cost: Number(e.target.value)}) }} label="Estimated Cost (₹)" type="number" min="0" step="1" />
              <Input {...{ value: formData.odometer_at_service, onChange: (e) => setFormData({...formData, odometer_at_service: Number(e.target.value)}) }} label="Odometer (km)" type="number" min="0" step="1" />
              <Input {...{ value: formData.description, onChange: (e) => setFormData({...formData, description: e.target.value}) }} label="Description" className="md:col-span-2" placeholder="Work details..." />
              <Input {...{ value: formData.technician, onChange: (e) => setFormData({...formData, technician: e.target.value}) }} label="Technician" placeholder="Workshop name" />
              <Input type="date" {...{ value: formData.scheduled_date, onChange: (e) => setFormData({...formData, scheduled_date: e.target.value}) }} label="Scheduled Date *" required />
              <div className="md:col-span-4 flex justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}><Plus className="w-4 h-4 mr-2" />Create</Button>
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
        emptyAction={canManage && <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />New Maintenance</Button>}
      />
    </PageWrapper>
  )
}

function Select({ label, options, required, ...props }: any) {
  const inputId = props.id || props.name
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
      <select id={inputId} className="form-input" {...props} required={required}>
        <option value="">Select...</option>
        {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}