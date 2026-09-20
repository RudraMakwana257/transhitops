import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Plus, Search, Edit2, Trash2, X, Building2 } from 'lucide-react'

export function AdminFuel() {
  const [logs, setLogs] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    company_id: '',
    vehicle_id: '',
    driver_id: '',
    date: '',
    liters: 50,
    price_per_liter: 1.5,
    total_cost: 75,
    odometer_reading: 0,
    fuel_station: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res: any = await adminApi.getFuelLogs({
        page,
        page_size: 20,
        search,
        company_id: selectedCompanyId || undefined
      })
      const data = res?.data || res || {}
      setLogs(data.items || [])
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
    fetchLogs()
  }, [page, search, selectedCompanyId])

  const handleOpenCreate = () => {
    const defaultComp = companies[0]?.id || ''
    const compVehs = vehicles.filter(v => v.company_id === defaultComp)
    const compDris = drivers.filter(d => d.company_id === defaultComp)

    setFormData({
      company_id: defaultComp,
      vehicle_id: compVehs[0]?.id || vehicles[0]?.id || '',
      driver_id: compDris[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      liters: 50,
      price_per_liter: 1.5,
      total_cost: 75,
      odometer_reading: 0,
      fuel_station: ''
    })
    setEditingLog(null)
    setError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (l: any) => {
    setFormData({
      company_id: l.company_id || '',
      vehicle_id: l.vehicle_id,
      driver_id: l.driver_id || '',
      date: l.date || '',
      liters: l.liters,
      price_per_liter: l.price_per_liter,
      total_cost: l.total_cost || (l.liters * l.price_per_liter),
      odometer_reading: l.odometer_reading || 0,
      fuel_station: l.fuel_station || ''
    })
    setEditingLog(l)
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingLog) {
        await adminApi.updateFuelLog(editingLog.id, formData)
      } else {
        await adminApi.createFuelLog(formData)
      }
      setIsModalOpen(false)
      fetchLogs()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save fuel log')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (l: any) => {
    if (!window.confirm(`Delete fuel entry (${l.liters} L)?`)) return
    try {
      await adminApi.deleteFuelLog(l.id)
      fetchLogs()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete record')
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
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Global Fuel Records</h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor fuel fill-ups, station receipts, consumption, and efficiency across all fleets</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 font-semibold">
          <Plus className="w-4 h-4" />
          <span>New Fuel Log</span>
        </Button>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-card border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search fuel station..."
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
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Total Fuel Logs: <span className="font-bold text-foreground">{total}</span>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Fuel Fill-up</th>
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Vehicle & Driver</th>
                <th className="px-6 py-3.5">Volume & Price</th>
                <th className="px-6 py-3.5">Total Cost</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{l.fuel_station || 'Unspecified Station'}</div>
                    <div className="text-xs text-muted-foreground">{l.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{l.company_name || 'Platform'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-semibold text-foreground">{l.vehicle_name || 'Vehicle'}</div>
                    <div className="text-[11px] text-muted-foreground">{l.driver_name || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-foreground">
                    <div>{l.liters?.toLocaleString()} Liters</div>
                    <div className="text-[11px] text-muted-foreground">${l.price_per_liter}/L</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ${l.total_cost?.toLocaleString()}
                    </div>
                    {l.odometer_reading && (
                      <div className="text-[10px] text-muted-foreground font-mono">{l.odometer_reading} km</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(l)} title="Edit Entry" className="text-xs text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(l)} title="Delete Entry" className="text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {loading && !logs.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading fuel logs...</td>
                </tr>
              )}
              {!loading && !logs.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No fuel records found.</td>
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
              {editingLog ? 'Edit Fuel Record' : 'Record Fuel Entry'}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Log fuel receipt, cost per liter, and odometer readings.</p>

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
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Driver (Optional)</label>
                  <select
                    value={formData.driver_id}
                    onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">-- Select Driver --</option>
                    {filteredDrivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Fill-up Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
                <Input
                  label="Fuel Station / Vendor"
                  value={formData.fuel_station}
                  onChange={(e) => setFormData({ ...formData, fuel_station: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Liters"
                  type="number"
                  step="0.01"
                  value={formData.liters}
                  onChange={(e) => {
                    const l = parseFloat(e.target.value) || 0
                    setFormData({ ...formData, liters: l, total_cost: parseFloat((l * formData.price_per_liter).toFixed(2)) })
                  }}
                  required
                />
                <Input
                  label="Price / Liter ($)"
                  type="number"
                  step="0.01"
                  value={formData.price_per_liter}
                  onChange={(e) => {
                    const p = parseFloat(e.target.value) || 0
                    setFormData({ ...formData, price_per_liter: p, total_cost: parseFloat((formData.liters * p).toFixed(2)) })
                  }}
                  required
                />
                <Input
                  label="Total Cost ($)"
                  type="number"
                  step="0.01"
                  value={formData.total_cost}
                  onChange={(e) => setFormData({ ...formData, total_cost: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <Input
                label="Odometer Reading (km)"
                type="number"
                value={formData.odometer_reading}
                onChange={(e) => setFormData({ ...formData, odometer_reading: parseFloat(e.target.value) || 0 })}
              />

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="font-semibold">
                  {editingLog ? 'Update Fuel Log' : 'Save Fuel Log'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
