import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../stores/adminStore'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Building2, Package, Settings, Ban, Trash2, CheckCircle } from 'lucide-react'

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
    return <div className="text-slate-500 animate-pulse">Loading company details...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{selectedCompany.name}</h1>
          <p className="text-slate-500 mt-1">Manage tenant configuration and subscription</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${selectedCompany.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {selectedCompany.is_active ? 'Active' : 'Suspended'}
          </span>
          {selectedCompany.is_active ? (
            <Button variant="outline" onClick={() => suspendCompany(id!)} className="text-amber-600 border-amber-200 hover:bg-amber-50">
              <Ban className="w-4 h-4 mr-2" /> Suspend
            </Button>
          ) : (
            <Button variant="outline" onClick={() => activateCompany(id!)} className="text-green-600 border-green-200 hover:bg-green-50">
              <CheckCircle className="w-4 h-4 mr-2" /> Activate
            </Button>
          )}
          <Button variant="outline" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Info Card */}
        <Card className="p-6 col-span-1 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Organization Info</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
            <div>
              <p className="text-sm font-medium text-slate-500">Name</p>
              <p className="mt-1 text-slate-900 font-medium">{selectedCompany.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Slug</p>
              <p className="mt-1 text-slate-900 font-mono text-sm">{selectedCompany.slug}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Email</p>
              <p className="mt-1 text-slate-900">{selectedCompany.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Phone</p>
              <p className="mt-1 text-slate-900">{selectedCompany.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Timezone / Currency</p>
              <p className="mt-1 text-slate-900">{selectedCompany.timezone} / {selectedCompany.currency}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Joined</p>
              <p className="mt-1 text-slate-900">{new Date(selectedCompany.created_at).toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Subscription Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
          </div>
          
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm font-medium text-slate-500">Current Plan</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {selectedCompany.subscription?.plan?.name || 'Free / No Plan'}
            </p>
            {selectedCompany.subscription && (
              <p className="text-xs text-slate-500 mt-2">
                Status: <span className="font-medium capitalize text-slate-700">{selectedCompany.subscription.status}</span>
              </p>
            )}
          </div>
          
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Assign New Plan</label>
            <select 
              value={selectedPlanId} 
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select a Plan --</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} (${p.price_monthly}/mo)</option>
              ))}
            </select>
            <Button onClick={handleAssignPlan} disabled={!selectedPlanId} className="w-full">
              Assign Plan
            </Button>
          </div>
        </Card>

        {/* Feature Flags */}
        <Card className="p-6 col-span-1 lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Feature Flags</h2>
            </div>
            {savingFeatures && <span className="text-sm text-indigo-600 animate-pulse">Saving...</span>}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {ALL_FEATURES.map(feature => {
              const isEnabled = features[feature] || false
              return (
                <div 
                  key={feature} 
                  onClick={() => toggleFeature(feature)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-2
                    ${isEnabled 
                      ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100' 
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 opacity-70 grayscale'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isEnabled ? 'bg-indigo-100' : 'bg-slate-200'}`}>
                    <CheckCircle className={`w-5 h-5 ${isEnabled ? 'text-indigo-600' : 'text-slate-400'}`} />
                  </div>
                  <span className={`text-xs font-semibold capitalize ${isEnabled ? 'text-indigo-900' : 'text-slate-500'}`}>
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
