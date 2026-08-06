import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTripStore } from '../stores/tripStore'
import { Button } from '../components/ui/ButtonWrapper'
import { Input } from '../components/ui/InputWrapper'
import { Card, CardContent, CardFooter } from '../components/ui/CardWrapper'
import { PageWrapper } from '../components/layout/PageWrapper'
import { StatusBadge } from '../components/ui/BadgeWrapper'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from '../store/toastStore'

export function TripEdit() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  
  const { selectedTrip, fetchTrip, updateTrip, loading, error, clearSelected, clearError } = useTripStore()
  
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    source: '',
    destination: '',
    cargo_weight_kg: '',
    planned_distance_km: '',
    revenue: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (id) {
      fetchTrip(id)
    }
    return () => {
      clearSelected()
      clearError()
    }
  }, [id])

  useEffect(() => {
    if (selectedTrip) {
      setForm({
        source: selectedTrip.source,
        destination: selectedTrip.destination,
        cargo_weight_kg: selectedTrip.cargo_weight_kg.toString(),
        planned_distance_km: selectedTrip.planned_distance_km?.toString() || '',
        revenue: selectedTrip.revenue.toString(),
        notes: selectedTrip.notes || '',
      })
    }
  }, [selectedTrip])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.source.trim()) e.source = 'Source is required'
    if (!form.destination.trim()) e.destination = 'Destination is required'
    if (!form.cargo_weight_kg || Number(form.cargo_weight_kg) <= 0) e.cargo_weight_kg = 'Cargo weight must be > 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !id || selectedTrip?.status !== 'Draft') return
    setSubmitting(true)
    try {
      await updateTrip(id, {
        source: form.source,
        destination: form.destination,
        cargo_weight_kg: Number(form.cargo_weight_kg),
        planned_distance_km: form.planned_distance_km ? Number(form.planned_distance_km) : undefined,
        revenue: form.revenue ? Number(form.revenue) : 0,
        notes: form.notes,
      })
      toast('Trip updated successfully', 'success')
      navigate(`/trips/${id}`)
    } catch (err) {
      // Handled in store
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const isDraft = selectedTrip?.status === 'Draft'

  return (
    <PageWrapper
      title="Edit Trip"
      description={selectedTrip ? `Update details for trip ${selectedTrip.trip_number}` : 'Update trip details'}
      headerActions={
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
      }
    >
      <Card className="max-w-2xl">
        {loading ? (
          <div className="p-8 flex justify-center text-muted-foreground animate-pulse">Loading trip data...</div>
        ) : error ? (
          <div className="p-6 text-red-500">{error}</div>
        ) : selectedTrip ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              {!isDraft && (
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
                  <p className="text-amber-800 dark:text-amber-300 font-medium text-sm">This trip can no longer be edited</p>
                  <StatusBadge status={selectedTrip.status} type="trip" />
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Vehicle (Read-only)" value={selectedTrip.vehicle?.name || selectedTrip.vehicle_id} disabled />
                <Input label="Driver (Read-only)" value={selectedTrip.driver?.name || selectedTrip.driver_id} disabled />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Source" required value={form.source} onChange={set('source')} error={errors.source} disabled={!isDraft} />
                <Input label="Destination" required value={form.destination} onChange={set('destination')} error={errors.destination} disabled={!isDraft} />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Cargo Weight (kg)" type="number" required value={form.cargo_weight_kg} onChange={set('cargo_weight_kg')} error={errors.cargo_weight_kg} disabled={!isDraft} />
                <Input label="Planned Distance (km)" type="number" value={form.planned_distance_km} onChange={set('planned_distance_km')} disabled={!isDraft} />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Revenue" type="number" value={form.revenue} onChange={set('revenue')} disabled={!isDraft} />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-foreground">Notes</label>
                  <textarea 
                    className="w-full px-3 py-2 border rounded-xl bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] border-border text-foreground"
                    rows={3} 
                    value={form.notes} 
                    onChange={set('notes')}
                    disabled={!isDraft}
                  />
                </div>
              </div>
            </CardContent>
            {isDraft && (
              <CardFooter className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" loading={submitting}><Save className="w-4 h-4 mr-2" />Save Changes</Button>
              </CardFooter>
            )}
          </form>
        ) : null}
      </Card>
    </PageWrapper>
  )
}
