import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Expense, ExpenseType } from '../types'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Plus, Download } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { toast } from '../store/toastStore'
import type { UserRole } from '../types'
import { FilterBar, type FilterField } from '../components/ui/FilterBar'

const EXPENSE_TYPES: ExpenseType[] = ['Fuel', 'Repair', 'Tyre', 'Insurance', 'Permit', 'Fine', 'Toll', 'Other']

export function Expenses() {
  const { hasRole } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<any>(null)
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
  const [filters, setFilters] = useState({ type: '', vehicle_id: '', from_date: '', to_date: '' })
  const [sorting, setSorting] = useState({ column: 'date', direction: 'desc' })
  
  const canManage = hasRole(['fleet_manager', 'dispatcher'] as UserRole[])
  
  useEffect(() => {
    fetchExpenses()
    fetchSummary()
  }  , [pagination.page, filters.type, filters.vehicle_id, filters.from_date, filters.to_date, sorting.column, sorting.direction])
  
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
      console.error('Failed to fetch expenses:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchSummary = async () => {
    try {
      const res = await api.get('/expenses/summary')
      if (res.data.success) setSummary(res.data.data)
    } catch (err) {
      console.error('Failed to fetch summary:', err)
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
      setFormData({ vehicle_id: '', trip_id: '', type: 'Fuel', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd') })
      fetchExpenses()
      fetchSummary()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to add expense', 'error')
    } finally {
      setSubmitting(false)
    }
  }
  
  const columns = [
    { key: 'date', header: 'Date', accessor: 'date', sortable: true, render: (e: Expense) => format(new Date(e.date), 'MMM d, yyyy') },
    { key: 'vehicle', header: 'Vehicle', render: (e: Expense) => e.vehicle ? `${e.vehicle.name} (${e.vehicle.reg_number})` : '—' },
    { key: 'trip', header: 'Trip', render: (e: Expense) => e.trip?.trip_number || '—' },
    { key: 'type', header: 'Type', accessor: 'type', sortable: true },
    { key: 'amount', header: 'Amount', accessor: 'amount', sortable: true, align: 'right' as const, render: (e: Expense) => `₹${e.amount.toLocaleString()}` },
    { key: 'description', header: 'Description', accessor: 'description' },
  ]

  const expenseFields: FilterField[] = [
    { key: 'search', type: 'text', placeholder: 'Search vehicle/trip...' },
    { key: 'type', type: 'select', options: [
      { value: '', label: 'All Types' },
      ...EXPENSE_TYPES.map(t => ({ value: t, label: t })),
    ]},
    { key: 'date', type: 'daterange' },
  ]
  
  const hasActiveFilters = filters.type || filters.vehicle_id || filters.from_date || filters.to_date
  
  const clearAllFilters = () => {
    setFilters({ type: '', vehicle_id: '', from_date: '', to_date: '' })
  }

  return (
    <PageWrapper 
      title="Expenses" 
      description="Track operational expenses"
      headerActions={
        canManage && <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
      }
      filters={
        <FilterBar
          fields={expenseFields}
          values={filters}
          onChange={setFilters}
          onClear={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
        />
      }
    >
      {showCreate && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Add Expense</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Select {...{ value: formData.vehicle_id, onChange: (e) => setFormData({...formData, vehicle_id: e.target.value}) }} label="Vehicle" options={[]} placeholder="Select vehicle" />
              <Input {...{ value: formData.amount, onChange: (e) => setFormData({...formData, amount: e.target.value}) }} label="Amount (₹) *" type="number" min="0.01" step="0.01" required />
              <Select {...{ value: formData.type, onChange: (e) => setFormData({...formData, type: e.target.value}) }} label="Type *" options={EXPENSE_TYPES.map(t => ({ value: t, label: t }))} placeholder="Select type" required />
              <Input type="date" {...{ value: formData.date, onChange: (e) => setFormData({...formData, date: e.target.value}) }} label="Date *" required />
              <Input {...{ value: formData.description, onChange: (e) => setFormData({...formData, description: e.target.value}) }} label="Description" className="md:col-span-2" placeholder="Details..." />
              <div className="flex justify-end gap-2 lg:col-span-4 pt-4 border-t border-[var(--border-default)]">
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}><Plus className="w-4 h-4 mr-2" />Add Expense</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <DataTable
        columns={[
          { key: 'date', header: 'Date', accessor: 'date', sortable: true, render: (e: Expense) => format(new Date(e.date), 'MMM d, yyyy') },
          { key: 'vehicle', header: 'Vehicle', render: (e: Expense) => e.vehicle ? `${e.vehicle.name} (${e.vehicle.reg_number})` : '—' },
          { key: 'trip', header: 'Trip', render: (e: Expense) => e.trip?.trip_number || '—' },
          { key: 'type', header: 'Type', accessor: 'type', sortable: true },
          { key: 'amount', header: 'Amount', accessor: 'amount', sortable: true, align: 'right' as const, render: (e: Expense) => `₹${e.amount.toLocaleString()}` },
          { key: 'description', header: 'Description', accessor: 'description' },
        ]}
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
    </PageWrapper>
  )
}
