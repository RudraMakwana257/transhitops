import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDriverStore } from '../stores/driverStore'
import type { LicenseCategory } from '../types'
import { Button } from '../components/ui/ButtonWrapper'
import { Input } from '../components/ui/InputWrapper'
import { Select } from '../components/ui/SelectWrapper'
import { Card, CardContent, CardFooter } from '../components/ui/CardWrapper'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from '../store/toastStore'

const LICENSE_CATEGORIES: { value: LicenseCategory; label: string }[] = [
  { value: 'LMV', label: 'LMV — Light Motor Vehicle' },
  { value: 'HMV', label: 'HMV — Heavy Motor Vehicle' },
  { value: 'HPMV', label: 'HPMV — Heavy Passenger Motor Vehicle' },
  { value: 'Transport', label: 'Transport' },
]

const DRIVER_STATUSES = [
  { value: 'Available', label: 'Available' },
  { value: 'On Trip', label: 'On Trip' },
  { value: 'Off Duty', label: 'Off Duty' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'On Leave', label: 'On Leave' },
]

export function DriverEdit() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  
  const { selectedDriver, fetchDriver, updateDriver, loading, error, clearSelected, clearError } = useDriverStore()
  
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    license_number: '',
    license_category: '' as LicenseCategory | '',
    license_expiry: '',
    phone: '',
    safety_score: '100',
    status: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (id) {
      fetchDriver(id)
    }
    return () => {
      clearSelected()
      clearError()
    }
  }, [id])

  useEffect(() => {
    if (selectedDriver) {
      setForm({
        name: selectedDriver.name,
        license_number: selectedDriver.license_number,
        license_category: selectedDriver.license_category as LicenseCategory,
        license_expiry: selectedDriver.license_expiry.split('T')[0],
        phone: selectedDriver.phone,
        safety_score: selectedDriver.safety_score.toString(),
        status: selectedDriver.status,
      })
    }
  }, [selectedDriver])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Driver name is required'
    if (!form.license_category) e.license_category = 'License category is required'
    if (!form.license_expiry) e.license_expiry = 'License expiry date is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!form.status) e.status = 'Status is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !id) return
    setSubmitting(true)
    try {
      await updateDriver(id, {
        name: form.name,
        license_category: form.license_category,
        license_expiry: form.license_expiry,
        phone: form.phone,
        safety_score: Number(form.safety_score),
        status: form.status,
      })
      toast('Driver updated successfully', 'success')
      navigate(`/drivers/${id}`)
    } catch (err) {
      // Error handled in store but we might want to catch it to stop submitting
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <PageWrapper
      title="Edit Driver"
      description="Update driver details"
      headerActions={
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
      }
    >
      <Card className="max-w-2xl">
        {loading ? (
          <div className="p-8 flex justify-center text-muted-foreground animate-pulse">Loading driver data...</div>
        ) : error ? (
          <div className="p-6 text-red-500">{error}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Driver Name" required value={form.name} onChange={set('name')} error={errors.name} placeholder="Full name" />
                <Input label="License Number (Read-only)" value={form.license_number} disabled />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="License Category" required value={form.license_category} onChange={set('license_category')} error={errors.license_category} options={LICENSE_CATEGORIES} placeholder="Select category" />
                <Input label="License Expiry" required type="date" value={form.license_expiry} onChange={set('license_expiry')} error={errors.license_expiry} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Phone Number" required value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="e.g. +91-9876543210" />
                <Input label="Safety Score" type="number" min="0" max="100" value={form.safety_score} onChange={set('safety_score')} helperText="0-100 scale" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Status" required value={form.status} onChange={set('status')} error={errors.status} options={DRIVER_STATUSES} placeholder="Select status" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" loading={submitting}><Save className="w-4 h-4 mr-2" />Save Changes</Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </PageWrapper>
  )
}
