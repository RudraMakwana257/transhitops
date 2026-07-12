import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Vehicle } from '../types'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { PageWrapper } from '../components/layout/PageWrapper'
import { FilterBar, type FilterField } from '../components/ui/FilterBar'
import { Plus } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types'

export function Vehicles() {
  const { hasRole } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', status: '', type: '', region: '' })
  const [sorting, setSorting] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'name', direction: 'asc' })
  
  const canManage = hasRole(['fleet_manager'] as UserRole[])
  
  useEffect(() => {
    fetchVehicles()
  }  , [pagination.page, filters.search, filters.status, filters.type, filters.region, sorting.column, sorting.direction])
  
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
  
  const vehicleFields: FilterField[] = [
    { key: 'search', type: 'text', placeholder: 'Search reg/name...' },
    { key: 'status', type: 'select', options: [
      { value: '', label: 'All Status' },
      { value: 'Available', label: 'Available' },
      { value: 'On Trip', label: 'On Trip' },
      { value: 'In Shop', label: 'In Shop' },
      { value: 'Retired', label: 'Retired' },
    ]},
    { key: 'type', type: 'select', options: [
      { value: '', label: 'All Types' },
      { value: 'Truck', label: 'Truck' },
      { value: 'Van', label: 'Van' },
      { value: 'Pickup', label: 'Pickup' },
      { value: 'Trailer', label: 'Trailer' },
      { value: 'Bus', label: 'Bus' },
      { value: 'Tanker', label: 'Tanker' },
    ]},
    { key: 'region', type: 'select', options: [
      { value: '', label: 'All Regions' },
      { value: 'Mumbai', label: 'Mumbai' },
      { value: 'Pune', label: 'Pune' },
      { value: 'Nashik', label: 'Nashik' },
      { value: 'Nagpur', label: 'Nagpur' },
    ]},
  ]
  
  const hasActiveFilters = filters.search || filters.status || filters.type || filters.region
  
  const clearAllFilters = () => {
    setFilters({ search: '', status: '', type: '', region: '' })
  }

  return (
    <PageWrapper 
      title="Fleet" 
      description="Manage your vehicle fleet"
      headerActions={
        canManage && <Link to="/vehicles/new" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" />Add Vehicle</Link>
      }
      filters={
        <FilterBar
          fields={vehicleFields}
          values={filters}
          onChange={setFilters}
          onClear={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />
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
        emptyAction={canManage && <Link to="/vehicles/new"><Plus className="w-4 h-4 mr-2" />Add Vehicle</Link>}
      />
    </PageWrapper>
  )
}