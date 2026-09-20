import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Plus, Search, Edit2, Trash2, X, Building2, AlertCircle } from 'lucide-react'

export function AdminDrivers() {
  const [drivers, setDrivers] = useState<any[]>([])
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
  const [editingDriver, setEditingDriver] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    company_id: '',
    name: '',
    license_number: '',
    license_category: 'HCV',
    license_expiry: '',
    phone: '',
    status: 'Available',
    safety_score: 100.0
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchDrivers = async () => {
    setLoading(true)
    try {
      const res: any = await adminApi.getDrivers({
        page,
        page_size: 20,
        search,
        company_id: selectedCompanyId || undefined,
        status: selectedStatus || undefined
      })
      const data = res?.data || res || {}
      setDrivers(data.items || [])
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
    fetchDrivers()
  }, [page, search, selectedCompanyId, selectedStatus])

  const handleOpenCreate = () => {
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 2)
    setFormData({
      company_id: companies[0]?.id || '',
      name: '',
      license_number: '',
      license_category: 'HCV',
      license_expiry: nextYear.toISOString().split('T')[0],
      phone: '',
      status: 'Available',
      safety_score: 100.0
    })
    setEditingDriver(null)
    setError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (d: any) => {
    setFormData({
      company_id: d.company_id || '',
      name: d.name,
      license_number: d.license_number,
      license_category: d.license_category,
      license_expiry: d.license_expiry || '',
      phone: d.phone,
      status: d.status,
      safety_score: d.safety_score || 100.0
    })
    setEditingDriver(d)
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingDriver) {
        await adminApi.updateDriver(editingDriver.id, formData)
      } else {
        await adminApi.createDriver(formData)
      }
      setIsModalOpen(false)
      fetchDrivers()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save driver')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (d: any) => {
    if (!window.confirm(`Are you sure you want to delete driver ${d.name} (${d.license_number})?`)) return
    try {
      await adminApi.deleteDriver(d.id)
      fetchDrivers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete driver')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Global Drivers</h1>
          <p className="text-muted-foreground mt-1 text-sm">Cross-tenant driver licensing, safety performance metrics, and assignments</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 font-semibold">
          <Plus className="w-4 h-4" />
          <span>New Driver</span>
        </Button>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-card border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search driver name, license, phone..."
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
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Total Drivers: <span className="font-bold text-foreground">{total}</span>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Driver</th>
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">License & Expiry</th>
                <th className="px-6 py-3.5">Safety Score</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{d.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{d.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{d.company_name || 'Platform'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-mono text-foreground font-semibold">{d.license_number} ({d.license_category})</div>
                    <div className={`text-[11px] flex items-center gap-1 mt-0.5 ${d.is_license_expired ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      {d.is_license_expired && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                      <span>Expires: {d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{d.safety_score}%</span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(d.safety_score || 100, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      d.status === 'Available' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                      d.status === 'On Trip' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                      d.status === 'Off Duty' ? 'bg-muted text-muted-foreground border-border' :
                      'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(d)} title="Edit Driver" className="text-xs text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(d)} title="Delete Driver" className="text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {loading && !drivers.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading drivers...</td>
                </tr>
              )}
              {!loading && !drivers.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No drivers found.</td>
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
              {editingDriver ? 'Edit Driver Record' : 'Register New Driver'}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Set personal information, license qualifications, and organizational affiliation.</p>

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
                  label="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="License Number"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">License Category</label>
                  <select
                    value={formData.license_category}
                    onChange={(e) => setFormData({ ...formData, license_category: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="HCV">HCV (Heavy Commercial)</option>
                    <option value="LCV">LCV (Light Commercial)</option>
                    <option value="MCV">MCV (Medium Commercial)</option>
                    <option value="LMV">LMV (Light Motor)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="License Expiry Date"
                  type="date"
                  value={formData.license_expiry}
                  onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Duty Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="font-semibold">
                  {editingDriver ? 'Update Driver' : 'Register Driver'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
