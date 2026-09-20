import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Plus, Search, Edit2, Trash2, X, Building2 } from 'lucide-react'

export function AdminExpenses() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [trips, setTrips] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedType, setSelectedType] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    company_id: '',
    vehicle_id: '',
    trip_id: '',
    type: 'Toll',
    amount: 50,
    description: '',
    date: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const res: any = await adminApi.getExpenses({
        page,
        page_size: 20,
        search,
        company_id: selectedCompanyId || undefined,
        type: selectedType || undefined
      })
      const data = res?.data || res || {}
      setExpenses(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDependencies = async () => {
    try {
      const [compRes, vehRes, tripRes]: any[] = await Promise.all([
        adminApi.getCompanies({ page: 1, page_size: 100 }),
        adminApi.getVehicles({ page: 1, page_size: 100 }),
        adminApi.getTrips({ page: 1, page_size: 100 })
      ])
      const compData = compRes?.data || compRes || {}
      const vehData = vehRes?.data || vehRes || {}
      const tripData = tripRes?.data || tripRes || {}
      setCompanies(compData.items || [])
      setVehicles(vehData.items || [])
      setTrips(tripData.items || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchDependencies()
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [page, search, selectedCompanyId, selectedType])

  const handleOpenCreate = () => {
    const defaultComp = companies[0]?.id || ''
    setFormData({
      company_id: defaultComp,
      vehicle_id: '',
      trip_id: '',
      type: 'Toll',
      amount: 50,
      description: '',
      date: new Date().toISOString().split('T')[0]
    })
    setEditingExpense(null)
    setError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (e: any) => {
    setFormData({
      company_id: e.company_id || '',
      vehicle_id: e.vehicle_id || '',
      trip_id: e.trip_id || '',
      type: e.type,
      amount: e.amount,
      description: e.description || '',
      date: e.date || ''
    })
    setEditingExpense(e)
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingExpense) {
        await adminApi.updateExpense(editingExpense.id, formData)
      } else {
        await adminApi.createExpense(formData)
      }
      setIsModalOpen(false)
      fetchExpenses()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (e: any) => {
    if (!window.confirm(`Delete expense entry (${e.type} - $${e.amount})?`)) return
    try {
      await adminApi.deleteExpense(e.id)
      fetchExpenses()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete expense')
    }
  }

  const filteredVehicles = formData.company_id 
    ? vehicles.filter(v => v.company_id === formData.company_id)
    : vehicles

  const filteredTrips = formData.company_id 
    ? trips.filter(t => t.company_id === formData.company_id)
    : trips

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Global Expenses & Outlays</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor operational expenses, tolls, fines, permits, and disbursements across tenants</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 font-semibold">
          <Plus className="w-4 h-4" />
          <span>New Expense</span>
        </Button>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-card border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm text-foreground"
            />
          </div>

          <select
            value={selectedCompanyId}
            onChange={(e) => { setSelectedCompanyId(e.target.value); setPage(1) }}
            className="h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Organizations</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setPage(1) }}
            className="h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Expense Types</option>
            <option value="Toll">Toll</option>
            <option value="Permit">Permit</option>
            <option value="Fine">Fine / Penalty</option>
            <option value="Parking">Parking</option>
            <option value="Maintenance">Maintenance Out-of-pocket</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Total Records: <span className="font-bold text-foreground">{total}</span>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Expense Item</th>
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Assigned Asset / Trip</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-muted text-foreground border border-border mr-2">
                      {e.type}
                    </span>
                    <span className="text-xs font-medium text-foreground">{e.description || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{e.company_name || 'Platform'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {e.vehicle_name && <div>🚗 {e.vehicle_name}</div>}
                    {e.trip_number && <div>🛣️ {e.trip_number}</div>}
                    {!e.vehicle_name && !e.trip_number && <span>General Org Expense</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-foreground">
                      ${e.amount?.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {e.date}
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(e)} title="Edit Expense" className="text-xs text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(e)} title="Delete Expense" className="text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {loading && !expenses.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading expenses...</td>
                </tr>
              )}
              {!loading && !expenses.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No expenses found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <span className="text-xs font-medium text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-foreground mb-1">
              {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Set cost category, amount, organizational assignment, and date.</p>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Organization</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">-- Select Company --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Expense Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="Toll">Toll</option>
                    <option value="Permit">Permit</option>
                    <option value="Fine">Fine / Penalty</option>
                    <option value="Parking">Parking</option>
                    <option value="Maintenance">Maintenance Out-of-pocket</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <Input
                  label="Amount ($)"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Vehicle (Optional)</label>
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">-- None / General --</option>
                    {filteredVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.reg_number})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Trip (Optional)</label>
                  <select
                    value={formData.trip_id}
                    onChange={(e) => setFormData({ ...formData, trip_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">-- None / General --</option>
                    {filteredTrips.map(t => (
                      <option key={t.id} value={t.id}>{t.trip_number}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description & Purpose</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="font-semibold">
                  {editingExpense ? 'Update Expense' : 'Record Expense'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
