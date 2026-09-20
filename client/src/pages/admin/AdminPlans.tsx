import { useEffect, useState } from 'react'
import { useAdminStore } from '../../stores/adminStore'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Package, Plus, Edit2, CheckCircle2, XCircle } from 'lucide-react'

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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Subscription Tiers</h1>
          <p className="text-muted-foreground mt-1 text-sm">Configure pricing structures, license quotas, and tier availability</p>
        </div>
        <Button onClick={handleNew} disabled={isCreating} className="gap-2 font-semibold">
          <Plus className="w-4 h-4" />
          <span>New Plan</span>
        </Button>
      </div>

      {(isCreating || editingId) && (
        <Card className="p-6 border-primary/30 bg-primary/5 shadow-sm animate-in slide-in-from-top-4 duration-200">
          <h2 className="text-base font-bold text-foreground mb-4">
            {isCreating ? 'Create New Pricing Tier' : 'Edit Pricing Tier'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <Input label="Plan Name" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="Slug Identifier" name="slug" value={formData.slug} onChange={handleChange} required />
            <Input label="Monthly Price ($)" type="number" step="0.01" name="price_monthly" value={formData.price_monthly} onChange={handleChange} required />
            <Input label="Yearly Price ($)" type="number" step="0.01" name="price_yearly" value={formData.price_yearly} onChange={handleChange} required />
            
            <div className="flex items-center gap-2 h-10 px-2">
              <input 
                type="checkbox" 
                id="is_active" 
                name="is_active" 
                checked={formData.is_active} 
                onChange={handleChange} 
                className="w-4 h-4 text-primary rounded border-input focus:ring-primary accent-primary" 
              />
              <label htmlFor="is_active" className="text-xs font-semibold text-foreground cursor-pointer">Available to Tenants</label>
            </div>
            
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
              <Button type="submit" size="sm" className="font-semibold">Save Plan</Button>
            </div>
          </form>
        </Card>
      )}

      {loading && !plans.length && (
        <div className="text-muted-foreground animate-pulse text-sm">Loading plans...</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => (
          <Card key={plan.id} className={`p-6 flex flex-col h-full border-border/80 bg-card hover:shadow-md transition-all duration-200 ${!plan.is_active ? 'opacity-60 grayscale' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                <Package className="w-6 h-6" />
              </div>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border flex items-center gap-1 ${
                plan.is_active 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                {plan.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                <span>{plan.is_active ? 'Active Tier' : 'Archived'}</span>
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{plan.slug}</p>
            
            <div className="mt-6 mb-6 flex-1">
              <div className="flex items-baseline text-3xl font-black text-foreground">
                ${plan.price_monthly}
                <span className="text-xs font-normal text-muted-foreground ml-1">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">Billed annually at ${plan.price_yearly}/yr</p>
            </div>
            
            <Button variant="outline" size="sm" className="w-full justify-center gap-2 text-xs font-semibold" onClick={() => handleEdit(plan)}>
              <Edit2 className="w-3.5 h-3.5" /> Edit Configuration
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
