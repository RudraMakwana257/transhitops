import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck, Users, MapPin, Wrench, ArrowRight, Loader2, TrendingUp, AlertCircle } from 'lucide-react'
import { api } from '../api/client'
import type { DashboardKPIs, FleetStatusItem, RecentTrip, AlertData } from '../types'
import { KPICard } from '../components/dashboard/KPICard'
import { FleetStatusChart } from '../components/dashboard/FleetStatusChart'
import { LicenseExpiryAlerts } from '../components/dashboard/LicenseExpiryAlerts'
import { RecentTripsTable } from '../components/dashboard/RecentTripsTable'
import { UpcomingMaintenance } from '../components/dashboard/UpcomingMaintenance'
import { FuelTrendChart } from '../components/dashboard/FuelTrendChart'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function Dashboard() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [fleetStatus, setFleetStatus] = useState<FleetStatusItem[]>([])
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([])
  const [alerts, setAlerts] = useState<AlertData>({ license_expiring: [], license_expired: [], maintenance_due: [] })
  const [fuelTrend, setFuelTrend] = useState<Array<{ date: string; total_cost: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const [kpisRes, fleetRes, tripsRes, alertsRes, fuelRes] = await Promise.all([
        api.get('/dashboard/kpis'),
        api.get('/dashboard/fleet-status'),
        api.get('/dashboard/recent-trips', { params: { limit: 5 } }),
        api.get('/dashboard/alerts'),
        api.get('/dashboard/fuel-trend', { params: { days: 30 } }),
      ])
      
      setKpis(kpisRes.data.data)
      setFleetStatus(fleetRes.data.data)
      setRecentTrips(tripsRes.data.data)
      setAlerts(alertsRes.data.data)
      setFuelTrend(fuelRes.data.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 60000)
    return () => clearInterval(interval)
  }, [])
  
  if (loading && !kpis) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7].map(i => <KPICard key={i} title="Loading" value="—" icon={<Truck />} loading />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-80 animate-pulse" />
          <Card className="h-80 animate-pulse" />
        </div>
      </div>
    )
  }
  
  const kpiItems = [
    { title: 'Active Vehicles', value: kpis?.active_vehicles ?? 0, icon: <Truck className="w-5 h-5" />, color: '#3B82F6' },
    { title: 'Available Vehicles', value: kpis?.available_vehicles ?? 0, icon: <Truck className="w-5 h-5" />, color: '#22C55E' },
    { title: 'Vehicles in Shop', value: kpis?.vehicles_in_shop ?? 0, icon: <Wrench className="w-5 h-5" />, color: '#F59E0B' },
    { title: 'Active Trips', value: kpis?.active_trips ?? 0, icon: <MapPin className="w-5 h-5" />, color: '#8B5CF6' },
    { title: 'Pending Trips', value: kpis?.pending_trips ?? 0, icon: <MapPin className="w-5 h-5" />, color: '#EC4899' },
    { title: 'Drivers Available', value: kpis?.drivers_available ?? 0, icon: <Users className="w-5 h-5" />, color: '#06B6D4' },
    { title: 'Fleet Utilization', value: `${kpis?.fleet_utilization_pct ?? 0}%`, icon: <TrendingUp className="w-5 h-5" />, color: '#D98E04' },
  ]
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">Real-time fleet operations overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={loading}>
            <Loader2 className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.map((item, i) => (
          <KPICard key={i} {...item} loading={loading} />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FleetStatusChart data={fleetStatus} />
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">License Expiry Alerts</h3>
          <LicenseExpiryAlerts 
            expiring={alerts.license_expiring} 
            expired={alerts.license_expired} 
          />
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Recent Trips</h3>
            <Link to="/trips" className="text-sm text-[var(--brand-primary)] hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <RecentTripsTable trips={recentTrips} />
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Upcoming Maintenance</h3>
          <UpcomingMaintenance maintenance={alerts.maintenance_due} />
        </Card>
      </div>
      
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Fuel Cost Trend (30 Days)</h3>
        <FuelTrendChart data={fuelTrend} />
      </Card>
    </div>
  )
}