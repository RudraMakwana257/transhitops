import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { FuelLog, Vehicle, Driver } from '../types'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Droplets, Plus, Search, Filter, Fuel as FuelIcon, Truck } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'

export function Fuel() {
  const { hasRole } = useAuth()
  const [logs, setLogs] = useState<FuelLog[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [showCreate, setShowCreate] = useState(false)
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
  
  const canManage = hasRole(['fleet_manager', 'dispatcher'])
  
  useEffect(() => {
    fetchLogs()
    fetchLookups()
  }, [pagination.page])
  
  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/fuel?page=${pagination.page}&page_size=${pagination.pageSize}`)
      if (res.data.success) {
        setLogs(res.data.data.items)
        setPagination(prev => ({ ...prev, total: res.data.data.total, totalPages: res.data.data.total_pages }))
      }
    } catch (err) {
      console.error('Failed to fetch fuel:', err)
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
      console.error('Failed to fetch lookups:', err)
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add fuel log')
    } finally {
      setSubmitting(false)
    }
  }
  
  const columns = [
    { key: 'date', header: 'Date', accessor: 'date', sortable: true, render: (d: string) => format(new Date(d), 'MMM d, yyyy') },
    { key: 'vehicle', header: 'Vehicle', render: (l: FuelLog) => l.vehicle ? `${l.vehicle.name} (${l.vehicle.reg_number})` : '—' },
    { key: 'driver', header: 'Driver', render: (l: FuelLog) => l.driver?.name || '—' },
    { key: 'liters', header: 'Liters', accessor: 'liters', sortable: true, align: 'right' as const, render: (v: number) => `${v} L` },
    { key: 'price_per_liter', header: 'Price/L', accessor: 'price_per_liter', align: 'right' as const, render: (v: number) => `₹${v}` },
    { key: 'total_cost', header: 'Total', accessor: 'total_cost', align: 'right' as const, render: (v: number) => `₹${v.toLocaleString()}` },
    { key: 'odometer_reading', header: 'Odometer', accessor: 'odometer_reading', align: 'right' as const, render: (v: number | null) => v ? `${v.toLocaleString()} km` : '—' },
    { key: 'fuel_station', header: 'Station', accessor: 'fuel_station' },
  ]
  
  return (
    <PageWrapper 
      title="Fuel Logs" 
      description="Record and track fuel consumption"
      headerActions={
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />Add Fuel Log</Button>
      }
    >
      {showCreate && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Add Fuel Log</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Select {...{ value: formData.vehicle_id, onChange: (e) => setFormData({...formData, vehicle_id: e.target.value}) }} label="Vehicle *" options={vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.reg_number})` }))} placeholder="Select vehicle" required />
              <Select {...{ value: formData.driver_id, onChange: (e) => setFormData({...formData, driver_id: e.target.value}) }} label="Driver" options={drivers.map(d => ({ value: d.id, label: d.name }))} placeholder="Select driver" />
              <Input {...{ value: formData.liters, onChange: (e) => setFormData({...formData, liters: e.target.value}) }} label="Liters *" type="number" min="0.01" step="0.01" required />
              <Input {...{ value: formData.price_per_liter, onChange: (e) => setFormData({...formData, price_per_liter: e.target.value}) }} label="Price/L (₹) *" type="number" min="0.01" step="0.01" required />
              <Input {...{ value: formData.date, onChange: (e) => setFormData({...formData, date: e.target.value}) }} type="date" label="Date *" required />
              <Input {...{ value: formData.odometer_reading, onChange: (e) => setFormData({...formData, odometer_reading: e.target.value}) }} label="Odometer (km)" type="number" min="0" step="1" />
              <Input {...{ value: formData.fuel_station, onChange: (e) => setFormData({...formData, fuel_station: e.target.value}) }} label="Fuel Station" className="md:col-span-2" placeholder="e.g., HP Petrol Pump" />
              <div className="flex justify-end gap-2 lg:col-span-4 pt-4 border-t border-[var(--border-default)]">
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}><Plus className="w-4 h-4 mr-2" />Add Log</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <DataTable
        columns={[
          { key: 'date', header: 'Date', accessor: 'date', sortable: true, render: (d: string) => format(new Date(d), 'MMM d, yyyy') },
          { key: 'vehicle', header: 'Vehicle', render: (l: FuelLog) => l.vehicle ? `${l.vehicle.name} (${l.vehicle.reg_number})` : '—' },
          { key: 'driver', header: 'Driver', render: (l: FuelLog) => l.driver?.name || '—' },
          { key: 'liters', header: 'Liters', accessor: 'liters', sortable: true, align: 'right' as const, render: (v: number) => `${v} L` },
          { key: 'price_per_liter', header: 'Price/L', accessor: 'price_per_liter', align: 'right' as const, render: (v: number) => `₹${v}` },
          { key: 'total_cost', header: 'Total', accessor: 'total_cost', align: 'right' as const, render: (v: number) => `₹${v.toLocaleString()}` },
          { key: 'odometer_reading', header: 'Odometer', accessor: 'odometer_reading', align: 'right' as const, render: (v: number | null) => v ? `${v.toLocaleString()} km` : '—' },
          { key: 'fuel_station', header: 'Station', accessor: 'fuel_station' },
        ]}
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

function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
}