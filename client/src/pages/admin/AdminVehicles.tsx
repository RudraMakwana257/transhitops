import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Plus, Search, Edit2, Trash2, X, Building2 } from 'lucide-react'

export function AdminVehicles() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    company_id: '',
    reg_number: '',
    name: '',
    type: 'Truck',
    capacity_kg: 1000,
    acquisition_cost: 0,
    odometer_km: 0,
    status: 'Available',
    region: 'HQ'
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchVehicles = async () => {
    setLoading(true)
    try {
      const res: any = await adminApi.getVehicles({
        page,
        page_size: 20,
        search,
        company_id: selectedCompanyId || undefined,
        status: selectedStatus || undefined
      })
      const data = res?.data || res || {}
      setVehicles(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanies = async () => {
    try {
      const res: any = await adminApi.getCompanies({ page: 1, page_size: 100 })
      const data = res?.data || res || {}
      setCompanies(data.items || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    fetchVehicles()
  }, [page, search, selectedCompanyId, selectedStatus])

  const handleOpenCreate = () => {
    setFormData({
      company_id: companies[0]?.id || '',
      reg_number: '',
      name: '',
      type: 'Truck',
      capacity_kg: 1000,
      acquisition_cost: 0,
      odometer_km: 0,
      status: 'Available',
      region: 'HQ'
    })
    setEditingVehicle(null)
    setError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (v: any) => {
    setFormData({
      company_id: v.company_id || '',
      reg_number: v.reg_number,
      name: v.name,
      type: v.type,
      capacity_kg: v.capacity_kg,
      acquisition_cost: v.acquisition_cost,
      odometer_km: v.odometer_km,
      status: v.status,
      region: v.region || 'HQ'
    })
    setEditingVehicle(v)
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingVehicle) {
        await adminApi.updateVehicle(editingVehicle.id, formData)
      } else {
        await adminApi.createVehicle(formData)
      }
      setIsModalOpen(false)
      fetchVehicles()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save vehicle')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (v: any) => {
    if (!window.confirm(`Are you sure you want to delete vehicle ${v.name} (${v.reg_number})?`)) return
    try {
      await adminApi.deleteVehicle(v.id)
      fetchVehicles()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete vehicle')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Global Fleet Assets</h1>
          <p className="text-muted-foreground mt-1 text-sm">Cross-tenant inventory, maintenance statuses, capacity, and telemetry</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 font-semibold">
          <Plus className="w-4 h-4" />
          <span>New Vehicle</span>
        </Button>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-card border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reg number, name..."
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
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1) }}
            className="h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Out of Service">Out of Service</option>
          </select>
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Total Vehicles: <span className="font-bold text-foreground">{total}</span>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Vehicle</th>
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Type & Capacity</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Odometer</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{v.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{v.reg_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{v.company_name || 'Platform'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-foreground font-medium text-xs">{v.type}</div>
                    <div className="text-xs text-muted-foreground">{v.capacity_kg?.toLocaleString()} kg</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      v.status === 'Available' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                      v.status === 'On Trip' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                      v.status === 'In Shop' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                      'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                    {v.odometer_km?.toLocaleString()} km
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(v)} title="Edit Vehicle" className="text-xs text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(v)} title="Delete Vehicle" className="text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {loading && !vehicles.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading vehicles...</td>
                </tr>
              )}
              {!loading && !vehicles.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No vehicles found.</td>
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
              {editingVehicle ? 'Edit Fleet Asset' : 'Register New Fleet Asset'}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Set asset specifications, tenant ownership, and status.</p>

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
                <Input
                  label="Vehicle Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Registration Number"
                  value={formData.reg_number}
                  onChange={(e) => setFormData({ ...formData, reg_number: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Vehicle Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Tanker">Tanker</option>
                    <option value="Reefer">Reefer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Operational Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Out of Service">Out of Service</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Payload Capacity (kg)"
                  type="number"
                  value={formData.capacity_kg}
                  onChange={(e) => setFormData({ ...formData, capacity_kg: parseFloat(e.target.value) || 0 })}
                  required
                />
                <Input
                  label="Odometer (km)"
                  type="number"
                  value={formData.odometer_km}
                  onChange={(e) => setFormData({ ...formData, odometer_km: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="font-semibold">
                  {editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
