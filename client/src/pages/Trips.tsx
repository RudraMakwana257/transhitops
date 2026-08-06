import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Trip, TripStatus, Vehicle, Driver } from '../types'
import { useVehicleStore } from '../stores/vehicleStore'
import { useDriverStore } from '../stores/driverStore'
import { DataTable, type Column } from '../components/ui/DataTableWrapper'
import { Button } from '../components/ui/ButtonWrapper'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/InputWrapper'
import { Select } from '../components/ui/SelectWrapper'
import { FilterBar, AdvancedFiltersPanel, FilterChip, type FilterField } from '../components/ui/FilterBar'
import { Plus, Truck, MapPin, Calendar, Eye, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types'
import { toast } from '../store/toastStore'

const STATUS_COLORS: Record<TripStatus, string> = {
  Draft: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Dispatched: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'In Transit': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

import { useTripStore } from '../stores/tripStore'

export function Trips() {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const { trips, loading, pagination: storePagination, fetchTrips, dispatchTrip, completeTrip, cancelTrip } = useTripStore()
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ 
    search: '', 
    status: '', 
    vehicle_id: '', 
    driver_id: '', 
    from_date: '', 
    to_date: '' 
  })
  const [sorting, setSorting] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'created_at', direction: 'desc' })
  const [showFilters, setShowFilters] = useState(false)
  
  const pagination = { 
    page: storePagination.page, 
    pageSize: storePagination.page_size, 
    total: storePagination.total, 
    totalPages: storePagination.total_pages 
  }
  

  
  const canManage = hasRole(['fleet_manager', 'dispatcher'] as UserRole[])
  
  useEffect(() => {
    fetchTrips({
      page,
      page_size: 15,
      ...filters,
      sort_by: sorting.column,
      sort_order: sorting.direction,
    })
  }, [page, filters, sorting.column, sorting.direction, fetchTrips])

  useEffect(() => {
    fetchLookups()
  }, [])

  const fetchLookups = async () => {
    try {
      useVehicleStore.getState().fetchVehicles({ page_size: 100 }).then(() => {
        setVehicles(useVehicleStore.getState().vehicles)
      })
      useDriverStore.getState().fetchDrivers({ page_size: 100 }).then(() => {
        setDrivers(useDriverStore.getState().drivers)
      })
    } catch (err) {
      toast('Failed to load vehicle/driver data', 'error')
    }
  }
  
  const handleRowClick = (trip: Trip) => {
    navigate(`/trips/${trip.id}`)
  }
  
  const handleAction = async (trip: Trip, action: 'dispatch' | 'complete' | 'cancel') => {
    try {
      if (action === 'dispatch') {
        await dispatchTrip(trip.id)
        toast('Trip dispatched successfully', 'success')
      } else if (action === 'complete') {
        // Assume default complete params for the list view action
        await completeTrip(trip.id, { actual_distance_km: trip.planned_distance_km || 0, end_odometer: 0 })
        toast('Trip completed successfully', 'success')
      } else if (action === 'cancel') {
        await cancelTrip(trip.id, 'Cancelled from list')
        toast('Trip cancelled successfully', 'success')
      }
    } catch (err: any) {
      toast(err.response?.data?.message || `Failed to ${action} trip`, 'error')
    }
  }
  
  const getStatusIcon = (status: TripStatus) => {
    switch (status) {
      case 'Draft': return <Calendar className="w-3.5 h-3.5" />
      case 'Dispatched': return <Truck className="w-3.5 h-3.5" />
      case 'In Transit': return <MapPin className="w-3.5 h-3.5" />
      case 'Completed': return <CheckCircle className="w-3.5 h-3.5" />
      case 'Cancelled': return <XCircle className="w-3.5 h-3.5" />
    }
  }
  
  const stats = useMemo(() => ({
    draft: trips.filter(t => t.status === 'Draft').length,
    dispatched: trips.filter(t => t.status === 'Dispatched').length,
    completed: trips.filter(t => t.status === 'Completed').length,
    cancelled: trips.filter(t => t.status === 'Cancelled').length,
  }), [trips])
  
  const columns: Column<Trip>[] = [
    { 
      key: 'trip_number', 
      header: 'Trip No', 
      accessor: 'trip_number', 
      sortable: true,
      width: '120px',
      render: (t: Trip) => (
        <span className="font-mono font-medium text-sm">{t.trip_number}</span>
      )
    },
    { 
      key: 'route', 
      header: 'Route', 
      width: '280px',
      render: (t: Trip) => (
        <div>
          <div className="flex items-center gap-2 font-medium text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{t.source}</span>
            <span className="text-muted-foreground flex-shrink-0">→</span>
            <span className="truncate">{t.destination}</span>
          </div>
          {t.vehicle && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Truck className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{t.vehicle.name}</span>
              <span className="text-border">•</span>
              <span className="font-mono">{t.vehicle.reg_number}</span>
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'driver', 
      header: 'Driver', 
      width: '160px',
      render: (t: Trip) => t.driver ? (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium flex-shrink-0">
            {t.driver.name.charAt(0)}
          </div>
          <span className="font-medium text-sm truncate">{t.driver.name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      )
    },
    { 
      key: 'cargo', 
      header: 'Cargo (kg)', 
      accessor: 'cargo_weight_kg', 
      sortable: true, 
      align: 'right',
      width: '100px',
      render: (t: Trip) => <span className="font-mono text-sm">{t.cargo_weight_kg.toLocaleString()}</span>
    },
    { 
      key: 'status', 
      header: 'Status', 
      width: '130px',
      render: (t: Trip) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>
          {getStatusIcon(t.status)}
          {t.status}
        </span>
      )
    },
    { 
      key: 'date', 
      header: 'Created', 
      accessor: 'created_at', 
      sortable: true,
      width: '140px',
      render: (t: Trip) => (
        <div className="text-sm">
          <div>{format(new Date(t.created_at), 'MMM d, yyyy')}</div>
          <div className="text-xs text-muted-foreground">{format(new Date(t.created_at), 'HH:mm')}</div>
        </div>
      )
    },
    { 
      key: 'actions', 
      header: '', 
      width: '100px',
      render: (t: Trip) => (
        <div className="flex items-center justify-end gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); handleRowClick(t) }}
            className="h-8 w-8 p-0"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {canManage && t.status === 'Draft' && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); handleAction(t, 'dispatch') }}
              className="h-8 px-3 text-xs whitespace-nowrap"
            >
              <Truck className="w-3.5 h-3.5 mr-1" />
              Dispatch
            </Button>
          )}
        </div>
      )
    },
  ]
  
  const hasActiveFilters = !!(filters.search || filters.status || filters.vehicle_id || filters.driver_id || filters.from_date || filters.to_date)
  
  const clearAllFilters = () => {
    setFilters({ search: '', status: '', vehicle_id: '', driver_id: '', from_date: '', to_date: '' })
  }

  const removeFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: '' }))
  }

  const activeFilterChips = [
    { key: 'status', label: 'Status', value: filters.status },
    { key: 'vehicle_id', label: 'Vehicle', value: filters.vehicle_id ? vehicles.find(v => v.id === filters.vehicle_id)?.name || filters.vehicle_id : '' },
    { key: 'driver_id', label: 'Driver', value: filters.driver_id ? drivers.find(d => d.id === filters.driver_id)?.name || filters.driver_id : '' },
  ].filter(f => f.value)

  const tripFields: FilterField[] = [
    { key: 'search', type: 'text', placeholder: 'Search trip #, route...' },
    { key: 'status', type: 'select', options: [
      { value: '', label: 'All Status' },
      { value: 'Draft', label: 'Draft' },
      { value: 'Dispatched', label: 'Dispatched' },
      { value: 'Completed', label: 'Completed' },
      { value: 'Cancelled', label: 'Cancelled' },
    ]},
  ]
  
  return (
    <PageWrapper 
      title="Trip Center" 
      description="Create, dispatch, and manage trips"
      headerActions={
        canManage && (
          <Link to="/trips/new" className="btn-primary inline-flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Trip</span>
            <span className="sm:hidden">New</span>
          </Link>
        )
      }
      filters={
        <>
          <FilterBar
            fields={tripFields}
            values={filters}
            onChange={(v) => setFilters(v as typeof filters)}
            onClear={clearAllFilters}
            onToggleAdvanced={() => setShowFilters(!showFilters)}
            showAdvanced={showFilters}
            hasActiveFilters={hasActiveFilters}
          >
            {/* Date Range */}
            <div className="flex items-center gap-1.5">
              <Input 
                type="date" 
                value={filters.from_date} 
                onChange={(e) => setFilters({...filters, from_date: e.target.value})} 
                className="w-32 sm:w-36" 
                title="From date"
              />
              <span className="text-muted-foreground text-xs">—</span>
              <Input 
                type="date" 
                value={filters.to_date} 
                onChange={(e) => setFilters({...filters, to_date: e.target.value})} 
                className="w-32 sm:w-36" 
                title="To date"
              />
            </div>
          </FilterBar>

          {/* Advanced Filters Panel */}
          <AdvancedFiltersPanel isOpen={showFilters} onClose={() => setShowFilters(false)} onClear={clearAllFilters}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select
                value={filters.vehicle_id}
                onChange={(e) => setFilters({...filters, vehicle_id: e.target.value})}
                options={[{ value: '', label: 'All Vehicles' }, ...vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.reg_number})` }))]}
                placeholder="Filter by vehicle"
                className="w-full"
              />
              <Select
                value={filters.driver_id}
                onChange={(e) => setFilters({...filters, driver_id: e.target.value})}
                options={[{ value: '', label: 'All Drivers' }, ...drivers.map(d => ({ value: d.id, label: d.name }))]}
                placeholder="Filter by driver"
                className="w-full"
              />
              <Input 
                type="date" 
                value={filters.from_date} 
                onChange={(e) => setFilters({...filters, from_date: e.target.value})} 
                placeholder="From date"
                className="w-full"
              />
              <Input 
                type="date" 
                value={filters.to_date} 
                onChange={(e) => setFilters({...filters, to_date: e.target.value})} 
                placeholder="To date"
                className="w-full"
              />
            </div>
          </AdvancedFiltersPanel>
        </>
      }
    >
      {/* Quick Stats Bar */}
      <div className="flex flex-wrap gap-2 sm:gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border">
          <span className="text-xs text-muted-foreground">Total:</span>
          <span className="font-semibold text-sm">{pagination.total}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <span className="text-xs text-blue-700 dark:text-blue-400">Draft:</span>
          <span className="font-semibold text-sm text-blue-700 dark:text-blue-400">{stats.draft}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
          <span className="text-xs text-purple-700 dark:text-purple-400">Dispatched:</span>
          <span className="font-semibold text-sm text-purple-700 dark:text-purple-400">{stats.dispatched}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <span className="text-xs text-green-700 dark:text-green-400">Completed:</span>
          <span className="font-semibold text-sm text-green-700 dark:text-green-400">{stats.completed}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <span className="text-xs text-red-700 dark:text-red-400">Cancelled:</span>
          <span className="font-semibold text-sm text-red-700 dark:text-red-400">{stats.cancelled}</span>
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
      
      
      {loading ? (
        <TableSkeleton columns={8} />
      ) : trips.length === 0 ? (
        <EmptyState 
          title="No trips yet." 
          description="Create your first trip."
          action={<Link to="/trips/new" className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90">Create Trip</Link>} 
        />
      ) : (
        <DataTable
        columns={columns}
        data={trips}
        loading={loading}
        onRowClick={handleRowClick}
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
        emptyMessage="No trips found"
        emptyAction={canManage && <Link to="/trips/new" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Create Trip</Link>}
        rowClassName={(t: Trip) => `cursor-pointer hover:hover:bg-accent hover:text-accent-foreground transition-colors ${
          t.status === 'Draft' ? 'border-l-4 border-l-blue-500' :
          t.status === 'Dispatched' ? 'border-l-4 border-l-purple-500' :
          t.status === 'Completed' ? 'border-l-4 border-l-green-500' :
          'border-l-4 border-l-red-500'
        }`}
      />
      )}
    </PageWrapper>
  )
}
