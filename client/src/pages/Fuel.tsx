import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { EmptyState } from '../components/ui/EmptyState'
import type { FuelLog, Vehicle, Driver } from '../types'
import { DataTable } from '../components/ui/DataTableWrapper'
import { Button } from '../components/ui/ButtonWrapper'
import { Input } from '../components/ui/InputWrapper'
import { Select } from '../components/ui/SelectWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/CardWrapper'
import { PageWrapper } from '../components/layout/PageWrapper'
import { FilterBar, FilterChip, type FilterField } from '../components/ui/FilterBar'
import { Droplets, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { toast } from '../store/toastStore'
import type { UserRole } from '../types'

export function Fuel() {
  const { hasRole } = useAuth()
  const [logs, setLogs] = useState<FuelLog[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [showCreate, setShowCreate] = useState(false)
  const [filters, setFilters] = useState({ 
    search: '', 
    vehicle_id: '', 
    driver_id: '', 
    date_from: '', 
    date_to: '' 
  })
  const [formData, setFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    trip_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    liters: '',
    price_per_liter: '',
    odometer_reading: '',
    fuel_station: '',
  })
  const [submitting, setSubmitting] = useState(false)
  
  const canManage = hasRole(['fleet_manager', 'dispatcher'] as UserRole[])
  
  useEffect(() => {
    fetchLogs()
    fetchLookups()
  }, [pagination.page, filters.search, filters.vehicle_id, filters.driver_id, filters.date_from, filters.date_to])
  
  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.pageSize.toString(),
        ...filters,
      })
      const res = await api.get(`/fuel?${params}`)
      if (res.data.success) {
        setLogs(res.data.data.items)
        setPagination(prev => ({ ...prev, total: res.data.data.total, totalPages: res.data.data.total_pages }))
      }
    } catch (err) {
      toast('Failed to load fuel records', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchLookups = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        api.get('/vehicles/available?page_size=100'),
        api.get('/drivers/available?page_size=100'),
      ])
      if (vRes.data.success) setVehicles(vRes.data.data)
      if (dRes.data.success) setDrivers(dRes.data.data)
    } catch (err) {
      toast('Failed to load vehicles', 'error')
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/fuel', {
        vehicle_id: formData.vehicle_id,
        driver_id: formData.driver_id,
        trip_id: formData.trip_id,
        date: formData.date,
        liters: Number(formData.liters),
        price_per_liter: Number(formData.price_per_liter),
        odometer_reading: formData.odometer_reading ? Number(formData.odometer_reading) : undefined,
        fuel_station: formData.fuel_station,
      })
      setShowCreate(false)
      setFormData({ vehicle_id: '', driver_id: '', trip_id: '', date: format(new Date(), 'yyyy-MM-dd'), liters: '', price_per_liter: '', odometer_reading: '', fuel_station: '' })
      fetchLogs()
      toast('Fuel log added', 'success')
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to add fuel log', 'error')
    } finally {
      setSubmitting(false)
    }
  }
  
  const stats = useMemo(() => {
    const totalLiters = logs.reduce((s, l) => s + l.liters, 0)
    const totalCost = logs.reduce((s, l) => s + l.total_cost, 0)
    return { totalLiters, totalCost, entries: logs.length }
  }, [logs])
  
  const columns = [
    { key: 'date', header: 'Date', accessor: 'date', sortable: true, render: (l: FuelLog) => format(new Date(l.date), 'MMM d, yyyy') },
    { key: 'vehicle', header: 'Vehicle', render: (l: FuelLog) => l.vehicle ? `${l.vehicle.name} (${l.vehicle.reg_number})` : '—' },
    { key: 'driver_id', header: 'Driver', render: (l: FuelLog) => l.driver_id ? drivers.find(d => d.id === l.driver_id)?.name || l.driver_id.slice(0, 8) + '…' : '—' },
    { key: 'liters', header: 'Liters', accessor: 'liters', sortable: true, align: 'right' as const, render: (l: FuelLog) => `${l.liters} L` },
    { key: 'price_per_liter', header: 'Price/L', accessor: 'price_per_liter', align: 'right' as const, render: (l: FuelLog) => `₹${l.price_per_liter}` },
    { key: 'total_cost', header: 'Total', accessor: 'total_cost', align: 'right' as const, render: (l: FuelLog) => `₹${l.total_cost.toLocaleString()}` },
    { key: 'odometer_reading', header: 'Odometer', accessor: 'odometer_reading', align: 'right' as const, render: (l: FuelLog) => l.odometer_reading ? `${l.odometer_reading.toLocaleString()} km` : '—' },
    { key: 'fuel_station', header: 'Station', accessor: 'fuel_station' },
  ]

  const fuelFields: FilterField[] = [
    { key: 'search', type: 'text', placeholder: 'Search vehicle/station...' },
    { key: 'vehicle_id', type: 'select', options: [{ value: '', label: 'All Vehicles' }, ...vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.reg_number})` }))], placeholder: 'Filter by vehicle' },
    { key: 'driver_id', type: 'select', options: [{ value: '', label: 'All Drivers' }, ...drivers.map(d => ({ value: d.id, label: d.name }))], placeholder: 'Filter by driver' },
  ]
  
  const hasActiveFilters = !!(filters.search || filters.vehicle_id || filters.driver_id || filters.date_from || filters.date_to)
  
  const clearAllFilters = () => {
    setFilters({ search: '', vehicle_id: '', driver_id: '', date_from: '', date_to: '' })
  }

  const removeFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: '' }))
  }

  const activeFilterChips = [
    { key: 'vehicle_id', label: 'Vehicle', value: filters.vehicle_id ? vehicles.find(v => v.id === filters.vehicle_id)?.name || filters.vehicle_id : '' },
    { key: 'driver_id', label: 'Driver', value: filters.driver_id ? drivers.find(d => d.id === filters.driver_id)?.name || filters.driver_id : '' },
  ].filter(f => f.value)

  return (
    <PageWrapper 
      title="Fuel Logs" 
      description="Record and track fuel consumption"
      headerActions={
        canManage && <Button onClick={() => setShowCreate(true)} className="whitespace-nowrap"><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Add Fuel Log</span><span className="sm:hidden">Add</span></Button>
      }
      filters={
        <FilterBar
          fields={fuelFields}
          values={filters}
          onChange={(v) => setFilters(v as typeof filters)}
          onClear={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        >
          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <Input 
              type="date" 
              value={filters.date_from} 
              onChange={(e) => setFilters({...filters, date_from: e.target.value})} 
              className="w-32 sm:w-36" 
              title="From date"
            />
            <span className="text-muted-foreground text-xs">—</span>
            <Input 
              type="date" 
              value={filters.date_to} 
              onChange={(e) => setFilters({...filters, date_to: e.target.value})} 
              className="w-32 sm:w-36" 
              title="To date"
            />
          </div>
        </FilterBar>
      }
    >
      {/* Summary Stats */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border">
          <Droplets className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Entries:</span>
          <span className="font-semibold text-sm">{pagination.total}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs text-blue-700 dark:text-blue-400">Total Fuel:</span>
          <span className="font-semibold text-sm text-blue-700 dark:text-blue-400">{stats.totalLiters.toFixed(1)} L</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <span className="text-xs text-green-700 dark:text-green-400 font-medium">Total Cost:</span>
          <span className="font-semibold text-sm text-green-700 dark:text-green-400">₹{stats.totalCost.toLocaleString()}</span>
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
        <Card className="mb-6 border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Fuel Log</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Select {...{ value: formData.vehicle_id, onChange: (e) => setFormData({...formData, vehicle_id: e.target.value}) }} label="Vehicle *" options={vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.reg_number})` }))} placeholder="Select vehicle" required />
              <Select {...{ value: formData.driver_id, onChange: (e) => setFormData({...formData, driver_id: e.target.value}) }} label="Driver" options={drivers.map(d => ({ value: d.id, label: d.name }))} placeholder="Select driver" />
              <Input {...{ value: formData.liters, onChange: (e) => setFormData({...formData, liters: e.target.value}) }} label="Liters *" type="number" min="0.01" step="0.01" required />
              <Input {...{ value: formData.price_per_liter, onChange: (e) => setFormData({...formData, price_per_liter: e.target.value}) }} label="Price/L (₹) *" type="number" min="0.01" step="0.01" required />
              <Input {...{ value: formData.date, onChange: (e) => setFormData({...formData, date: e.target.value}) }} type="date" label="Date *" required />
              <Input {...{ value: formData.odometer_reading, onChange: (e) => setFormData({...formData, odometer_reading: e.target.value}) }} label="Odometer (km)" type="number" min="0" step="1" />
              <Input {...{ value: formData.fuel_station, onChange: (e) => setFormData({...formData, fuel_station: e.target.value}) }} label="Fuel Station" className="md:col-span-2" placeholder="e.g., HP Petrol Pump" />
              <div className="flex justify-end gap-2 lg:col-span-4 pt-4 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Add Log</span></Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      
      {loading ? (
        <TableSkeleton columns={7} />
      ) : logs.length === 0 ? (
        <EmptyState 
          title="No fuel logs yet." 
          description="Record your first fuel consumption."
          action={<Button onClick={() => setShowCreate(true)}>Add Fuel Log</Button>} 
        />
      ) : (
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
        emptyMessage="No fuel logs recorded"
      />
      )}
  
    </PageWrapper>
  )
}
