import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
// api removed
import type { Driver, UserRole } from '../types'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { FilterBar, FilterChip, type FilterField } from '../components/ui/FilterBar'
import { Plus, Shield, Users, Clock, Truck } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'

import { useDriverStore } from '../stores/driverStore'

export function Drivers() {
  const { hasRole } = useAuth()
  const { drivers, loading, pagination: storePagination, fetchDrivers } = useDriverStore()
  
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [sorting, setSorting] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'name', direction: 'asc' })
  
  const pagination = { 
    page: storePagination.page, 
    pageSize: storePagination.page_size, 
    total: storePagination.total, 
    totalPages: storePagination.total_pages 
  }
  

  
  const canManage = hasRole(['fleet_manager'] as UserRole[])
  
  useEffect(() => {
    fetchDrivers({
      page,
      page_size: 20,
      ...filters,
      sort_by: sorting.column,
      sort_order: sorting.direction,
    })
  }, [page, filters, sorting.column, sorting.direction, fetchDrivers])
  
  const stats = useMemo(() => {
    const available = drivers.filter(d => d.status === 'Available').length
    const onTrip = drivers.filter(d => d.status === 'On Trip').length
    const offDuty = drivers.filter(d => d.status === 'Off Duty').length
    const suspended = drivers.filter(d => d.status === 'Suspended').length
    const expiringSoon = drivers.filter(d => d.days_until_expiry !== undefined && d.days_until_expiry >= 0 && d.days_until_expiry <= 30).length
    return { available, onTrip, offDuty, suspended, expiringSoon }
  }, [drivers])
  
  const columns = [
    { key: 'name', header: 'Name', accessor: 'name', sortable: true },
    { key: 'license_number', header: 'License No', accessor: 'license_number', sortable: true },
    { key: 'license_category', header: 'Category', accessor: 'license_category', sortable: true },
    { key: 'license_expiry', header: 'Expiry', accessor: 'license_expiry', sortable: true, render: (d: Driver) => {
      const days = d.days_until_expiry
      return (
        <div>
          <p className="font-medium text-sm">{format(new Date(d.license_expiry), 'MMM d, yyyy')}</p>
          {days !== undefined && days < 0 && <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">EXPIRED {Math.abs(days as number)}d ago</span>}
          {days !== undefined && days >= 0 && days <= 30 && <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Expires in {days}d</span>}
          {days !== undefined && days > 30 && <span className="text-[11px] text-[var(--text-muted)]">{days}d left</span>}
        </div>
      )
    }},
    { key: 'status', header: 'Status', render: (d: Driver) => <StatusBadge status={d.status} type="driver" /> },
    { key: 'safety_score', header: 'Safety', accessor: 'safety_score', sortable: true, align: 'center' as const, render: (d: Driver) => (
      <div className="flex items-center justify-center gap-1.5">
        <Shield className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="font-semibold text-sm">{d.safety_score.toFixed(1)}</span>
      </div>
    )},
    { key: 'phone', header: 'Phone', accessor: 'phone' },
  ]
  
  const canView = hasRole(['fleet_manager', 'dispatcher', 'safety_officer'])
  
  const driverFields: FilterField[] = [
    { key: 'search', type: 'text', placeholder: 'Search name/license...' },
    { key: 'status', type: 'select', options: [
      { value: '', label: 'All Status' },
      { value: 'Available', label: 'Available' },
      { value: 'On Trip', label: 'On Trip' },
      { value: 'Off Duty', label: 'Off Duty' },
      { value: 'Suspended', label: 'Suspended' },
    ]},
  ]
  
  const hasActiveFilters = !!(filters.search || filters.status)
  
  const clearAllFilters = () => {
    setFilters({ search: '', status: '' })
  }

  const removeFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: '' }))
  }

  const activeFilterChips = [
    { key: 'status', label: 'Status', value: filters.status },
  ].filter(f => f.value)

  if (!canView) return null
  
  return (
    <PageWrapper 
      title="Drivers" 
      description="Manage driver records and licenses"
      headerActions={
        canManage && <Link to="/drivers/new" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" />Add Driver</Link>
      }
      filters={
        <FilterBar
          fields={driverFields}
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
          <Users className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)]">Total:</span>
          <span className="font-semibold text-sm">{pagination.total}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs text-green-700 dark:text-green-400">Available:</span>
          <span className="font-semibold text-sm text-green-700 dark:text-green-400">{stats.available}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs text-blue-700 dark:text-blue-400">On Trip:</span>
          <span className="font-semibold text-sm text-blue-700 dark:text-blue-400">{stats.onTrip}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs text-amber-700 dark:text-amber-400">Off Duty:</span>
          <span className="font-semibold text-sm text-amber-700 dark:text-amber-400">{stats.offDuty}</span>
        </div>
        {stats.expiringSoon > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-xs text-red-700 dark:text-red-400">License expiring:</span>
            <span className="font-semibold text-sm text-red-700 dark:text-red-400">{stats.expiringSoon}</span>
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
        <TableSkeleton columns={6} />
      ) : drivers.length === 0 ? (
        <EmptyState 
          title="No drivers yet." 
          description="Add your first driver."
          action={<Link to="/drivers/new" className="inline-flex items-center justify-center px-4 py-2 bg-[var(--brand-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-primary-hover)]">Add Driver</Link>} 
        />
      ) : (
        <DataTable
        columns={columns}
        data={drivers}
        loading={loading}
        onRowClick={(d) => window.location.href = `/drivers/${d.id}`}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (page) => setPage(page),
        }}
        sorting={{
          column: sorting.column,
          direction: sorting.direction,
          onSort: (col) => setSorting(prev => ({ column: col, direction: prev.column === col && prev.direction === 'asc' ? 'desc' : 'asc' })),
        }}
        emptyMessage="No drivers found"
        emptyAction={canManage && <Link to="/drivers/new" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Driver</Link>}
      />
      )}
    </PageWrapper>
  )
}
