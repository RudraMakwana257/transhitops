import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Plus, Search, Edit2, Trash2, X, Building2, MapPin } from 'lucide-react'

export function AdminTrips() {
  const [trips, setTrips] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    company_id: '',
    vehicle_id: '',
    driver_id: '',
    source: '',
    destination: '',
    cargo_weight_kg: 500,
    planned_distance_km: 100,
    revenue: 0,
    status: 'Draft',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchTrips = async () => {
    setLoading(true)
    try {
      const res: any = await adminApi.getTrips({
        page,
        page_size: 20,
        search,
        company_id: selectedCompanyId || undefined,
        status: selectedStatus || undefined
      })
      const data = res?.data || res || {}
      setTrips(data.items || [])
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
      const [compRes, vehRes, driRes]: any[] = await Promise.all([
        adminApi.getCompanies({ page: 1, page_size: 100 }),
        adminApi.getVehicles({ page: 1, page_size: 100 }),
        adminApi.getDrivers({ page: 1, page_size: 100 })
      ])
      const compData = compRes?.data || compRes || {}
      const vehData = vehRes?.data || vehRes || {}
      const driData = driRes?.data || driRes || {}
      setCompanies(compData.items || [])
      setVehicles(vehData.items || [])
      setDrivers(driData.items || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchDependencies()
  }, [])

  useEffect(() => {
    fetchTrips()
  }, [page, search, selectedCompanyId, selectedStatus])

  const handleOpenCreate = () => {
    const defaultComp = companies[0]?.id || ''
    const compVehs = vehicles.filter(v => v.company_id === defaultComp)
    const compDris = drivers.filter(d => d.company_id === defaultComp)

    setFormData({
      company_id: defaultComp,
      vehicle_id: compVehs[0]?.id || vehicles[0]?.id || '',
      driver_id: compDris[0]?.id || drivers[0]?.id || '',
      source: '',
      destination: '',
      cargo_weight_kg: 500,
      planned_distance_km: 100,
      revenue: 0,
      status: 'Draft',
      notes: ''
    })
    setEditingTrip(null)
    setError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (t: any) => {
    setFormData({
      company_id: t.company_id || '',
      vehicle_id: t.vehicle_id,
      driver_id: t.driver_id,
      source: t.source,
      destination: t.destination,
      cargo_weight_kg: t.cargo_weight_kg,
      planned_distance_km: t.planned_distance_km || 100,
      revenue: t.revenue || 0,
      status: t.status,
      notes: t.notes || ''
    })
    setEditingTrip(t)
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingTrip) {
        await adminApi.updateTrip(editingTrip.id, formData)
      } else {
        await adminApi.createTrip(formData)
      }
      setIsModalOpen(false)
      fetchTrips()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save trip')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (t: any) => {
    if (!window.confirm(`Are you sure you want to delete trip ${t.trip_number}?`)) return
    try {
      await adminApi.deleteTrip(t.id)
      fetchTrips()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete trip')
    }
  }

  const filteredVehicles = formData.company_id 
    ? vehicles.filter(v => v.company_id === formData.company_id)
    : vehicles

  const filteredDrivers = formData.company_id 
    ? drivers.filter(d => d.company_id === formData.company_id)
    : drivers

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Global Trips & Dispatches</h1>
          <p className="text-muted-foreground mt-1 text-sm">Cross-tenant routing, trip statuses, cargo manifests, and billing revenue</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 font-semibold">
          <Plus className="w-4 h-4" />
          <span>New Dispatch</span>
        </Button>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-card border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search trip number, origin, destination..."
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
            <option value="Draft">Draft</option>
            <option value="Dispatched">Dispatched</option>
            <option value="In Transit">In Transit</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Total Trips: <span className="font-bold text-foreground">{total}</span>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Trip Details</th>
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Route</th>
                <th className="px-6 py-3.5">Assigned Asset & Driver</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {trips.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{t.trip_number}</div>
                    <div className="text-xs text-muted-foreground">{t.cargo_weight_kg?.toLocaleString()} kg cargo</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{t.company_name || 'Platform'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-xs text-foreground font-medium">
                      <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                      <span>{t.source} &rarr; {t.destination}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{t.planned_distance_km} km planned</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-semibold text-foreground">{t.vehicle_name || 'Vehicle'}</div>
                    <div className="text-[11px] text-muted-foreground">{t.driver_name || 'Driver'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                      t.status === 'Dispatched' || t.status === 'In Transit' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                      t.status === 'Draft' ? 'bg-muted text-muted-foreground border-border' :
                      'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(t)} title="Edit Trip" className="text-xs text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t)} title="Delete Trip" className="text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {loading && !trips.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading trips...</td>
                </tr>
              )}
              {!loading && !trips.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No trips found.</td>
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
              {editingTrip ? 'Edit Dispatch Order' : 'Create Dispatch Order'}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Assign route checkpoints, vehicles, drivers, and cargo.</p>

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
                  label="Origin / Source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  required
                />
                <Input
                  label="Destination"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Vehicle</label>
                  <select
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    required
                  >
                    <option value="">-- Select Vehicle --</option>
                    {filteredVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.reg_number})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Driver</label>
                  <select
                    value={formData.driver_id}
                    onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    required
                  >
                    <option value="">-- Select Driver --</option>
                    {filteredDrivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Cargo (kg)"
                  type="number"
                  value={formData.cargo_weight_kg}
                  onChange={(e) => setFormData({ ...formData, cargo_weight_kg: parseFloat(e.target.value) || 0 })}
                  required
                />
                <Input
                  label="Distance (km)"
                  type="number"
                  value={formData.planned_distance_km}
                  onChange={(e) => setFormData({ ...formData, planned_distance_km: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Revenue ($)"
                  type="number"
                  value={formData.revenue}
                  onChange={(e) => setFormData({ ...formData, revenue: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Dispatch Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="Draft">Draft</option>
                  <option value="Dispatched">Dispatched</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="font-semibold">
                  {editingTrip ? 'Update Trip' : 'Create Trip'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
