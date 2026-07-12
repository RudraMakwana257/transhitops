import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Vehicle, Trip, MaintenanceLog, FuelLog } from '../types'
import { DataTable } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Truck, MapPin, Wrench, Droplets, Settings, AlertCircle, Clock, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { toast } from '../store/toastStore'

export function VehicleDetail({ match }: { match: { params: { id: string } } }) {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>([])
  const [fuel, setFuel] = useState<FuelLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'trips' | 'maintenance' | 'fuel'>('overview')
  const [retiring, setRetiring] = useState(false)
  
  const canManage = hasRole(['fleet_manager'])
  
  useEffect(() => {
    fetchAll()
  }, [match.params.id])
  
  const fetchAll = async () => {
    setLoading(true)
    try {
      const [vRes, tRes, mRes, fRes] = await Promise.all([
        api.get(`/vehicles/${match.params.id}`),
        api.get(`/vehicles/${match.params.id}/trips?page_size=10`),
        api.get(`/vehicles/${match.params.id}/maintenance?page_size=10`),
        api.get(`/vehicles/${match.params.id}/fuel?page_size=10`),
      ])
      if (vRes.data.success) setVehicle(vRes.data.data)
      if (tRes.data.success) setTrips(tRes.data.data.items)
      if (mRes.data.success) setMaintenance(mRes.data.data.items)
      if (fRes.data.success) setFuel(fRes.data.data.items)
    } catch (err) {
      console.error('Failed to fetch vehicle:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRetire = async () => {
    if (!confirm('Are you sure you want to retire this vehicle? This action cannot be undone.')) return
    setRetiring(true)
    try {
      await api.delete(`/vehicles/${match.params.id}`)
      navigate('/vehicles')
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to retire vehicle', 'error')
    } finally {
      setRetiring(false)
    }
  }
  
  if (loading) return <div className="p-6 text-center">Loading...</div>
  if (!vehicle) return <div className="p-6 text-center text-[var(--text-secondary)]">Vehicle not found</div>
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Truck },
    { id: 'trips', label: 'Trips', icon: MapPin },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'fuel', label: 'Fuel', icon: Droplets },
  ]
  
  return (
    <PageWrapper 
      title={vehicle.name} 
      description={`${vehicle.reg_number} • ${vehicle.type} • ${vehicle.capacity_kg.toLocaleString()}kg`}
      headerActions={
        <>
          {canManage && (
            <Button variant="outline" onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}><Settings className="w-4 h-4 mr-2" />Edit</Button>
          )}
          {canManage && vehicle.status !== 'Retired' && (
            <Button variant="outline" onClick={handleRetire} loading={retiring} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800">
              <AlertCircle className="w-4 h-4 mr-2" />Retire
            </Button>
          )}
        </>
      }
    >
      {/* Status & Health */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary-light)] flex items-center justify-center">
                <Truck className="w-6 h-6 text-[var(--brand-primary)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Status</p>
                <StatusBadge status={vehicle.status} type="vehicle" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Health Score</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{vehicle.health_score || '—'}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Odometer</p>
                <p className="text-xl sm:text-2xl font-bold">{vehicle.odometer_km.toLocaleString()} km</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Acquisition Cost</p>
                <p className="text-xl sm:text-2xl font-bold">₹{vehicle.acquisition_cost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-[var(--border-default)] mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <tab.icon className="w-4 h-4 inline mr-2" />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><dt className="text-sm text-[var(--text-secondary)]">Registration</dt><dd className="font-medium">{vehicle.reg_number}</dd></div>
                    <div><dt className="text-sm text-[var(--text-secondary)]">Type</dt><dd className="font-medium">{vehicle.type}</dd></div>
                    <div><dt className="text-sm text-[var(--text-secondary)]">Capacity</dt><dd className="font-medium">{vehicle.capacity_kg.toLocaleString()} kg</dd></div>
                    <div><dt className="text-sm text-[var(--text-secondary)]">Region</dt><dd className="font-medium">{vehicle.region || '—'}</dd></div>
                    <div><dt className="text-sm text-[var(--text-secondary)]">Purchase Date</dt><dd className="font-medium">{vehicle.purchase_date ? format(new Date(vehicle.purchase_date), 'MMM d, yyyy') : '—'}</dd></div>
                    <div><dt className="text-sm text-[var(--text-secondary)]">Acquisition Cost</dt><dd className="font-medium">₹{vehicle.acquisition_cost.toLocaleString()}</dd></div>
                  </div></dl>
                </CardContent>
              </Card>
               
              <Card>
                <CardHeader><CardTitle>Health Breakdown</CardTitle></CardHeader>
                <CardContent>
                  {(vehicle as any).health ? (
                    <div className="space-y-3">
                      {[
                        { key: 'fuel_efficiency_score', label: 'Fuel Efficiency' },
                        { key: 'maintenance_score', label: 'Maintenance' },
                        { key: 'utilization_score', label: 'Utilization' },
                        { key: 'age_score', label: 'Age' },
                        { key: 'cost_score', label: 'Cost' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-[var(--border-default)] rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--brand-primary)] rounded-full" style={{ width: `${(vehicle as any).health[item.key] || 0}%` }} />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{(vehicle as any).health[item.key] || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (<p className="text-[var(--text-muted)]">Health data not available</p>)}
                </CardContent>
              </Card>
            </div>
          </div>
          )}
          
          {activeTab === 'trips' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Trips</CardTitle>
                  <Link to={`/trips?vehicle_id=${vehicle.id}`} className="text-sm text-[var(--brand-primary)] hover:underline">View All</Link>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'trip_number', header: 'Trip No', accessor: 'trip_number', sortable: true },
                    { key: 'route', header: 'Route', render: (t: Trip) => `${t.source} → ${t.destination}` },
                    { key: 'driver', header: 'Driver', render: (t: Trip) => t.driver?.name },
                    { key: 'status', header: 'Status', render: (t: Trip) => <StatusBadge status={t.status} type="trip" /> },
                    { key: 'date', header: 'Date', accessor: 'created_at', sortable: true, render: (d: string) => format(new Date(d), 'MMM d, yyyy') },
                  ]}
                  data={trips}
                  loading={loading}
                  emptyMessage="No trips found"
                  onRowClick={(t) => navigate(`/trips/${t.id}`)}
                />
              </CardContent>
            </Card>
          )}
          
          {activeTab === 'maintenance' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Maintenance History</CardTitle>
                  <Link to={`/maintenance?vehicle_id=${vehicle.id}`} className="text-sm text-[var(--brand-primary)] hover:underline">View All</Link>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'type', header: 'Type', accessor: 'type' },
                    { key: 'scheduled_date', header: 'Scheduled', accessor: 'scheduled_date', sortable: true, render: (m: MaintenanceLog) => format(new Date(m.scheduled_date), 'MMM d, yyyy') },
                    { key: 'status', header: 'Status', render: (m: MaintenanceLog) => <StatusBadge status={m.status} type="maintenance" /> },
                    { key: 'cost', header: 'Cost', accessor: 'cost', align: 'right' as const, render: (m: MaintenanceLog) => `₹${m.cost.toLocaleString()}` },
                    { key: 'technician', header: 'Technician', accessor: 'technician' },
                  ]}
                  data={maintenance}
                  loading={loading}
                  emptyMessage="No maintenance records"
                />
              </CardContent>
            </Card>
          )}
          
          {activeTab === 'fuel' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Fuel History</CardTitle>
                  <Link to={`/fuel?vehicle_id=${vehicle.id}`} className="text-sm text-[var(--brand-primary)] hover:underline">View All</Link>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'date', header: 'Date', accessor: 'date', sortable: true, render: (f: FuelLog) => format(new Date(f.date), 'MMM d, yyyy') },
                    { key: 'liters', header: 'Liters', accessor: 'liters', align: 'right' as const, render: (f: FuelLog) => `${f.liters} L` },
                    { key: 'price_per_liter', header: 'Price/L', accessor: 'price_per_liter', align: 'right' as const, render: (f: FuelLog) => `₹${f.price_per_liter}` },
                    { key: 'total_cost', header: 'Total', accessor: 'total_cost', align: 'right' as const, render: (f: FuelLog) => `₹${f.total_cost.toLocaleString()}` },
                    { key: 'odometer_reading', header: 'Odometer', accessor: 'odometer_reading', align: 'right' as const, render: (f: FuelLog) => f.odometer_reading ? `${f.odometer_reading.toLocaleString()} km` : '—' },
                    { key: 'fuel_station', header: 'Station', accessor: 'fuel_station' },
                  ]}
                  data={fuel}
                  loading={loading}
                  emptyMessage="No fuel logs"
                />
              </CardContent>
            </Card>
          )}
      </PageWrapper>
    )
  }
