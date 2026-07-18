import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { LicenseCategory } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent, CardFooter } from '../components/ui/Card'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from '../store/toastStore'

const LICENSE_CATEGORIES: { value: LicenseCategory; label: string }[] = [
  { value: 'LMV', label: 'LMV — Light Motor Vehicle' },
  { value: 'HMV', label: 'HMV — Heavy Motor Vehicle' },
  { value: 'HPMV', label: 'HPMV — Heavy Passenger Motor Vehicle' },
  { value: 'Transport', label: 'Transport' },
]

export function DriverCreate() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    license_number: '',
    license_category: '' as LicenseCategory | '',
    license_expiry: '',
    phone: '',
    safety_score: '100',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Driver name is required'
    if (!form.license_number.trim()) e.license_number = 'License number is required'
    if (!form.license_category) e.license_category = 'License category is required'
    if (!form.license_expiry) e.license_expiry = 'License expiry date is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await api.post('/drivers', {
        name: form.name,
        license_number: form.license_number,
        license_category: form.license_category,
        license_expiry: form.license_expiry,
        phone: form.phone,
        safety_score: Number(form.safety_score),
      })
      if (res.data.success) {
        toast('Driver created', 'success')
        navigate('/drivers')
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to create driver', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <PageWrapper
      title="Add Driver"
      description="Register a new driver"
      headerActions={
        <Button variant="outline" onClick={() => navigate('/drivers')}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
      }
    >
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Driver Name" required value={form.name} onChange={set('name')} error={errors.name} placeholder="Full name" />
              <Input label="License Number" required value={form.license_number} onChange={set('license_number')} error={errors.license_number} placeholder="e.g. MH-01234567890" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="License Category" required value={form.license_category} onChange={set('license_category')} error={errors.license_category} options={LICENSE_CATEGORIES} placeholder="Select category" />
              <Input label="License Expiry" required type="date" value={form.license_expiry} onChange={set('license_expiry')} error={errors.license_expiry} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Phone Number" required value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="e.g. +91-9876543210" />
              <Input label="Safety Score" type="number" min="0" max="100" value={form.safety_score} onChange={set('safety_score')} helperText="Default: 100" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate('/drivers')}>Cancel</Button>
            <Button type="submit" loading={submitting}><Save className="w-4 h-4 mr-2" />Save Driver</Button>
          </CardFooter>
        </form>
      </Card>
    </PageWrapper>
  )
}
