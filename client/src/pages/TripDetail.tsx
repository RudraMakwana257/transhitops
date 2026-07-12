import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Trip, Vehicle, Driver } from '../types'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { StatusBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { PageWrapper } from '../components/layout/PageWrapper'
import { MapPin, Calendar, CheckCircle, XCircle, Play, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { formatCurrency } from '../utils/formatters'
import { toast } from '../store/toastStore'
import { VehicleInfoCard } from '../components/trip/VehicleInfoCard'
import { DriverInfoCard } from '../components/trip/DriverInfoCard'
import { TimelineItem } from '../components/trip/TimelineItem'
import { CompleteTripModal } from '../components/trip/CompleteTripModal'
import { ConfirmModal } from '../components/trip/ConfirmModal'

export function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [dispatching, setDispatching] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
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
    setDispatching(true)
    try {
      await api.put(`/trips/${id}/dispatch`, { confirm: true })
      toast('Trip dispatched successfully', 'success')
      fetchTrip()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to dispatch', 'error')
    } finally {
      setDispatching(false)
    }
  }
  
  const handleCancel = async () => {
    if (!cancelReason.trim()) { toast('Please provide a reason', 'warning'); return }
    setCancelling(true)
    try {
      await api.put(`/trips/${id}/cancel`, { reason: cancelReason })
      toast('Trip cancelled', 'success')
      fetchTrip()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to cancel', 'error')
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
          {canComplete && <Button onClick={() => setShowCompleteModal(true)}><CheckCircle className="w-4 h-4 mr-2" />Complete Trip</Button>}
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
              </CardContent>
            </Card>
          )}
          
          {/* Revenue Card */}
          <Card>
            <CardHeader><CardTitle>Financial Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Revenue</span><span className="font-medium text-green-600">{formatCurrency(trip.revenue || 0)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Fuel Cost</span><span className="font-medium">—</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modals */}
      <CompleteTripModal 
        isOpen={showCompleteModal} 
        onClose={() => setShowCompleteModal(false)} 
        onComplete={fetchTrip}
        startOdometer={trip.start_odometer || 0}
        tripId={trip.id}
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


