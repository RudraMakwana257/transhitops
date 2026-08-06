import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { EmptyState } from '../components/ui/EmptyState'
import type { Expense, ExpenseType } from '../types'
import { DataTable } from '../components/ui/DataTableWrapper'
import { Button } from '../components/ui/ButtonWrapper'
import { Input } from '../components/ui/InputWrapper'
import { Select } from '../components/ui/SelectWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/CardWrapper'
import { PageWrapper } from '../components/layout/PageWrapper'
import { FilterBar, FilterChip, type FilterField } from '../components/ui/FilterBar'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { toast } from '../store/toastStore'
import type { UserRole } from '../types'

const EXPENSE_TYPES: ExpenseType[] = ['Fuel', 'Repair', 'Tyre', 'Insurance', 'Permit', 'Fine', 'Toll', 'Other']

export function Expenses() {
  const { hasRole } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState({
    vehicle_id: '',
    trip_id: '',
    type: 'Fuel' as ExpenseType,
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  })
  const [submitting, setSubmitting] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState({ search: '', type: '', vehicle_id: '', from_date: '', to_date: '' })
  const [sorting, setSorting] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'date', direction: 'desc' })
  
  const canManage = hasRole(['fleet_manager', 'dispatcher'] as UserRole[])
  
  useEffect(() => {
    fetchExpenses()
    fetchSummary()
    fetchVehicles()
  }, [pagination.page, filters.search, filters.type, filters.vehicle_id, filters.from_date, filters.to_date, sorting.column, sorting.direction])
  
  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.pageSize.toString(),
        ...filters,
        sort_by: sorting.column,
        sort_order: sorting.direction,
      })
      const res = await api.get(`/expenses?${params}`)
      if (res.data.success) {
        setExpenses(res.data.data.items)
        setPagination(prev => ({ ...prev, total: res.data.data.total, totalPages: res.data.data.total_pages }))
      }
    } catch (err) {
      toast('Failed to load expenses', 'error')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchSummary = async () => {
    try {
      const res = await api.get('/expenses/summary')
      if (res.data.success) setSummary(res.data.data)
    } catch (err) {
      toast('Failed to load summary', 'error')
    }
  }

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles?page_size=100')
      if (res.data.success) setVehicles(res.data.data.items)
    } catch (err) {
      toast('Failed to load vehicles', 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/expenses', {
        vehicle_id: formData.vehicle_id,
        trip_id: formData.trip_id,
        type: formData.type,
        amount: Number(formData.amount),
        description: formData.description,
        date: formData.date,
      })
      setShowCreate(false)
      setFormData({ vehicle_id: '', trip_id: '', type: 'Fuel' as ExpenseType, amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') })
      fetchExpenses()
      fetchSummary()
      toast('Expense added', 'success')
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to add expense', 'error')
    } finally {
      setSubmitting(false)
    }
  }
  
  const stats = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0)
    const byType = expenses.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + e.amount
      return acc
    }, {} as Record<string, number>)
    return { total, count: expenses.length, byType }
  }, [expenses])
  
  const columns = [
    { key: 'date', header: 'Date', accessor: 'date', sortable: true, render: (e: Expense) => format(new Date(e.date), 'MMM d, yyyy') },
    { key: 'vehicle', header: 'Vehicle', render: (e: Expense) => e.vehicle ? `${e.vehicle.name} (${e.vehicle.reg_number})` : '—' },
    { key: 'trip', header: 'Trip', render: (e: Expense) => e.trip?.trip_number || '—' },
    { key: 'type', header: 'Type', accessor: 'type', sortable: true },
    { key: 'amount', header: 'Amount', accessor: 'amount', sortable: true, align: 'right' as const, render: (e: Expense) => `₹${e.amount.toLocaleString()}` },
    { key: 'description', header: 'Description', accessor: 'description', render: (e: Expense) => e.description || '—' },
  ]

  const expenseFields: FilterField[] = [
    { key: 'search', type: 'text', placeholder: 'Search vehicle/trip...' },
    { key: 'type', type: 'select', options: [
      { value: '', label: 'All Types' },
      ...EXPENSE_TYPES.map(t => ({ value: t, label: t })),
    ]},
  ]
  
  const hasActiveFilters = !!(filters.search || filters.type || filters.vehicle_id || filters.from_date || filters.to_date)
  
  const clearAllFilters = () => {
    setFilters({ search: '', type: '', vehicle_id: '', from_date: '', to_date: '' })
  }

  const removeFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: '' }))
  }

  const activeFilterChips = [
    { key: 'type', label: 'Type', value: filters.type },
  ].filter(f => f.value)

  return (
    <PageWrapper 
      title="Expenses" 
      description="Track operational expenses"
      headerActions={
        canManage && <Button onClick={() => setShowCreate(true)} className="whitespace-nowrap"><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Add Expense</span><span className="sm:hidden">Add</span></Button>
      }
      filters={
        <FilterBar
          fields={expenseFields}
          values={filters}
          onChange={(v) => setFilters(v as typeof filters)}
          onClear={clearAllFilters}
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
      }
    >
      {/* Summary Stats */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border">
          <span className="text-xs text-muted-foreground">Entries:</span>
          <span className="font-semibold text-sm">{pagination.total}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <span className="text-xs text-green-700 dark:text-green-400 font-medium">Total:</span>
          <span className="font-semibold text-sm text-green-700 dark:text-green-400">₹{stats.total.toLocaleString()}</span>
        </div>
        {summary?.total_expenses && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">All Time:</span>
            <span className="font-semibold text-sm text-blue-700 dark:text-blue-400">₹{summary.total_expenses.toLocaleString()}</span>
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
      
      {/* Create Form */}
      {showCreate && (
        <Card className="mb-6 border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Select {...{ value: formData.vehicle_id, onChange: (e) => setFormData({...formData, vehicle_id: e.target.value}) }} label="Vehicle" options={vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.reg_number})` }))} placeholder="Select vehicle" />
              <Input {...{ value: formData.amount, onChange: (e) => setFormData({...formData, amount: e.target.value}) }} label="Amount (₹) *" type="number" min="0.01" step="0.01" required />
              <Select {...{ value: formData.type, onChange: (e) => setFormData({...formData, type: e.target.value as ExpenseType}) }} label="Type *" options={EXPENSE_TYPES.map(t => ({ value: t, label: t }))} placeholder="Select type" required />
              <Input type="date" {...{ value: formData.date, onChange: (e) => setFormData({...formData, date: e.target.value}) }} label="Date *" required />
              <Input {...{ value: formData.description, onChange: (e) => setFormData({...formData, description: e.target.value}) }} label="Description" className="md:col-span-2" placeholder="Details..." />
              <div className="flex justify-end gap-2 lg:col-span-4 pt-4 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Add Expense</span></Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      
      {loading ? (
        <TableSkeleton columns={6} />
      ) : expenses.length === 0 ? (
        <EmptyState 
          title="No expenses yet." 
          action={<Button onClick={() => setShowCreate(true)}>Add Expense</Button>} 
        />
      ) : (
        <DataTable
        columns={columns}
        data={expenses}
        loading={loading}
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
        emptyMessage="No expenses recorded"
      />
      )}
  
    </PageWrapper>
  )
}
