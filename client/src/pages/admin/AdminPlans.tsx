import { useEffect, useState } from 'react'
import { useAdminStore } from '../../stores/adminStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Package, Plus, Edit2 } from 'lucide-react'

export function AdminPlans() {
  const { plans, loading, fetchPlans, createPlan, updatePlan } = useAdminStore()
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price_monthly: 0,
    price_yearly: 0,
    is_active: true
  })

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const handleEdit = (plan: any) => {
    setFormData({
      name: plan.name,
      slug: plan.slug,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      is_active: plan.is_active
    })
    setEditingId(plan.id)
    setIsCreating(false)
  }

  const handleNew = () => {
    setFormData({
      name: '',
      slug: '',
      price_monthly: 0,
      price_yearly: 0,
      is_active: true
    })
    setIsCreating(true)
    setEditingId(null)
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isCreating) {
        await createPlan(formData)
      } else if (editingId) {
        await updatePlan(editingId, formData)
      }
      handleCancel()
    } catch (err) {
      alert('Failed to save plan')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : 
                  e.target.type === 'checkbox' ? e.target.checked : 
                  e.target.value
    setFormData(prev => ({ ...prev, [e.target.name]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription Plans</h1>
          <p className="text-slate-500 mt-1">Manage pricing tiers and platform features</p>
        </div>
        <Button onClick={handleNew} disabled={isCreating} className="gap-2">
          <Plus className="w-4 h-4" />
          New Plan
        </Button>
      </div>

      {(isCreating || editingId) && (
        <Card className="p-6 border-indigo-200 bg-indigo-50/30">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {isCreating ? 'Create New Plan' : 'Edit Plan'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <Input label="Plan Name" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="Slug (unique)" name="slug" value={formData.slug} onChange={handleChange} required />
            <Input label="Monthly Price" type="number" step="0.01" name="price_monthly" value={formData.price_monthly} onChange={handleChange} required />
            <Input label="Yearly Price" type="number" step="0.01" name="price_yearly" value={formData.price_yearly} onChange={handleChange} required />
            
            <div className="flex items-center gap-2 h-10">
              <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active (Available)</label>
            </div>
            
            <div className="lg:col-span-3 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button type="submit">Save Plan</Button>
            </div>
          </form>
        </Card>
      )}

      {loading && !plans.length && (
        <div className="text-slate-500 animate-pulse">Loading plans...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => (
          <Card key={plan.id} className={`p-6 flex flex-col h-full ${!plan.is_active ? 'opacity-60 grayscale' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                {plan.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
            <p className="text-sm text-slate-500 font-mono mt-1">{plan.slug}</p>
            
            <div className="mt-6 mb-8 flex-1">
              <div className="flex items-baseline text-3xl font-extrabold text-slate-900">
                ${plan.price_monthly}
                <span className="text-base font-medium text-slate-500 ml-1">/mo</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">or ${plan.price_yearly}/year</p>
            </div>
            
            <Button variant="outline" className="w-full justify-center gap-2" onClick={() => handleEdit(plan)}>
              <Edit2 className="w-4 h-4" /> Edit Plan
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
