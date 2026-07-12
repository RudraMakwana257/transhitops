import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Trip, TripStatus } from '../types'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { PageWrapper } from '../components/layout/PageWrapper'
import { MapPin, Plus, Search, Filter, ChevronUp, ChevronDown, Play, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'

export function Trips() {
  const { hasRole } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', status: '', vehicle_id: '', driver_id: '', from_date: '', to_date: '' })
  const [sorting, setSorting] = useState({ column: 'created_at', direction: 'desc' })
  
  const canManage = hasRole(['fleet_manager', 'dispatcher'])
  
  useEffect(() => {
    fetchTrips()
  }, [pagination.page, filters, sorting])
  
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
    } finally {
      setLoading(false)
    }
  }
  
  const columns = [
    { key: 'trip_number', header: 'Trip No', accessor: 'trip_number', sortable: true },
    { key: 'route', header: 'Route', render: (t: Trip) => (
      <div>
        <p className="font-medium text-sm">{t.source} → {t.destination}</p>
        <p className="text-xs text-[var(--text-muted)]">{t.vehicle?.name} ({t.vehicle?.reg_number})</p>
      </div>
    )},
    { key: 'driver', header: 'Driver', render: (t: Trip) => t.driver?.name },
    { key: 'cargo_weight_kg', header: 'Cargo (kg)', accessor: 'cargo_weight_kg', sortable: true, align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { 
      key: 'status', 
      header: 'Status', 
      render: (t: Trip) => <StatusBadge status={t.status} type="trip" /> 
    },
    { key: 'date', header: 'Date', accessor: 'created_at', sortable: true, render: (d: string) => format(new Date(d), 'MMM d, yyyy HH:mm') },
  ]
  
  return (
    <PageWrapper 
      title="Trip Center" 
      description="Create, dispatch, and manage trips"
      headerActions={
        canManage && <Button asChild><Link to="/trips/new"><Plus className="w-4 h-4 mr-2" />Create Trip</Link></Button>
      }
      filters={
        <div className="flex flex-wrap gap-4">
          <Input placeholder="Search trip/route..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} className="w-64" />
          <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="form-input w-40">
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <Input type="date" value={filters.from_date} onChange={(e) => setFilters({...filters, from_date: e.target.value})} className="w-40" placeholder="From" />
          <Input type="date" value={filters.to_date} onChange={(e) => setFilters({...filters, to_date: e.target.value})} className="w-40" placeholder="To" />
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={trips}
        loading={loading}
        onRowClick={(t) => window.location.href = `/trips/${t.id}`}
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
        emptyAction={canManage && <Button asChild><Link to="/trips/new"><Plus className="w-4 h-4 mr-2" />Create Trip</Link></Button>}
      />
    </PageWrapper>
  )
}

export function TripDetail({ match }: { match: { params: { id: string } } }) {
  // Simplified - in real app use React Router v6 useParams
  return <div>Trip Detail - {match.params.id}</div>
}