import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck, Users, MapPin, Wrench, ArrowRight, Loader2, TrendingUp, AlertCircle, Shield, DollarSign, Fuel } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types'
import { KPICard } from '../components/dashboard/KPICard'
import { FleetStatusChart } from '../components/dashboard/FleetStatusChart'
import { LicenseExpiryAlerts } from '../components/dashboard/LicenseExpiryAlerts'
import { RecentTripsTable } from '../components/dashboard/RecentTripsTable'
import { UpcomingMaintenance } from '../components/dashboard/UpcomingMaintenance'
import { FuelTrendChart } from '../components/dashboard/FuelTrendChart'
import { Button } from '../components/ui/ButtonWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/CardWrapper'
import { PageWrapper } from '../components/layout/PageWrapper'
import { formatCurrency } from '../utils/formatters'
import { OnboardingChecklist } from '../components/OnboardingChecklist'

export function Dashboard() {
  const { user } = useAuth()
  const role = user?.role as UserRole | undefined

  const [kpis, setKpis] = useState<any>(null)
  const [fleetStatus, setFleetStatus] = useState<any[]>([])
  const [recentTrips, setRecentTrips] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any>({ license_expiring: [], license_expired: [], maintenance_due: [] })
  const [fuelTrend, setFuelTrend] = useState<any[]>([])
  const [financialKpis, setFinancialKpis] = useState<any>(null)
  const [safetyKpis, setSafetyKpis] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const calls: [string, Promise<any>][] = [
        ['kpis', api.get('/dashboard/kpis')],
        ['alerts', api.get('/dashboard/alerts')],
      ]

      if (role && ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'].includes(role)) {
        calls.push(['fleetStatus', api.get('/dashboard/fleet-status')])
      }
      if (role && ['fleet_manager', 'dispatcher'].includes(role)) {
        calls.push(['recentTrips', api.get('/dashboard/recent-trips', { params: { limit: 5 } })])
      }
      if (role && ['fleet_manager', 'dispatcher', 'financial_analyst'].includes(role)) {
        calls.push(['fuelTrend', api.get('/dashboard/fuel-trend', { params: { days: 30 } })])
      }
      if (role && ['fleet_manager', 'financial_analyst'].includes(role)) {
        calls.push(['financialKpis', api.get('/dashboard/financial-kpis')])
      }
      if (role && ['fleet_manager', 'safety_officer'].includes(role)) {
        calls.push(['safetyKpis', api.get('/dashboard/safety-kpis')])
      }

      const results = await Promise.all(calls.map(([_, p]) => p))
      calls.forEach(([key], i) => {
        const res = results[i]
        if (!res.data.success) return
        switch (key) {
          case 'kpis': setKpis(res.data.data); break
          case 'alerts': setAlerts(res.data.data); break
          case 'fleetStatus': setFleetStatus(res.data.data); break
          case 'recentTrips': setRecentTrips(res.data.data); break
          case 'fuelTrend': setFuelTrend(res.data.data); break
          case 'financialKpis': setFinancialKpis(res.data.data); break
          case 'safetyKpis': setSafetyKpis(res.data.data); break
        }
      })
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
  }, [role])

  const kpiSkeleton = (count: number) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <KPICard key={i} title="..." value="—" icon={<Truck />} loading />
      ))}
    </div>
  )

  if (loading && !kpis) {
    return (
      <PageWrapper title="Dashboard" description="Real-time fleet operations overview">
        <div className="space-y-6">
          {kpiSkeleton(4)}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6 animate-pulse"><div className="h-64 bg-muted/50 rounded-xl" /></div>
            <div className="card p-6 animate-pulse"><div className="h-64 bg-muted/50 rounded-xl" /></div>
          </div>
        </div>
      </PageWrapper>
    )
  }

  const renderFleetManager = () => (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <KPICard title="Active Vehicles" value={kpis?.active_vehicles ?? 0} icon={<Truck className="w-5 h-5" />} color="#3B82F6" loading={loading} />
        <KPICard title="Available" value={kpis?.available_vehicles ?? 0} icon={<Truck className="w-5 h-5" />} color="#22C55E" loading={loading} />
        <KPICard title="In Shop" value={kpis?.vehicles_in_shop ?? 0} icon={<Wrench className="w-5 h-5" />} color="#F59E0B" loading={loading} />
        <KPICard title="Fleet Health" value={kpis?.fleet_health_score ? `${kpis.fleet_health_score}/100` : '—'} icon={<TrendingUp className="w-5 h-5" />} color="#10B981" loading={loading} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <KPICard title="Active Trips" value={kpis?.active_trips ?? 0} icon={<MapPin className="w-5 h-5" />} color="#8B5CF6" loading={loading} />
        <KPICard title="Pending Trips" value={kpis?.pending_trips ?? 0} icon={<MapPin className="w-5 h-5" />} color="#EC4899" loading={loading} />
        <KPICard title="Drivers Available" value={kpis?.drivers_available ?? 0} icon={<Users className="w-5 h-5" />} color="#06B6D4" loading={loading} />
        <KPICard title="Utilization" value={`${kpis?.fleet_utilization_pct ?? 0}%`} icon={<TrendingUp className="w-5 h-5" />} color="#D98E04" loading={loading} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        <div className="xl:col-span-2 space-y-6 sm:space-y-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Trips</CardTitle>
                <Link to="/trips" className="text-sm text-primary hover:underline flex items-center gap-1 whitespace-nowrap bg-primary/10 px-3 py-1.5 rounded-full transition-colors hover:bg-primary hover:text-primary-foreground">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 overflow-hidden">
              <RecentTripsTable trips={recentTrips} />
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader><CardTitle>Fuel Cost Trend (30 Days)</CardTitle></CardHeader>
            <CardContent><FuelTrendChart data={fuelTrend} /></CardContent>
          </Card>
        </div>
        
        <div className="xl:col-span-1 space-y-6 sm:space-y-8">
          <FleetStatusChart data={fleetStatus} />
          
          <Card className="flex flex-col border-destructive/20 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertCircle className="w-5 h-5"/>License Expiry Alerts</CardTitle></CardHeader>
            <CardContent className="flex-1">
              <LicenseExpiryAlerts expiring={alerts.license_expiring} expired={alerts.license_expired} />
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow border-amber-500/20">
            <CardHeader><CardTitle className="text-amber-600 dark:text-amber-500 flex items-center gap-2"><Wrench className="w-5 h-5"/>Upcoming Maintenance</CardTitle></CardHeader>
            <CardContent><UpcomingMaintenance maintenance={alerts.maintenance_due} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  const renderDispatcher = () => (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <KPICard title="Active Vehicles" value={kpis?.active_vehicles ?? 0} icon={<Truck className="w-5 h-5" />} color="#3B82F6" loading={loading} />
        <KPICard title="Available" value={kpis?.available_vehicles ?? 0} icon={<Truck className="w-5 h-5" />} color="#22C55E" loading={loading} />
        <KPICard title="Active Trips" value={kpis?.active_trips ?? 0} icon={<MapPin className="w-5 h-5" />} color="#8B5CF6" loading={loading} />
        <KPICard title="Pending Trips" value={kpis?.pending_trips ?? 0} icon={<MapPin className="w-5 h-5" />} color="#EC4899" loading={loading} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        <div className="xl:col-span-2">
          <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Trips</CardTitle>
                <Link to="/trips" className="text-sm text-primary hover:underline flex items-center gap-1 whitespace-nowrap bg-primary/10 px-3 py-1.5 rounded-full transition-colors hover:bg-primary hover:text-primary-foreground">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 overflow-hidden">
              <RecentTripsTable trips={recentTrips} />
            </CardContent>
          </Card>
        </div>
        
        <div className="xl:col-span-1 space-y-6 sm:space-y-8">
          <FleetStatusChart data={fleetStatus} />
          
          <Card className="flex flex-col border-destructive/20 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertCircle className="w-5 h-5"/>License Expiry Alerts</CardTitle></CardHeader>
            <CardContent className="flex-1">
              <LicenseExpiryAlerts expiring={alerts.license_expiring} expired={alerts.license_expired} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  const renderSafetyOfficer = () => (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <KPICard title="Active Vehicles" value={kpis?.active_vehicles ?? 0} icon={<Truck className="w-5 h-5" />} color="#3B82F6" loading={loading} />
        <KPICard title="Available" value={kpis?.available_vehicles ?? 0} icon={<Truck className="w-5 h-5" />} color="#22C55E" loading={loading} />
        <KPICard title="Drivers Available" value={kpis?.drivers_available ?? 0} icon={<Users className="w-5 h-5" />} color="#06B6D4" loading={loading} />
        <KPICard title="Suspended" value={safetyKpis?.suspended_count ?? 0} icon={<Shield className="w-5 h-5" />} color="#EF4444" loading={loading} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        <Card className="shadow-sm hover:shadow-md transition-shadow border-destructive/20">
          <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertCircle className="w-5 h-5"/>License Expiry Alerts</CardTitle></CardHeader>
          <CardContent>
            <LicenseExpiryAlerts expiring={alerts.license_expiring} expired={alerts.license_expired} />
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow border-primary/20">
          <CardHeader><CardTitle className="text-primary flex items-center gap-2"><Shield className="w-5 h-5"/>Driver Safety Overview</CardTitle></CardHeader>
          <CardContent>
            {safetyKpis ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="text-sm text-muted-foreground font-medium">Avg Safety Score</span>
                  <span className="text-3xl font-black text-primary">{safetyKpis.avg_safety_score}</span>
                </div>
                <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
                  {Object.entries(safetyKpis.distribution).map(([level, count]) => {
                    const colors: Record<string, string> = { excellent: 'bg-green-500', good: 'bg-blue-500', fair: 'bg-amber-500', poor: 'bg-orange-500', critical: 'bg-red-500' }
                    return (
                      <div key={level} className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${colors[level]} shadow-sm`} />
                        <span className="text-sm capitalize flex-1 font-medium text-foreground">{level}</span>
                        <span className="font-bold text-muted-foreground bg-background px-2 py-0.5 rounded-xl border">{count as number}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-pulse">
                <div className="h-16 bg-muted rounded-xl" />
                <div className="h-48 bg-muted rounded-xl" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderFinancialAnalyst = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Operational Cost" value={formatCurrency(financialKpis?.operational_cost ?? 0)} icon={<DollarSign className="w-5 h-5" />} color="#8B5CF6" loading={loading} />
        <KPICard title="Fuel Cost (Month)" value={formatCurrency(financialKpis?.fuel_cost_month ?? 0)} icon={<Fuel className="w-5 h-5" />} color="#3B82F6" loading={loading} />
        <KPICard title="Maintenance (Month)" value={formatCurrency(financialKpis?.maintenance_cost_month ?? 0)} icon={<Wrench className="w-5 h-5" />} color="#F59E0B" loading={loading} />
        <KPICard title="Active Trips" value={kpis?.active_trips ?? 0} icon={<MapPin className="w-5 h-5" />} color="#EC4899" loading={loading} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader><CardTitle>Fuel Cost Trend (30 Days)</CardTitle></CardHeader>
            <CardContent><FuelTrendChart data={fuelTrend} /></CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader><CardTitle>Cost by Vehicle Type</CardTitle></CardHeader>
            <CardContent>
              {financialKpis?.cost_by_type?.length ? (
                <div className="space-y-3">
                  {financialKpis.cost_by_type.map((item: any) => (
                    <div key={item.type} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                      <span className="font-medium">{item.type}</span>
                      <span className="text-sm font-bold">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No cost data</p>}
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Top 5 Most Expensive Vehicles</CardTitle></CardHeader>
        <CardContent className="p-0 sm:p-6">
          {financialKpis?.top_vehicles?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full data-table text-sm">
                <thead className="sticky top-0 bg-card z-10">
                  <tr className="border-b border-border">
                    <th className="text-left data-table th">Vehicle</th>
                    <th className="text-left data-table th">Reg No</th>
                    <th className="text-right data-table th">Fuel</th>
                    <th className="text-right data-table th">Maint.</th>
                    <th className="text-right data-table th">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {financialKpis.top_vehicles.map((v: any) => (
                    <tr key={v.id} className="border-t border-border/50 hover:bg-muted/40 cursor-pointer transition-colors">
                      <td className="data-table td font-medium">{v.name}</td>
                      <td className="data-table td font-mono text-muted-foreground">{v.reg_number}</td>
                      <td className="data-table td text-right">{formatCurrency(v.fuel)}</td>
                      <td className="data-table td text-right">{formatCurrency(v.maintenance)}</td>
                      <td className="data-table td text-right font-bold">{formatCurrency(v.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted-foreground">No vehicle cost data</p>}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <PageWrapper
      title="Dashboard"
      description="Real-time fleet operations overview"
      headerActions={
        <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Loader2 className="w-4 h-4 mr-1" />}
          Refresh
        </Button>
      }
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!role && loading ? (
        <div className="space-y-6">{kpiSkeleton(4)}</div>
      ) : (
        <>
          <OnboardingChecklist />
          {role === 'fleet_manager' && renderFleetManager()}
          {role === 'dispatcher' && renderDispatcher()}
          {role === 'safety_officer' && renderSafetyOfficer()}
          {role === 'financial_analyst' && renderFinancialAnalyst()}
        </>
      )}
    </PageWrapper>
  )
}
