import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Vehicle, VehicleStatus } from '../types'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Truck, Plus, Search, Filter, Truck as TruckIcon, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function Vehicles() {
  const { hasRole } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', status: '', type: '', region: '' })
  const [sorting, setSorting] = useState({ column: 'name', direction: 'asc' })
  
  const canManage = hasRole(['fleet_manager'])
  
  useEffect(() => {
    fetchVehicles()
  }, [pagination.page, filters, sorting])
  
  const fetchVehicles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.pageSize.toString(),
        ...filters,
        sort_by: sorting.column,
        sort_order: sorting.direction,
      })
      
      const res = await api.get(`/vehicles?${params}`)
      if (res.data.success) {
        setVehicles(res.data.data.items)
        setPagination(prev => ({ ...prev, total: res.data.data.total, totalPages: res.data.data.total_pages }))
      }
    } catch (err) {
      console.error('Failed to fetch vehicles:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const columns = [
    { key: 'reg_number', header: 'Reg No', accessor: 'reg_number', sortable: true },
    { key: 'name', header: 'Name', accessor: 'name', sortable: true },
    { key: 'type', header: 'Type', accessor: 'type', sortable: true },
    { key: 'capacity_kg', header: 'Capacity (kg)', accessor: 'capacity_kg', sortable: true, align: 'right' as const, render: (v: Vehicle) => v.capacity_kg.toLocaleString() },
    { key: 'status', header: 'Status', render: (v: Vehicle) => <StatusBadge status={v.status} type="vehicle" /> },
    { key: 'region', header: 'Region', accessor: 'region' },
    { key: 'health_score', header: 'Health', accessor: 'health_score', sortable: true, align: 'center' as const, render: (v: Vehicle) => v.health_score ? (
      <div className="flex items-center justify-center gap-1">
        <span className="text-sm font-medium">{v.health_score}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${v.health_grade === 'Excellent' ? 'bg-green-100 text-green-700' : v.health_grade === 'Good' ? 'bg-blue-100 text-blue-700' : v.health_grade === 'Fair' ? 'bg-amber-100 text-amber-700' : v.health_grade === 'Poor' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
          {v.health_grade}
        </span>
      </div>
    ) : '—' },
  ]
  
  return (
    <PageWrapper 
      title="Fleet" 
      description="Manage your vehicle fleet"
      headerActions={
        canManage && <Button asChild><Link to="/vehicles/new"><Plus className="w-4 h-4 mr-2" />Add Vehicle</Link></Button>
      }
      filters={
        <div className="flex flex-wrap gap-4">
          <Input placeholder="Search reg/name..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} className="w-64" />
          <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="form-input w-40">
            <option value="">All Status</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
          <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})} className="form-input w-40">
            <option value="">All Types</option>
            <option value="Truck">Truck</option>
            <option value="Van">Van</option>
            <option value="Pickup">Pickup</option>
            <option value="Trailer">Trailer</option>
            <option value="Bus">Bus</option>
            <option value="Tanker">Tanker</option>
          </select>
          <select value={filters.region} onChange={(e) => setFilters({...filters, region: e.target.value})} className="form-input w-40">
            <option value="">All Regions</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Pune">Pune</option>
            <option value="Nashik">Nashik</option>
            <option value="Nagpur">Nagpur</option>
          </select>
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={vehicles}
        loading={loading}
        onRowClick={(v) => window.location.href = `/vehicles/${v.id}`}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
        }}
        sorting={{
          column: sorting.column,
          direction: sorting.direction,
          onSort: (col) => setSorting(prev => ({ 
            column: col, 
            direction: prev.column === col && prev.direction === 'asc' ? 'desc' : 'asc' 
          })),
        }}
        emptyMessage="No vehicles found"
        emptyAction={canManage && <Button asChild><Link to="/vehicles/new"><Plus className="w-4 h-4 mr-2" />Add Vehicle</Link></Button>}
      />
    </PageWrapper>
  )
}