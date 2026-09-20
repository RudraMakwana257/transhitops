import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Plus, Search, Edit2, Trash2, KeyRound, Check, Copy, X, Building2 } from 'lucide-react'

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'fleet_manager',
    company_id: '',
    password: '',
    is_active: true
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tempPasswordModal, setTempPasswordModal] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res: any = await adminApi.getUsers({
        page,
        page_size: 20,
        search,
        company_id: selectedCompanyId || undefined,
        role: selectedRole || undefined
      })
      const data = res?.data || res || {}
      setUsers(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
    } catch (err: any) {
      console.error('Failed to fetch users:', err)
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
    fetchUsers()
  }, [page, search, selectedCompanyId, selectedRole])

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      role: 'fleet_manager',
      company_id: companies[0]?.id || '',
      password: '',
      is_active: true
    })
    setEditingUser(null)
    setError('')
    setIsCreateOpen(true)
  }

  const handleOpenEdit = (u: any) => {
    setFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      company_id: u.company_id || '',
      password: '',
      is_active: u.is_active
    })
    setEditingUser(u)
    setError('')
    setIsCreateOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingUser) {
        await adminApi.updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          company_id: formData.role === 'super_admin' ? null : formData.company_id || null,
          is_active: formData.is_active
        })
      } else {
        const res = await adminApi.createUser({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          company_id: formData.role === 'super_admin' ? null : formData.company_id,
          password: formData.password || undefined,
          is_active: formData.is_active
        })
        const uResData = res.data?.data || res.data || {}
        if (uResData.temporary_password) {
          setTempPasswordModal({
            email: uResData.user?.email || formData.email,
            password: uResData.temporary_password
          })
        }
      }
      setIsCreateOpen(false)
      fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPassword = async (u: any) => {
    if (!window.confirm(`Generate a new temporary password for ${u.name} (${u.email})?`)) return
    try {
      const res = await adminApi.resetUserPassword(u.id)
      const uResData = res.data?.data || res.data || {}
      setTempPasswordModal({
        email: u.email,
        password: uResData.temporary_password || 'Admin@123'
      })
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reset password')
    }
  }

  const handleDelete = async (u: any) => {
    if (!window.confirm(`Are you sure you want to delete user ${u.name}?`)) return
    try {
      await adminApi.deleteUser(u.id)
      fetchUsers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user')
    }
  }

  const handleCopy = () => {
    if (tempPasswordModal) {
      navigator.clipboard.writeText(tempPasswordModal.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Global User Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage platform accounts, fleet roles, passwords, and organization assignments</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 font-semibold">
          <Plus className="w-4 h-4" />
          <span>New User</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-card border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
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
            value={selectedRole}
            onChange={(e) => { setSelectedRole(e.target.value); setPage(1) }}
            className="h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="fleet_manager">Fleet Manager</option>
            <option value="dispatcher">Dispatcher</option>
            <option value="safety_officer">Safety Officer</option>
            <option value="financial_analyst">Financial Analyst</option>
          </select>
        </div>

        <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          Total Users: <span className="font-bold text-foreground">{total}</span>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{u.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{u.company_name || 'Platform'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                      u.role === 'super_admin' 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => handleResetPassword(u)} title="Reset Password" className="text-xs text-muted-foreground hover:text-foreground">
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(u)} title="Edit User" className="text-xs text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(u)} title="Delete User" className="text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {loading && !users.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading users...</td>
                </tr>
              )}
              {!loading && !users.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No users found matching criteria.</td>
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

      {/* Create / Edit User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsCreateOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-foreground mb-1">
              {editingUser ? 'Edit User Profile' : 'Create Platform User'}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Set user account parameters, role assignments, and permissions.</p>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="fleet_manager">Fleet Manager</option>
                    <option value="dispatcher">Dispatcher</option>
                    <option value="safety_officer">Safety Officer</option>
                    <option value="financial_analyst">Financial Analyst</option>
                    <option value="super_admin">Super Admin (Platform)</option>
                  </select>
                </div>

                {formData.role !== 'super_admin' && (
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
                )}
              </div>

              {!editingUser && (
                <Input
                  label="Password (optional, auto-generated if blank)"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary rounded border-input focus:ring-primary accent-primary"
                />
                <label htmlFor="user_is_active" className="text-xs font-semibold text-foreground cursor-pointer">
                  Account Active & Enabled
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="font-semibold">
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Temporary Password Display Modal */}
      {tempPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6 bg-card border-border shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground">Generated Credentials</h2>
            <p className="text-xs text-muted-foreground">Share this temporary password securely with the user.</p>
            
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Email</label>
                <div className="font-mono bg-background text-foreground px-3 py-2 rounded-lg border border-input text-xs">{tempPasswordModal.email}</div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Password</label>
                <div className="flex gap-2">
                  <div className="font-mono bg-background text-foreground px-3 py-2 rounded-lg border border-input text-xs flex-1 font-bold">
                    {tempPasswordModal.password}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={() => setTempPasswordModal(null)} className="w-full font-semibold">Done</Button>
          </Card>
        </div>
      )}
    </div>
  )
}
