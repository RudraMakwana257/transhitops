import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { VehicleType } from '../types'
import { Button } from '../components/ui/ButtonWrapper'
import { Input } from '../components/ui/InputWrapper'
import { Select } from '../components/ui/SelectWrapper'
import { Card, CardContent, CardFooter } from '../components/ui/CardWrapper'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from '../store/toastStore'

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'Truck', label: 'Truck' }, { value: 'Van', label: 'Van' }, { value: 'Pickup', label: 'Pickup' },
  { value: 'Trailer', label: 'Trailer' }, { value: 'Bus', label: 'Bus' }, { value: 'Tanker', label: 'Tanker' },
]

export function VehicleCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    reg_number: '', name: '', type: '' as VehicleType | '', capacity_kg: '',
    acquisition_cost: '', odometer_km: '0', purchase_date: '', region: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id) return
    api.get(`/vehicles/${id}`).then(res => {
      const v = res.data.data
      setForm({
        reg_number: v.reg_number || '', name: v.name || '', type: v.type || '',
        capacity_kg: String(v.capacity_kg || ''), acquisition_cost: String(v.acquisition_cost || ''),
        odometer_km: String(v.odometer_km || '0'), purchase_date: v.purchase_date || '', region: v.region || '',
      })
    }).catch(() => toast('Failed to load vehicle', 'error'))
    .finally(() => setLoading(false))
  }, [id])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.reg_number.trim()) e.reg_number = 'Registration number is required'
    if (!form.name.trim()) e.name = 'Vehicle name is required'
    if (!form.type) e.type = 'Vehicle type is required'
    if (!form.capacity_kg || Number(form.capacity_kg) <= 0) e.capacity_kg = 'Capacity must be > 0'
    if (!form.acquisition_cost || Number(form.acquisition_cost) <= 0) e.acquisition_cost = 'Cost must be > 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = isEdit
        ? await api.put(`/vehicles/${id}`, { ...form, capacity_kg: Number(form.capacity_kg), acquisition_cost: Number(form.acquisition_cost), odometer_km: Number(form.odometer_km) })
        : await api.post('/vehicles', { ...form, capacity_kg: Number(form.capacity_kg), acquisition_cost: Number(form.acquisition_cost), odometer_km: Number(form.odometer_km) })
      if (res.data.success) {
        toast(isEdit ? 'Vehicle updated' : 'Vehicle created', 'success')
        navigate('/vehicles')
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Operation failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  if (loading) return <div className="p-6 space-y-6 animate-pulse"><div className="h-8 bg-muted/50 rounded w-48" /><div className="h-64 bg-muted/50 rounded-xl" /></div>

  return (
    <PageWrapper
      title={isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
      description={isEdit ? 'Update vehicle details' : 'Register a new vehicle in the fleet'}
      headerActions={
        <Button variant="outline" onClick={() => navigate('/vehicles')}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
      }
    >
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Registration Number" required value={form.reg_number} onChange={set('reg_number')} error={errors.reg_number} placeholder="e.g. MH-01-AB-1234" />
              <Input label="Vehicle Name" required value={form.name} onChange={set('name')} error={errors.name} placeholder="e.g. Truck Alpha" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Type" required value={form.type} onChange={set('type')} error={errors.type} options={VEHICLE_TYPES} placeholder="Select type" />
              <Input label="Capacity (kg)" required type="number" min="1" value={form.capacity_kg} onChange={set('capacity_kg')} error={errors.capacity_kg} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Acquisition Cost" required type="number" min="1" value={form.acquisition_cost} onChange={set('acquisition_cost')} error={errors.acquisition_cost} />
              <Input label="Odometer (km)" type="number" min="0" value={form.odometer_km} onChange={set('odometer_km')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Purchase Date" type="date" value={form.purchase_date} onChange={set('purchase_date')} />
              <Input label="Region" value={form.region} onChange={set('region')} placeholder="e.g. North" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate('/vehicles')}>Cancel</Button>
            <Button type="submit" loading={submitting}><Save className="w-4 h-4 mr-2" />{isEdit ? 'Update Vehicle' : 'Save Vehicle'}</Button>
          </CardFooter>
        </form>
      </Card>
    </PageWrapper>
  )
}
