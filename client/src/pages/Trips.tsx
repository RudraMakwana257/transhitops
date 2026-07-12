import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Trip, TripStatus } from '../types'
import { DataTable, type Column } from '../components/ui/DataTable'
import { Button } from '../components/ui/Button'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Plus, Search, Filter, Truck, MapPin, Calendar, Eye, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types'
import { toast } from '../store/toastStore'

const STATUS_COLORS: Record<TripStatus, string> = {
  Draft: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Dispatched: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function Trips() {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 15, total: 0, totalPages: 0 })
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
  
  const canManage = hasRole(['fleet_manager', 'dispatcher'] as UserRole[])
  
  useEffect(() => {
    fetchTrips()
  }, [pagination.page, filters.search, filters.status, filters.vehicle_id, filters.driver_id, filters.from_date, filters.to_date, sorting.column, sorting.direction])
  
  const fetchTrips = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.pageSize.toString(),
        ...filters,
        sort_by: sorting.column,
        sort_order: sorting.direction,
      })
      
      const res = await api.get(`/trips?${params}`)
      if (res.data.success) {
        setTrips(res.data.data.items)
        setPagination(prev => ({ ...prev, total: res.data.data.total, totalPages: res.data.data.total_pages }))
      }
    } catch (err) {
      console.error('Failed to fetch trips:', err)
      toast('Failed to load trips', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const handleRowClick = (trip: Trip) => {
    navigate(`/trips/${trip.id}`)
  }
  
  const handleAction = async (trip: Trip, action: 'dispatch' | 'complete' | 'cancel') => {
    if (action === 'dispatch') {
      try {
        await api.put(`/trips/${trip.id}/dispatch`, { confirm: true })
        toast('Trip dispatched successfully', 'success')
        fetchTrips()
      } catch (err: any) {
        toast(err.response?.data?.message || 'Failed to dispatch', 'error')
      }
    }
  }
  
  const getStatusIcon = (status: TripStatus) => {
    switch (status) {
      case 'Draft': return <Calendar className="w-3.5 h-3.5" />
      case 'Dispatched': return <Truck className="w-3.5 h-3.5" />
      case 'Completed': return <CheckCircle className="w-3.5 h-3.5" />
      case 'Cancelled': return <XCircle className="w-3.5 h-3.5" />
    }
  }
  
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
            <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
            <span>{t.source}</span>
            <span className="text-[var(--text-muted)]">→</span>
            <span>{t.destination}</span>
          </div>
          {t.vehicle && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-[var(--text-muted)]">
              <Truck className="w-3 h-3" />
              <span>{t.vehicle.name}</span>
              <span className="text-[var(--border-default)]">•</span>
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
          <div className="w-7 h-7 rounded-full bg-[var(--brand-primary-light)] flex items-center justify-center text-[var(--brand-primary)] text-xs font-medium">
            {t.driver.name.charAt(0)}
          </div>
          <span className="font-medium text-sm">{t.driver.name}</span>
        </div>
      ) : (
        <span className="text-[var(--text-muted)] text-sm">—</span>
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
        <div className="flex items-center gap-2">
          <span 
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}
          >
            {getStatusIcon(t.status)}
            {t.status}
          </span>
        </div>
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
          <div className="text-xs text-[var(--text-muted)]">{format(new Date(t.created_at), 'HH:mm')}</div>
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
              className="h-8 px-3 text-xs"
            >
              <Truck className="w-3.5 h-3.5 mr-1" />
              Dispatch
            </Button>
          )}
        </div>
      )
    },
  ]
  
  const hasActiveFilters = filters.search || filters.status || filters.vehicle_id || filters.driver_id || filters.from_date || filters.to_date
  
  return (
    <PageWrapper 
      title="Trip Center" 
      description="Create, dispatch, and manage trips"
      headerActions={
        canManage && (
          <Link to="/trips/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Trip
          </Link>
        )
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input 
              placeholder="Search trip #, route..." 
              value={filters.search} 
              onChange={(e) => setFilters({...filters, search: e.target.value})} 
              className="pl-10"
            />
          </div>
          
          {/* Status Filter */}
          <Select
            value={filters.status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({...filters, status: e.target.value})}
            options={[
              { value: '', label: 'All Status' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Dispatched', label: 'Dispatched' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
            className="w-36"
          />
          
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Input 
              type="date" 
              value={filters.from_date} 
              onChange={(e) => setFilters({...filters, from_date: e.target.value})} 
              className="w-36" 
              placeholder="From"
              title="From date"
            />
            <span className="text-[var(--text-muted)] text-sm">to</span>
            <Input 
              type="date" 
              value={filters.to_date} 
              onChange={(e) => setFilters({...filters, to_date: e.target.value})} 
              className="w-36" 
              placeholder="To"
              title="To date"
            />
          </div>
          
          {/* Advanced Filters Toggle */}
          <Button 
            variant={showFilters ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />}
          </Button>
        </div>
      }
    >
      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-default)] animate-slide-down">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Advanced Filters</h4>
            <Button variant="ghost" size="sm" onClick={() => {
              setFilters({ search: '', status: '', vehicle_id: '', driver_id: '', from_date: '', to_date: '' })
              setShowFilters(false)
            }}>
              Clear All
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              value={filters.vehicle_id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({...filters, vehicle_id: e.target.value})}
              options={[]}
              placeholder="Filter by vehicle"
              className="w-full"
            />
            <Select
              value={filters.driver_id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilters({...filters, driver_id: e.target.value})}
              options={[]}
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
        </div>
      )}
      
      {/* Quick Stats Bar */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-default)]">
          <span className="text-xs text-[var(--text-muted)]">Total:</span>
          <span className="font-medium text-[var(--text-primary)]">{pagination.total}</span>
          <span className="text-xs text-[var(--text-muted)]">trips</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <span className="text-xs text-blue-700 dark:text-blue-400">Draft:</span>
          <span className="font-medium text-blue-700 dark:text-blue-400">
            {trips.filter(t => t.status === 'Draft').length}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
          <span className="text-xs text-purple-700 dark:text-purple-400">Dispatched:</span>
          <span className="font-medium text-purple-700 dark:text-purple-400">
            {trips.filter(t => t.status === 'Dispatched').length}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <span className="text-xs text-green-700 dark:text-green-400">Completed:</span>
          <span className="font-medium text-green-700 dark:text-green-400">
            {trips.filter(t => t.status === 'Completed').length}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <span className="text-xs text-red-700 dark:text-red-400">Cancelled:</span>
          <span className="font-medium text-red-700 dark:text-red-400">
            {trips.filter(t => t.status === 'Cancelled').length}
          </span>
        </div>
      </div>
      
      <DataTable
        columns={columns}
        data={trips}
        loading={loading}
        onRowClick={handleRowClick}
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
        emptyMessage="No trips found"
        emptyAction={canManage && <Link to="/trips/new" className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" />Create Trip</Link>}
        rowClassName={(t: Trip) => `cursor-pointer hover:bg-[var(--bg-hover)] transition-colors ${
          t.status === 'Draft' ? 'border-l-4 border-l-blue-500' :
          t.status === 'Dispatched' ? 'border-l-4 border-l-purple-500' :
          t.status === 'Completed' ? 'border-l-4 border-l-green-500' :
          'border-l-4 border-l-red-500'
        }`}
      />
    </PageWrapper>
  )
}