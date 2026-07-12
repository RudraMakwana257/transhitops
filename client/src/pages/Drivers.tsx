import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Driver, DriverStatus, LicenseCategory } from '../types'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Plus, Shield } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'

export function Drivers() {
  const { hasRole } = useAuth()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [sorting, setSorting] = useState({ column: 'name', direction: 'asc' })
  
  const canManage = hasRole(['fleet_manager'])
  const canEditSafety = hasRole(['fleet_manager', 'safety_officer'])
  
  useEffect(() => {
    fetchDrivers()
  }, [pagination.page, filters, sorting])
  
  const fetchDrivers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.pageSize.toString(),
        ...filters,
        sort_by: sorting.column,
        sort_order: sorting.direction,
      })
      
      const res = await api.get(`/drivers?${params}`)
      if (res.data.success) {
        setDrivers(res.data.data.items)
        setPagination(prev => ({ ...prev, total: res.data.data.total, totalPages: res.data.data.total_pages }))
      }
    } catch (err) {
      console.error('Failed to fetch drivers:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const columns = [
    { key: 'name', header: 'Name', accessor: 'name', sortable: true },
    { key: 'license_number', header: 'License No', accessor: 'license_number', sortable: true },
    { key: 'license_category', header: 'Category', accessor: 'license_category', sortable: true },
    { key: 'license_expiry', header: 'Expiry', accessor: 'license_expiry', sortable: true, render: (d: Driver) => {
      const days = d.days_until_expiry
      return (
        <div>
          <p className="font-medium">{format(new Date(d.license_expiry), 'MMM d, yyyy')}</p>
          {days < 0 && <span className="text-xs text-red-600 dark:text-red-400">EXPIRED {Math.abs(days)} days ago</span>}
          {days >= 0 && days <= 30 && <span className="text-xs text-amber-600 dark:text-amber-400">Expires in {days} days</span>}
          {days > 30 && <span className="text-xs text-[var(--text-muted)]">{days} days left</span>}
        </div>
      )
    }},
    { key: 'status', header: 'Status', render: (d: Driver) => <StatusBadge status={d.status} type="driver" /> },
    { key: 'safety_score', header: 'Safety', accessor: 'safety_score', sortable: true, align: 'center' as const, render: (d: Driver) => (
      <div className="flex items-center justify-center gap-1">
        <Shield className="w-4 h-4 text-[var(--text-muted)]" />
        <span className="font-medium">{d.safety_score.toFixed(1)}</span>
      </div>
    )},
    { key: 'phone', header: 'Phone', accessor: 'phone' },
  ]
  
  const canView = hasRole(['fleet_manager', 'dispatcher', 'safety_officer'])
  
  if (!canView) return null
  
  return (
    <PageWrapper 
      title="Drivers" 
      description="Manage driver records and licenses"
      headerActions={
        canManage && <Button asChild><Link to="/drivers/new"><Plus className="w-4 h-4 mr-2" />Add Driver</Link></Button>
      }
      filters={
        <div className="flex flex-wrap gap-4">
          <Input placeholder="Search name/license..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} className="w-64" />
          <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="form-input w-40">
            <option value="">All Status</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={drivers}
        loading={loading}
        onRowClick={(d) => window.location.href = `/drivers/${d.id}`}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
        }}
        sorting={{
          column: sorting.column,
          direction: sorting.direction,
          onSort: (col) => setSorting(prev => ({ column: col, direction: prev.column === col && prev.direction === 'asc' ? 'desc' : 'asc' })),
        }}
        emptyMessage="No drivers found"
        emptyAction={canManage && <Button asChild><Link to="/drivers/new"><Plus className="w-4 h-4 mr-2" />Add Driver</Link></Button>}
      />
    </PageWrapper>
  )
}