import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../api/client'
import type { Vehicle, Driver } from '../types'
import { Button } from '../components/ui/ButtonWrapper'
import { Input } from '../components/ui/InputWrapper'
import { Select } from '../components/ui/SelectWrapper'
import { Card, CardContent } from '../components/ui/CardWrapper'
import { PageWrapper } from '../components/layout/PageWrapper'
import { StatusBadge } from '../components/ui/BadgeWrapper'
import { Truck, Users, MapPin, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, AlertTriangle, Play } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { toast } from '../store/toastStore'

const step1Schema = z.object({
  source: z.string().min(1, 'Source is required'),
  destination: z.string().min(1, 'Destination is required'),
  cargo_weight_kg: z.number().min(1, 'Cargo weight must be > 0'),
  planned_distance_km: z.number().optional(),
  notes: z.string().optional(),
})

const step2Schema = z.object({
  vehicle_id: z.string().uuid('Select a vehicle'),
})

const step3Schema = z.object({
  driver_id: z.string().uuid('Select a driver'),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>
type Step3Data = z.infer<typeof step3Schema>

const steps = [
  { id: 1, title: 'Route', icon: MapPin },
  { id: 2, title: 'Vehicle', icon: Truck },
  { id: 3, title: 'Driver', icon: Users },
  { id: 4, title: 'Review', icon: CheckCircle },
]

export function TripCreate() {
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [loadingDrivers, setLoadingDrivers] = useState(true)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  
  const canManage = hasRole(['fleet_manager', 'dispatcher'])
  
  const step1Form = useForm<Step1Data>({ resolver: zodResolver(step1Schema), defaultValues: { cargo_weight_kg: 1000 } })
  const step2Form = useForm<Step2Data>({ resolver: zodResolver(step2Schema) })
  const step3Form = useForm<Step3Data>({ resolver: zodResolver(step3Schema) })
  
  const step1Data = step1Form.watch()
  const step2Data = step2Form.watch()
  const step3Data = step3Form.watch()
  
  const cargoWeight = step1Data.cargo_weight_kg || 0
  
  useEffect(() => {
    fetchVehicles()
    fetchDrivers()
  }, [])
  
  useEffect(() => {
    if (cargoWeight > 0 && currentStep === 2) {
      fetchRecommendations(cargoWeight)
    }
  }, [cargoWeight, currentStep])
  
  const fetchVehicles = async () => {
    setLoadingVehicles(true)
    try {
      const res = await api.get('/vehicles/available')
      if (res.data.success) setVehicles(res.data.data)
    } catch (err) {
      toast('Failed to load available vehicles', 'error')
    } finally { setLoadingVehicles(false) }
  }
  
  const fetchDrivers = async () => {
    setLoadingDrivers(true)
    try {
      const res = await api.get('/drivers/available')
      if (res.data.success) setDrivers(res.data.data)
    } catch (err) {
      toast('Failed to load available drivers', 'error')
    } finally { setLoadingDrivers(false) }
  }
  
  const fetchRecommendations = async (weight: number) => {
    setLoadingRecommendations(true)
    try {
      const res = await api.get(`/trips/recommend-vehicle?cargo_weight=${weight}`)
      if (res.data.success) setRecommendations(res.data.data)
    } catch (err) {
      toast('Failed to load recommendations', 'error')
    } finally { setLoadingRecommendations(false) }
  }
  
  const nextStep = async (step: number) => {
    const isValid = await (step === 1 ? step1Form.trigger() : step === 2 ? step2Form.trigger() : step3Form.trigger())
    if (isValid) setCurrentStep(step + 1)
  }
  
  const prevStep = () => setCurrentStep(currentStep - 1)
  
  const createTrip = async (dispatch = false) => {
    const isValid = await step1Form.trigger() && await step2Form.trigger() && await step3Form.trigger()
    if (!isValid) return
    
    setDispatching(true)
    try {
      const res = await api.post('/trips', {
        ...step1Data,
        vehicle_id: step2Data.vehicle_id,
        driver_id: step3Data.driver_id,
      })
      if (res.data.success) {
        const tripId = res.data.data?.id || res.data.data?.trip?.id
        if (dispatch && tripId) {
          await api.put(`/trips/${tripId}/dispatch`, { confirm: true })
        }
        if (tripId) {
          navigate(`/trips/${tripId}`)
        } else {
          navigate('/trips')
        }
      }
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to create trip', 'error')
    } finally {
      setDispatching(false)
    }
  }
  
  const selectedVehicle = vehicles.find(v => v.id === step2Data.vehicle_id)
  const selectedDriver = drivers.find(d => d.id === step3Data.driver_id)
  const capacityOk = selectedVehicle ? cargoWeight <= selectedVehicle.capacity_kg : true
  
  if (!canManage) return <div className="p-6 text-center text-muted-foreground">Access denied</div>
  
  return (
    <PageWrapper title="Create Trip" description="Dispatch a new trip with vehicle and driver assignment">
      <div className="max-w-3xl mx-auto">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center flex-1 relative">
                {idx < steps.length - 1 && (
                  <div className="absolute top-5 left-1/2 w-full h-1 bg-border z-0" />
                )}
                <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                  idx + 1 < currentStep ? 'bg-primary text-white' :
                  idx + 1 === currentStep ? 'bg-primary/10 text-primary ring-2 ring-[hsl(var(--primary))]' :
                  'bg-muted/50 text-muted-foreground'
                }`}>
                  {idx + 1 < currentStep ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                <p className={`mt-2 text-xs font-medium ${idx + 1 <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Step Content */}
        <Card>
          <CardContent className="py-6">
            {/* Step 1: Route */}
            {currentStep === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); nextStep(2); }} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input {...step1Form.register('source')} label="Source" placeholder="Mumbai" error={step1Form.formState.errors.source?.message} />
                  <Input {...step1Form.register('destination')} label="Destination" placeholder="Pune" error={step1Form.formState.errors.destination?.message} />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Input {...step1Form.register('cargo_weight_kg', { valueAsNumber: true })} label="Cargo Weight (kg)" type="number" min="1" placeholder="1000" error={step1Form.formState.errors.cargo_weight_kg?.message} />
                  <Input {...step1Form.register('planned_distance_km', { valueAsNumber: true })} label="Planned Distance (km)" type="number" min="1" placeholder="150" />
                </div>
                <Input {...step1Form.register('notes')} label="Notes" placeholder="Special instructions..." className="md:col-span-2" />
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button type="submit" className="w-full md:w-auto">Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </form>
            )}
            
            {/* Step 2: Vehicle */}
            {currentStep === 2 && (
              <form onSubmit={(e) => { e.preventDefault(); nextStep(3); }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Select Vehicle</label>
                  {loadingRecommendations && <div className="animate-pulse h-8 hover:bg-accent hover:text-accent-foreground rounded mb-4" />}
                  {recommendations.length > 0 && (
                    <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary">
                      <p className="text-sm font-medium text-primary mb-2">Recommended Vehicles</p>
                      <div className="flex flex-wrap gap-2">
                        {recommendations.slice(0, 3).map((rec: any) => (
                          <button
                            key={rec.vehicle.id}
                            type="button"
                            onClick={() => step2Form.setValue('vehicle_id', rec.vehicle.id, { shouldValidate: true })}
                            className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                              step2Data.vehicle_id === rec.vehicle.id
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white dark:bg-card border-border hover:hover:bg-accent hover:text-accent-foreground'
                            }`}
                          >
                            {rec.vehicle.name} ({rec.vehicle.capacity_kg.toLocaleString()}kg)
                            <span className="ml-2 text-xs opacity-75">Score: {rec.score}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <Select
                    {...step2Form.register('vehicle_id')}
                    label="Available Vehicles"
                    options={vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.reg_number}) - ${v.type} - ${v.capacity_kg.toLocaleString()}kg - ${v.health_score ? `${v.health_score}/100` : 'N/A'}` }))}
                    placeholder="Select a vehicle"
                    error={step2Form.formState.errors.vehicle_id?.message}
                  />
                  {step2Data.vehicle_id && selectedVehicle && (
                    <div className="p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{selectedVehicle.type}</span></div>
                        <div><span className="text-muted-foreground">Capacity:</span> <span className="font-medium">{selectedVehicle.capacity_kg.toLocaleString()} kg</span></div>
                        <div><span className="text-muted-foreground">Health Score:</span> <span className="font-medium">{selectedVehicle.health_score}/100</span></div>
                        <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedVehicle.status} type="vehicle" /></div>
                      </div>
                      {!capacityOk && (
                        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <span className="font-medium">Cargo weight ({cargoWeight.toLocaleString()}kg) exceeds vehicle capacity ({selectedVehicle.capacity_kg.toLocaleString()}kg)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-between pt-4 border-t border-border">
                  <Button type="button" variant="secondary" onClick={prevStep}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button type="submit" disabled={!step2Data.vehicle_id || !capacityOk || loadingVehicles}>Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </form>
            )}
            
            {/* Step 3: Driver */}
            {currentStep === 3 && (
              <form onSubmit={(e) => { e.preventDefault(); nextStep(4); }} className="space-y-6">
                <Select
                  {...step3Form.register('driver_id')}
                  label="Available Drivers"
                  options={drivers.map(d => ({ value: d.id, label: `${d.name} - ${d.license_category} - ${d.license_expiry ? format(new Date(d.license_expiry), 'MMM d, yyyy') : 'No expiry'} - Safety: ${d.safety_score}` }))}
                  placeholder="Select a driver"
                  error={step3Form.formState.errors.driver_id?.message}
                />
                {step3Data.driver_id && selectedDriver && (
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{selectedDriver.license_category}</span></div>
                      <div><span className="text-muted-foreground">Expiry:</span> <span className="font-medium">{selectedDriver.license_expiry ? format(new Date(selectedDriver.license_expiry), 'MMM d, yyyy') : 'N/A'}</span></div>
                      <div><span className="text-muted-foreground">Safety Score:</span> <span className="font-medium">{selectedDriver.safety_score}</span></div>
                      <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedDriver.status} type="driver" /></div>
                    </div>
                    {selectedDriver.is_license_expired && (
                      <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                        <AlertCircle className="w-5 h-5 inline mr-2" /> Driver's license has expired!
                      </div>
                    )}
                    {selectedDriver.days_until_expiry !== undefined && selectedDriver.days_until_expiry > 0 && selectedDriver.days_until_expiry <= 30 && !selectedDriver.is_license_expired && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-5 h-5 inline mr-2" /> License expires in {selectedDriver.days_until_expiry} days
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between pt-4 border-t border-border">
                  <Button type="button" variant="secondary" onClick={prevStep}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button type="submit" disabled={!step3Data.driver_id || loadingDrivers}>Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
                </div>
              </form>
            )}
            
            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <h4 className="font-medium text-muted-foreground mb-2">Route</h4>
                    <p className="font-medium">{step1Data.source} → {step1Data.destination}</p>
                    <p className="text-sm text-muted-foreground">{cargoWeight.toLocaleString()} kg • {step1Data.planned_distance_km || '—'} km</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <h4 className="font-medium text-muted-foreground mb-2">Vehicle</h4>
                    {selectedVehicle ? (
                      <p className="font-medium">{selectedVehicle.name} ({selectedVehicle.reg_number})</p>
                    ) : <p className="text-muted-foreground">Not selected</p>}
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <h4 className="font-medium text-muted-foreground mb-2">Driver</h4>
                    {selectedDriver ? (
                      <p className="font-medium">{selectedDriver.name} - {selectedDriver.license_category}</p>
                    ) : <p className="text-muted-foreground">Not selected</p>}
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <h4 className="font-medium text-muted-foreground mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground">{step1Data.notes || 'No notes'}</p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button type="button" variant="secondary" onClick={prevStep}><ChevronLeft className="w-4 h-4 mr-2" />Back</Button>
                  <Button variant="outline" onClick={() => createTrip(false)} disabled={dispatching}>Create as Draft</Button>
                  <Button onClick={() => createTrip(true)} loading={dispatching} disabled={dispatching}>
                    <Play className="w-4 h-4 mr-2" /> Create & Dispatch
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}