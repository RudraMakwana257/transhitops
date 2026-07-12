import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Trip, TripStatus, Vehicle, Driver, MaintenanceLog, FuelLog } from '../types'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { StatusBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { PageWrapper } from '../components/layout/PageWrapper'
import { MapPin, Truck, User, Calendar, Clock, FuelPump, Wrench, DollarSign, CheckCircle, XCircle, Play, Pause, AlertTriangle, Loader2, ChevronLeft } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { formatCurrency, formatDistance, formatPercentage } from '../utils/formatters'

export function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [dispatching, setDispatching] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [completeForm, setCompleteForm] = useState({
    end_odometer: '',
    fuel_consumed_l: '',
    revenue: '',
    notes: '',
  })
  const [cancelReason, setCancelReason] = useState('')
  
  const canManage = hasRole(['fleet_manager', 'dispatcher'])
  
  useEffect(() => {
    if (id) fetchTrip()
  }, [id])
  
  const fetchTrip = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/trips/${id}`)
      if (res.data.success) setTrip(res.data.data)
    } catch (err) {
      console.error('Failed to fetch trip:', err)
      navigate('/trips')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDispatch = async () => {
    if (!confirm('Dispatch this trip? Vehicle and driver will be marked as On Trip.')) return
    setDispatching(true)
    try {
      await api.put(`/trips/${id}/dispatch`, { confirm: true })
      fetchTrip()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch')
    } finally {
      setDispatching(false)
    }
  }
  
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    setCompleting(true)
    try {
      await api.put(`/trips/${id}/complete`, {
        end_odometer: Number(completeForm.end_odometer),
        fuel_consumed_l: Number(completeForm.fuel_consumed_l),
        revenue: Number(completeForm.revenue) || 0,
        notes: completeForm.notes,
      })
      setShowCompleteModal(false)
      fetchTrip()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete')
    } finally {
      setCompleting(false)
    }
  }
  
  const handleCancel = async () => {
    if (!cancelReason.trim()) { alert('Please provide a reason'); return }
    setCancelling(true)
    try {
      await api.put(`/trips/${id}/cancel`, { reason: cancelReason })
      fetchTrip()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel')
    } finally {
      setCancelling(false)
    }
  }
  
  if (loading) return <div className="p-6 text-center text-[var(--text-muted)]">Loading...</div>
  if (!trip) return <div className="p-6 text-center text-red-600">Trip not found</div>
  
  const vehicle = trip.vehicle
  const driver = trip.driver
  const isDraft = trip.status === 'Draft'
  const isDispatched = trip.status === 'Dispatched'
  const isCompleted = trip.status === 'Completed'
  const isCancelled = trip.status === 'Cancelled'
  
  const canDispatch = canManage && isDraft
  const canComplete = canManage && isDispatched
  const canCancel = canManage && (isDraft || isDispatched)
  
  return (
    <PageWrapper 
      title={trip.trip_number} 
      description={`${trip.source} → ${trip.destination}`}
      headerActions={
        <>
          {canCancel && <Button variant="danger" onClick={() => setShowCancelModal(true)} disabled={cancelling}><XCircle className="w-4 h-4 mr-2" />Cancel Trip</Button>}
          {canComplete && <Button onClick={() => setShowCompleteModal(true)} disabled={completing}><CheckCircle className="w-4 h-4 mr-2" />Complete Trip</Button>}
          {canDispatch && <Button onClick={handleDispatch} disabled={dispatching}><Play className="w-4 h-4 mr-2" />Dispatch Trip</Button>}
          <Button variant="secondary" onClick={() => navigate('/trips')}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Trip Details</CardTitle>
                <StatusBadge status={trip.status} type="trip" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Route</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {trip.source} → {trip.destination}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Cargo Weight</p>
                  <p className="font-medium">{trip.cargo_weight_kg.toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Planned Distance</p>
                  <p className="font-medium">{trip.planned_distance_km ? `${trip.planned_distance_km} km` : '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Actual Distance</p>
                  <p className="font-medium">{trip.actual_distance_km ? `${trip.actual_distance_km} km` : '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Created</p>
                  <p className="font-medium">{format(new Date(trip.created_at), 'MMM d, yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Revenue</p>
                  <p className="font-medium text-green-600">{formatCurrency(trip.revenue || 0)}</p>
                </div>
              </div>
              
              {trip.notes && (
                <div className="p-3 rounded-lg bg-[var(--bg-sidebar)]">
                  <p className="text-sm text-[var(--text-secondary)]">{trip.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TimelineItem 
                  icon={<Calendar className="w-5 h-5" />} 
                  title="Trip Created" 
                  time={format(new Date(trip.created_at), 'MMM d, yyyy HH:mm')}
                  description={`Created as ${trip.status}`}
                  active={true}
                />
                {trip.dispatched_at && (
                  <TimelineItem 
                    icon={<Play className="w-5 h-5" />} 
                    title="Dispatched" 
                    time={format(new Date(trip.dispatched_at), 'MMM d, yyyy HH:mm')}
                    description={`Vehicle: ${vehicle?.name} (${vehicle?.reg_number}) | Driver: ${driver?.name}`}
                    active={isDispatched || isCompleted || isCancelled}
                  />
                )}
                {trip.completed_at && (
                  <TimelineItem 
                    icon={<CheckCircle className="w-5 h-5" />} 
                    title="Completed" 
                    time={format(new Date(trip.completed_at), 'MMM d, yyyy HH:mm')}
                    description={`Distance: ${trip.actual_distance_km} km | Fuel: ${trip.fuel_consumed_l} L | Revenue: ${formatCurrency(trip.revenue || 0)}`}
                    active={isCompleted}
                  />
                )}
                {trip.cancelled_at && (
                  <TimelineItem 
                    icon={<XCircle className="w-5 h-5" />} 
                    title="Cancelled" 
                    time={format(new Date(trip.cancelled_at), 'MMM d, yyyy HH:mm')}
                    description={trip.notes || 'No reason provided'}
                    active={isCancelled}
                    variant="danger"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vehicle Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vehicle</CardTitle>
                <StatusBadge status={vehicle?.status || '—'} type="vehicle" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <VehicleInfoCard vehicle={vehicle} />
            </CardContent>
          </Card>
          
          {/* Driver Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Driver</CardTitle>
                <StatusBadge status={driver?.status || '—'} type="driver" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <DriverInfoCard driver={driver} />
            </CardContent>
          </Card>
          
          {/* Fuel Card */}
          {trip.fuel_consumed_l && (
            <Card>
              <CardHeader><CardTitle>Fuel Consumption</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Fuel Consumed</span><span className="font-medium">{trip.fuel_consumed_l} L</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Efficiency</span><span className="font-medium">{trip.actual_distance_km && trip.fuel_consumed_l ? `${(trip.actual_distance_km / trip.fuel_consumed_l).toFixed(1)} km/L` : '—'}</span></div>
                {trip.fuel_log && (
                  <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Station</span><span className="font-medium">{trip.fuel_log.fuel_station}</span></div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Revenue Card */}
          <Card>
            <CardHeader><CardTitle>Financial Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Revenue</span><span className="font-medium text-green-600">{formatCurrency(trip.revenue || 0)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Fuel Cost</span><span className="font-medium">{trip.fuel_log ? formatCurrency(trip.fuel_log.total_cost) : '—'}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modals */}
      <CompleteTripModal 
        isOpen={showCompleteModal} 
        onClose={() => setShowCompleteModal(false)} 
        onSubmit={handleComplete}
        loading={completing}
        startOdometer={trip.start_odometer || 0}
      />
      
      <ConfirmModal 
        isOpen={!!showCancelModal} 
        onClose={() => { setShowCancelModal(false); setCancelReason(''); }} 
        onConfirm={handleCancel}
        loading={cancelling}
        title="Cancel Trip"
        message="Are you sure you want to cancel this trip? This action cannot be undone."
        confirmLabel="Cancel Trip"
        confirmVariant="danger"
        requireReason
        reason={cancelReason}
        onReasonChange={setCancelReason}
        reasonPlaceholder="Enter cancellation reason..."
      />
    </PageWrapper>
  )
}

function VehicleInfoCard({ vehicle }: { vehicle: Vehicle | null }) {
  if (!vehicle) return <p className="text-[var(--text-muted)]">No vehicle assigned</p>
  return (
    <div className="space-y-2">
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Name</span><span className="font-medium">{vehicle.name}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Reg Number</span><span className="font-medium">{vehicle.reg_number}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Type</span><span className="font-medium">{vehicle.type}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Capacity</span><span className="font-medium">{vehicle.capacity_kg.toLocaleString()} kg</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Odometer</span><span className="font-medium">{vehicle.odometer_km.toLocaleString()} km</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Region</span><span className="font-medium">{vehicle.region || '—'}</span></div>
    </div>
  )
}

function DriverInfoCard({ driver }: { driver: Driver | null }) {
  if (!driver) return <p className="text-[var(--text-muted)]">No driver assigned</p>
  return (
    <div className="space-y-2">
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Name</span><span className="font-medium">{driver.name}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">License</span><span className="font-medium">{driver.license_number}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Category</span><span className="font-medium">{driver.license_category}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Expiry</span><span className="font-medium">{format(new Date(driver.license_expiry), 'MMM d, yyyy')}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Safety Score</span><span className="font-medium">{driver.safety_score.toFixed(1)}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Phone</span><span className="font-medium">{driver.phone}</span></div>
    </div>
  )
}

function TimelineItem({ icon, title, time, description, active, variant }: { icon: React.ReactNode; title: string; time: string; description?: string; active: boolean; variant?: 'danger' }) {
  return (
    <div className="flex gap-3 relative">
      <div className="relative flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${active ? (variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-[var(--brand-primary)] text-white') : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)]'}`}>
          {icon}
        </div>
        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-[var(--border-default)]" />
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-baseline gap-2">
          <h4 className={`font-medium ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{title}</h4>
          <span className="text-xs text-[var(--text-muted)]">{time}</span>
        </div>
        {description && <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>}
      </div>
    </div>
  )
}

function CompleteTripModal({ isOpen, onClose, onSubmit, loading, startOdometer }: { isOpen: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void; loading: boolean; startOdometer: number }) {
  if (!isOpen) return null
  const [form, setForm] = useState({ end_odometer: '', fuel_consumed_l: '', revenue: '', notes: '' })
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Trip" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input {...{ value: form.end_odometer, onChange: (e) => setForm({...form, end_odometer: e.target.value}) }} label="End Odometer (km) *" type="number" min={startOdometer + 1} placeholder={`${startOdometer + 1}`} required />
          <Input {...{ value: form.fuel_consumed_l, onChange: (e) => setForm({...form, fuel_consumed_l: e.target.value}) }} label="Fuel Consumed (L) *" type="number" min="0.01" step="0.01" required />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input {...{ value: form.revenue, onChange: (e) => setForm({...form, revenue: e.target.value}) }} label="Revenue (₹)" type="number" min="0" step="1" />
        </div>
        <Textarea {...{ value: form.notes, onChange: (e) => setForm({...form, notes: e.target.value}) }} label="Notes" placeholder="Additional notes..." rows={3} />
        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Complete Trip</Button>
        </div>
      </form>
    </Modal>
  )
}

function ConfirmModal({ isOpen, onClose, onConfirm, loading, title, message, confirmLabel, confirmVariant, requireReason, reason, onReasonChange, reasonPlaceholder }: any) {
  if (!isOpen) return null
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <p className="text-[var(--text-secondary)]">{message}</p>
        {requireReason && (
          <Textarea 
            value={reason} 
            onChange={(e) => onReasonChange(e.target.value)} 
            placeholder={reasonPlaceholder} 
            label="Reason (required)" 
            rows={3} 
          />
        )}
        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-default)]">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading} disabled={requireReason && !reason.trim()}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Textarea({ value, onChange, label, placeholder, rows, ...props }: any) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">{label}</label>}
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} className="form-input min-h-[80px] resize-y" {...props} />
    </div>
  )
}

function useState<T>(initial: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = React.useState(initial)
  return [state, setState]
}