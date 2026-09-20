import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../stores/adminStore'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Building2, Package, Settings, Ban, Trash2, CheckCircle, ArrowLeft } from 'lucide-react'

// All valid features based on backend FEATURE_KEYS and seeding list
const ALL_FEATURES = [
  'ai_chat', 'analytics', 'maintenance', 'fuel', 'expenses', 'gps',
  'payroll', 'inventory', 'accounting', 'documents', 'public_api', 'white_label',
  'vehicles', 'drivers', 'trips', 'dashboard'
]

export function AdminCompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedCompany, fetchCompany, plans, fetchPlans, suspendCompany, activateCompany, deleteCompany, assignPlan } = useAdminStore()
  
  const [loading, setLoading] = useState(true)
  const [features, setFeatures] = useState<Record<string, boolean>>({})
  const [savingFeatures, setSavingFeatures] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  useEffect(() => {
    if (id) {
      Promise.all([
        fetchCompany(id),
        fetchPlans(),
        adminApi.getCompanyFeatures(id).then(res => setFeatures(res.data))
      ]).finally(() => setLoading(false))
    }
  }, [id, fetchCompany, fetchPlans])

  const toggleFeature = async (key: string) => {
    const newVal = !features[key]
    setFeatures(prev => ({ ...prev, [key]: newVal }))
    setSavingFeatures(true)
    try {
      await adminApi.updateCompanyFeatures(id!, { [key]: newVal })
    } catch (err) {
      // revert on fail
      setFeatures(prev => ({ ...prev, [key]: !newVal }))
    } finally {
      setSavingFeatures(false)
    }
  }

  const handleAssignPlan = async () => {
    if (!selectedPlanId || !id) return
    await assignPlan(selectedPlanId, id)
    setSelectedPlanId('')
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this company? This action will soft-delete the organization.')) {
      await deleteCompany(id!)
      navigate('/admin/companies')
    }
  }

  if (loading || !selectedCompany) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6 col-span-2 space-y-4">
            <div className="h-6 w-36 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </Card>
          <Card className="p-6 space-y-4">
            <div className="h-6 w-24 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <button
          onClick={() => navigate('/admin/companies')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizations</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{selectedCompany.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Tenant configuration, subscription tiers, and feature switches</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedCompany.is_active ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
              Suspended
            </span>
          )}

          {selectedCompany.is_active ? (
            <Button variant="outline" size="sm" onClick={() => suspendCompany(id!)} className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 text-xs">
              <Ban className="w-3.5 h-3.5 mr-1.5" /> Suspend
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => activateCompany(id!)} className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Activate
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Info Card */}
        <Card className="p-6 col-span-1 lg:col-span-2 border-border/80 bg-card shadow-xs">
          <div className="flex items-center gap-2 mb-6 border-b border-border/60 pb-3">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Organization Profile</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-8 text-sm">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company Name</p>
              <p className="mt-1 text-foreground font-semibold">{selectedCompany.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tenant Slug</p>
              <p className="mt-1 text-foreground font-mono text-xs">{selectedCompany.slug}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Email</p>
              <p className="mt-1 text-foreground">{selectedCompany.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</p>
              <p className="mt-1 text-foreground">{selectedCompany.phone || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timezone / Currency</p>
              <p className="mt-1 text-foreground">{selectedCompany.timezone} ({selectedCompany.currency})</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Provisioned At</p>
              <p className="mt-1 text-foreground">{new Date(selectedCompany.created_at).toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Subscription Card */}
        <Card className="p-6 border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6 border-b border-border/60 pb-3">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Subscription Tier</h2>
            </div>
            
            <div className="mb-6 p-4 bg-muted/40 rounded-xl border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Plan</p>
              <p className="mt-1 text-2xl font-black text-foreground">
                {selectedCompany.subscription?.plan?.name || 'Enterprise'}
              </p>
              {selectedCompany.subscription && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <span>Status:</span>
                  <span className="font-bold capitalize text-primary">{selectedCompany.subscription.status}</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Switch Plan</label>
            <select 
              value={selectedPlanId} 
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="">-- Select a Plan Tier --</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} (${p.price_monthly}/mo)</option>
              ))}
            </select>
            <Button onClick={handleAssignPlan} disabled={!selectedPlanId} className="w-full font-semibold">
              Apply Plan Update
            </Button>
          </div>
        </Card>

        {/* Feature Flags */}
        <Card className="p-6 col-span-1 lg:col-span-3 border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between mb-6 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-base font-bold text-foreground">Feature Entitlements & Overrides</h2>
                <p className="text-xs text-muted-foreground">Click any module to toggle company-level feature access on/off.</p>
              </div>
            </div>
            {savingFeatures && <span className="text-xs font-semibold text-primary animate-pulse">Syncing...</span>}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {ALL_FEATURES.map(feature => {
              const isEnabled = features[feature] || false
              return (
                <div 
                  key={feature} 
                  onClick={() => toggleFeature(feature)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-2 select-none
                    ${isEnabled 
                      ? 'border-primary/30 bg-primary/10 hover:bg-primary/15 shadow-xs' 
                      : 'border-border bg-muted/20 hover:bg-muted/40 opacity-60'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <span className={`text-[11px] font-bold capitalize ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {feature.replace('_', ' ')}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
        
      </div>
    </div>
  )
}
