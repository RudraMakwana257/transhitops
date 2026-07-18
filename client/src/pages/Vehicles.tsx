import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
// api removed
import type { Vehicle } from '../types'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { FilterBar, FilterChip, type FilterField } from '../components/ui/FilterBar'
import { Plus, Truck, Wrench, Ban, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

import type { UserRole } from '../types'

import { useVehicleStore } from '../stores/vehicleStore'

export function Vehicles() {
  const { hasRole } = useAuth()
  const { vehicles, loading, pagination: storePagination, fetchVehicles } = useVehicleStore()
  
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', status: '', type: '', region: '' })
  const [sorting, setSorting] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'name', direction: 'asc' })
  
  const pagination = { 
    page: storePagination.page, 
    pageSize: storePagination.page_size, 
    total: storePagination.total, 
    totalPages: storePagination.total_pages 
  }
  

  
  const canManage = hasRole(['fleet_manager'] as UserRole[])
  
  useEffect(() => {
    fetchVehicles({
      page,
      page_size: 20,
      ...filters,
      sort_by: sorting.column,
      sort_order: sorting.direction,
    })
  }, [page, filters, sorting.column, sorting.direction, fetchVehicles])
  
  const stats = useMemo(() => {
    const available = vehicles.filter(v => v.status === 'Available').length
    const onTrip = vehicles.filter(v => v.status === 'On Trip').length
    const inShop = vehicles.filter(v => v.status === 'In Shop').length
    const retired = vehicles.filter(v => v.status === 'Retired').length
    return { available, onTrip, inShop, retired }
  }, [vehicles])
  
  const columns = [
    { key: 'reg_number', header: 'Reg No', accessor: 'reg_number', sortable: true },
    { key: 'name', header: 'Name', accessor: 'name', sortable: true },
    { key: 'type', header: 'Type', accessor: 'type', sortable: true },
    { key: 'capacity_kg', header: 'Capacity (kg)', accessor: 'capacity_kg', sortable: true, align: 'right' as const, render: (v: Vehicle) => v.capacity_kg.toLocaleString() },
    { key: 'status', header: 'Status', render: (v: Vehicle) => <StatusBadge status={v.status} type="vehicle" /> },
    { key: 'region', header: 'Region', accessor: 'region' },
    { key: 'health_score', header: 'Health', accessor: 'health_score', sortable: true, align: 'center' as const, render: (v: Vehicle) => v.health_score ? (
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-sm font-medium">{v.health_score}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
          v.health_grade === 'Excellent' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          v.health_grade === 'Good' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
          v.health_grade === 'Fair' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
          v.health_grade === 'Poor' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
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
  
  const hasActiveFilters = !!(filters.search || filters.status || filters.type || filters.region)
  
  const clearAllFilters = () => {
    setFilters({ search: '', status: '', type: '', region: '' })
  }

  const removeFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: '' }))
  }

  const activeFilterChips = [
    { key: 'status', label: 'Status', value: filters.status },
    { key: 'type', label: 'Type', value: filters.type },
    { key: 'region', label: 'Region', value: filters.region },
  ].filter(f => f.value)

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
          onChange={(v) => setFilters(v as typeof filters)}
          onClear={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />
      }
    >
      {/* Summary Stats */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-default)]">
          <Truck className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)]">Total:</span>
          <span className="font-semibold text-sm">{pagination.total}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-700 dark:text-green-400">Available:</span>
          <span className="font-semibold text-sm text-green-700 dark:text-green-400">{stats.available}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs text-blue-700 dark:text-blue-400">On Trip:</span>
          <span className="font-semibold text-sm text-blue-700 dark:text-blue-400">{stats.onTrip}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs text-amber-700 dark:text-amber-400">In Shop:</span>
          <span className="font-semibold text-sm text-amber-700 dark:text-amber-400">{stats.inShop}</span>
        </div>
        {stats.retired > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-xs text-red-700 dark:text-red-400">Retired:</span>
            <span className="font-semibold text-sm text-red-700 dark:text-red-400">{stats.retired}</span>
          </div>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilterChips.map(f => (
            <FilterChip key={f.key} label={f.label} value={f.value} onRemove={() => removeFilter(f.key)} />
          ))}
        </div>
      )}

      
      {loading ? (
        <TableSkeleton columns={7} />
      ) : vehicles.length === 0 ? (
        <EmptyState 
          title="No vehicles yet." 
          description="Add your first vehicle."
          action={<Link to="/vehicles/new" className="inline-flex items-center justify-center px-4 py-2 bg-[var(--brand-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-primary-hover)]">Add Vehicle</Link>} 
        />
      ) : (
        <DataTable
        columns={columns}
        data={vehicles}
        loading={loading}
        onRowClick={(v) => window.location.href = `/vehicles/${v.id}`}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (page) => setPage(page),
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
        emptyAction={canManage && <Link to="/vehicles/new" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Vehicle</Link>}
      />
      )}
    </PageWrapper>
  )
}
