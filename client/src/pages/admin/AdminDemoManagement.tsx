import { useState, useEffect } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { 
  Sparkles, Plus, Clock, Users, Truck, RefreshCw, Key, ExternalLink, 
  Trash2, ShieldCheck, AlertCircle, Copy, Check, Calendar, CheckCircle2, 
  RotateCcw, PauseCircle, PlayCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface DemoUser {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  last_login_at: string | null
}

interface DemoEnvironment {
  id: string
  name: string
  slug: string
  email: string
  is_active: boolean
  is_showcase: boolean
  demo_type: string
  demo_notes: string
  trial_ends_at: string | null
  days_left: number | null
  status: 'active' | 'expiring_soon' | 'expired' | 'suspended'
  stats: {
    vehicles: number
    drivers: number
    trips: number
    users: number
  }
  users: DemoUser[]
  created_at: string | null
}

export function AdminDemoManagement() {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<any>({
    total_sandboxes: 0,
    active_sandboxes: 0,
    expiring_soon: 0,
    expired_sandboxes: 0,
    total_demo_users: 0,
    total_demo_vehicles: 0,
  })
  const [environments, setEnvironments] = useState<DemoEnvironment[]>([])
  const [search, setSearch] = useState('')

  // Modals state
  const [provisionModalOpen, setProvisionModalOpen] = useState(false)
  const [extendModalOpen, setExtendModalOpen] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [selectedEnv, setSelectedEnv] = useState<DemoEnvironment | null>(null)
  const [selectedUser, setSelectedUser] = useState<DemoUser | null>(null)

  // Provision Form
  const [formData, setFormData] = useState({
    company_name: '',
    admin_name: '',
    admin_email: '',
    password: '',
    duration_days: 7,
    seed_dummy_data: true,
    notes: '',
  })
  const [provisioning, setProvisioning] = useState(false)
  const [provisionSuccessData, setProvisionSuccessData] = useState<any>(null)

  // Extend Form
  const [extendDays, setExtendDays] = useState(7)
  const [customExtendDate, setCustomExtendDate] = useState('')
  const [extending, setExtending] = useState(false)

  // Password Form
  const [newPassword, setNewPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Reset Data Loading
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getDemoOverview()
      if (res.success && res.data) {
        setKpis(res.data.kpis || {})
        setEnvironments(res.data.environments || [])
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load demo overview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
    let pwd = 'Demo@'
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pwd
  }

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setProvisioning(true)
      const res = await adminApi.createDemoSandbox(formData)
      if (res.success) {
        toast.success(res.message || 'Demo sandbox created successfully!')
        setProvisionSuccessData(res.data.credentials)
        fetchData()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create demo sandbox')
    } finally {
      setProvisioning(false)
    }
  }

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEnv) return
    try {
      setExtending(true)
      const res = await adminApi.extendDemoSandbox(
        selectedEnv.id, 
        customExtendDate ? undefined : extendDays,
        customExtendDate || undefined
      )
      if (res.success) {
        toast.success(res.message || 'Demo extended successfully')
        setExtendModalOpen(false)
        setSelectedEnv(null)
        setCustomExtendDate('')
        fetchData()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to extend demo')
    } finally {
      setExtending(false)
    }
  }

  const handleResetDummyData = async (env: DemoEnvironment) => {
    if (!confirm(`Are you sure you want to re-seed dummy fleet data for '${env.name}'? Existing demo vehicles, drivers, and trips will be refreshed.`)) {
      return
    }
    try {
      setResettingId(env.id)
      const res = await adminApi.resetDemoData(env.id)
      if (res.success) {
        toast.success(res.message || 'Dummy fleet data refreshed!')
        fetchData()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset demo data')
    } finally {
      setResettingId(null)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    try {
      setUpdatingPassword(true)
      const res = await adminApi.updateDemoUserPassword(selectedUser.id, newPassword)
      if (res.success) {
        toast.success(res.message || 'Password updated successfully')
        setPasswordModalOpen(false)
        setSelectedUser(null)
        setNewPassword('')
        fetchData()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password')
    } finally {
      setUpdatingPassword(false)
    }
  }

  const handleToggleStatus = async (env: DemoEnvironment) => {
    const nextState = !env.is_active
    try {
      const res = await adminApi.toggleDemoStatus(env.id, nextState)
      if (res.success) {
        toast.success(`Demo sandbox ${nextState ? 'activated' : 'suspended'}`)
        fetchData()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const handleDeleteSandbox = async (env: DemoEnvironment) => {
    if (!confirm(`Permanently delete demo sandbox '${env.name}' and all demo accounts? This action cannot be undone.`)) {
      return
    }
    try {
      const res = await adminApi.deleteDemoSandbox(env.id)
      if (res.success) {
        toast.success(res.message || 'Demo sandbox deleted')
        fetchData()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete sandbox')
    }
  }

  const handleImpersonate = async (companyId: string, userId?: string) => {
    try {
      const res = await adminApi.impersonate({ company_id: companyId, user_id: userId })
      if (res.success && res.data?.token) {
        toast.success('Switched into demo environment context')
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Impersonation failed')
    }
  }

  const filteredEnvironments = environments.filter(env => 
    env.name.toLowerCase().includes(search.toLowerCase()) ||
    env.slug.toLowerCase().includes(search.toLowerCase()) ||
    env.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Demo & Sandbox Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Super Admin
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Provision 7-day/15-day evaluation sandboxes for prospective customers, manage credentials, and refresh dummy fleet telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={fetchData} 
            disabled={loading}
            className="gap-2 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button 
            onClick={() => {
              setFormData({
                company_name: '',
                admin_name: '',
                admin_email: '',
                password: handleGeneratePassword(),
                duration_days: 7,
                seed_dummy_data: true,
                notes: '',
              })
              setProvisionSuccessData(null)
              setProvisionModalOpen(true)
            }}
            className="gap-2 shadow-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Demo Sandbox</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border/80 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Demos</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">{kpis.active_sandboxes}</p>
          <p className="text-xs text-muted-foreground mt-1">Live client evaluation fleets</p>
        </Card>

        <Card className="p-4 bg-card border-border/80">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiring / Expired</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-500 mt-2">
            {kpis.expiring_soon + kpis.expired_sandboxes}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{kpis.expiring_soon} expiring soon, {kpis.expired_sandboxes} expired</p>
        </Card>

        <Card className="p-4 bg-card border-border/80">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Demo Users</span>
          <p className="text-2xl sm:text-3xl font-black text-primary mt-2">{kpis.total_demo_users}</p>
          <p className="text-xs text-muted-foreground mt-1">Prospects & showcase logins</p>
        </Card>

        <Card className="p-4 bg-card border-border/80">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dummy Fleet Assets</span>
          <p className="text-2xl sm:text-3xl font-black text-foreground mt-2">{kpis.total_demo_vehicles}</p>
          <p className="text-xs text-muted-foreground mt-1">Pre-seeded vehicles & telemetry</p>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-foreground">Client Sandboxes & Showcase Fleets</h2>
            <span className="text-xs text-muted-foreground">({filteredEnvironments.length})</span>
          </div>

          <div className="w-full sm:w-64">
            <input 
              type="text"
              placeholder="Search sandboxes or emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Organization / Sandbox</th>
                <th className="px-6 py-3.5">Status & Trial Validity</th>
                <th className="px-6 py-3.5">Pre-seeded Fleet</th>
                <th className="px-6 py-3.5">Accounts</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEnvironments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No demo sandboxes found matching your search.
                  </td>
                </tr>
              ) : (
                filteredEnvironments.map((env) => {
                  return (
                    <tr key={env.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {env.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{env.name}</span>
                              {env.is_showcase && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                                  Showcase
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground block font-mono">{env.slug}</span>
                            {env.demo_notes && (
                              <span className="text-[11px] text-muted-foreground/80 italic block mt-0.5 line-clamp-1">
                                {env.demo_notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {env.status === 'expired' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20">
                              <AlertCircle className="w-3 h-3" /> Expired
                            </span>
                          ) : env.status === 'expiring_soon' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              <Clock className="w-3 h-3" /> {env.days_left}d remaining
                            </span>
                          ) : env.is_showcase ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" /> Permanent Showcase
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> {env.days_left ? `${env.days_left}d remaining` : 'Active'}
                            </span>
                          )}

                          {env.trial_ends_at && (
                            <span className="text-xs text-muted-foreground block">
                              Expires: {new Date(env.trial_ends_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-xs text-foreground">
                          <span className="flex items-center gap-1" title="Vehicles">
                            <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                            <strong>{env.stats.vehicles}</strong>
                          </span>
                          <span className="flex items-center gap-1" title="Drivers">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <strong>{env.stats.drivers}</strong>
                          </span>
                          <span className="flex items-center gap-1" title="Trips">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <strong>{env.stats.trips}</strong>
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {env.users.slice(0, 2).map(u => (
                            <div key={u.id} className="flex items-center justify-between text-xs gap-2">
                              <span className="font-mono text-muted-foreground truncate max-w-[150px]">{u.email}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-1.5 text-[11px] text-primary"
                                onClick={() => {
                                  setSelectedUser(u)
                                  setNewPassword(handleGeneratePassword())
                                  setPasswordModalOpen(true)
                                }}
                              >
                                <Key className="w-3 h-3 mr-1" /> Key
                              </Button>
                            </div>
                          ))}
                          {env.users.length > 2 && (
                            <span className="text-[11px] text-muted-foreground">+{env.users.length - 2} more accounts</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            title="Extend trial period"
                            onClick={() => {
                              setSelectedEnv(env)
                              setExtendDays(7)
                              setCustomExtendDate('')
                              setExtendModalOpen(true)
                            }}
                            className="h-8 gap-1 text-xs"
                          >
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            <span>Extend</span>
                          </Button>

                          <Button 
                            variant="outline" 
                            size="sm"
                            title="Reset dummy operational fleet data"
                            disabled={resettingId === env.id}
                            onClick={() => handleResetDummyData(env)}
                            className="h-8 gap-1 text-xs"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${resettingId === env.id ? 'animate-spin' : ''}`} />
                            <span>Reset Data</span>
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Impersonate into this demo environment"
                            onClick={() => handleImpersonate(env.id, env.users[0]?.id)}
                            className="h-8 w-8 p-0"
                          >
                            <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="sm"
                            title={env.is_active ? 'Suspend demo' : 'Reactivate demo'}
                            onClick={() => handleToggleStatus(env)}
                            className="h-8 w-8 p-0"
                          >
                            {env.is_active ? (
                              <PauseCircle className="w-4 h-4 text-amber-500" />
                            ) : (
                              <PlayCircle className="w-4 h-4 text-emerald-500" />
                            )}
                          </Button>

                          {!env.is_showcase && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              title="Delete sandbox"
                              onClick={() => handleDeleteSandbox(env)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Provision New Demo Modal */}
      {provisionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-lg bg-card border-border shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Provision Customer Demo Sandbox</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Creates an isolated workspace with complete fleet telemetry and full Enterprise features enabled.
                </p>
              </div>
              <button 
                onClick={() => setProvisionModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {provisionSuccessData ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    <strong className="block">Demo Sandbox Ready!</strong>
                    <span>Credentials below have been provisioned and are active immediately.</span>
                  </div>
                </div>

                <div className="space-y-2 p-4 rounded-xl bg-muted/40 border border-border text-sm font-mono">
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground text-xs font-sans">Login Portal:</span>
                    <span className="text-foreground">{provisionSuccessData.login_url}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground text-xs font-sans">Email:</span>
                    <span className="text-foreground font-bold">{provisionSuccessData.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground text-xs font-sans">Password:</span>
                    <span className="text-primary font-bold">{provisionSuccessData.password}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground text-xs font-sans">Valid Until:</span>
                    <span className="text-foreground">{new Date(provisionSuccessData.expires_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const text = `TransitOps Demo Access\nPortal: ${provisionSuccessData.login_url}\nEmail: ${provisionSuccessData.email}\nPassword: ${provisionSuccessData.password}\nValid for: ${provisionSuccessData.duration_days} days`
                      handleCopy(text, 'share-creds')
                    }}
                    className="gap-2"
                  >
                    {copiedKey === 'share-creds' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>Copy Invitation Details</span>
                  </Button>
                  <Button onClick={() => setProvisionModalOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProvisionSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Company / Organization Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Apex Logistics India"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Prospect Contact Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.admin_name}
                      onChange={(e) => setFormData({...formData, admin_name: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Prospect Work Email *</label>
                    <input 
                      type="email" 
                      required
                      placeholder="e.g. rahul@apexlogistics.com"
                      value={formData.admin_email}
                      onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-foreground">Initial Demo Password</label>
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, password: handleGeneratePassword()})}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Generate New
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-mono text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">Evaluation Duration</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[7, 15, 30].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setFormData({...formData, duration_days: days})}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                          formData.duration_days === days 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-background hover:bg-muted border-border text-foreground'
                        }`}
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border">
                  <input 
                    type="checkbox" 
                    id="seed_dummy_data"
                    checked={formData.seed_dummy_data}
                    onChange={(e) => setFormData({...formData, seed_dummy_data: e.target.checked})}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="seed_dummy_data" className="text-xs text-foreground cursor-pointer">
                    <strong>Pre-seed realistic dummy fleet</strong> (6 vehicles, 4 drivers, sample trips, fuel logs & expenses)
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Sales / Demo Notes (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Inbound inquiry from website demo request"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => setProvisionModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={provisioning} className="gap-2">
                    {provisioning && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Provision Sandbox</span>
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* Extend Demo Modal */}
      {extendModalOpen && selectedEnv && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card border-border shadow-2xl p-6 space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Extend Demo Access</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Extend trial duration for <strong>{selectedEnv.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleExtendSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-2">Quick Duration Addition</label>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 15, 30].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        setExtendDays(days)
                        setCustomExtendDate('')
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors ${
                        extendDays === days && !customExtendDate
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-background hover:bg-muted border-border text-foreground'
                      }`}
                    >
                      +{days} Days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Or Specific Expiration Date</label>
                <input 
                  type="date"
                  value={customExtendDate}
                  onChange={(e) => setCustomExtendDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setExtendModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={extending} className="gap-2">
                  {extending && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Save Extension</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card border-border shadow-2xl p-6 space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Update Demo Credentials</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set a new password for <strong>{selectedUser.email}</strong>.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-foreground">New Password (min 8 chars) *</label>
                  <button 
                    type="button" 
                    onClick={() => setNewPassword(handleGeneratePassword())}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Generate Random
                  </button>
                </div>
                <input 
                  type="text"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm font-mono text-foreground focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setPasswordModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatingPassword} className="gap-2">
                  {updatingPassword && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Update Password</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
