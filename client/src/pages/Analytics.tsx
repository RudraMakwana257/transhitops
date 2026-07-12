import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Download } from 'lucide-react'
import { format } from 'date-fns'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { CHART_COLORS } from '../utils/formatters'
import { useAuth } from '../hooks/useAuth'

export function Analytics() {
  const { hasRole } = useAuth()
  const canViewFinancial = hasRole(['fleet_manager', 'financial_analyst'])
  const canViewDriverPerf = hasRole(['fleet_manager', 'safety_officer'])
  
  const [fuelEff, setFuelEff] = useState<any[]>([])
  const [utilization, setUtilization] = useState<any>(null)
  const [opCost, setOpCost] = useState<any[]>([])
  const [roi, setRoi] = useState<any[]>([])
  const [driverPerf, setDriverPerf] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ from: format(new Date(Date.now() - 30*86400000), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') })
  
  useEffect(() => {
    fetchAll()
  }  , [dateRange.from, dateRange.to])
  
  const fetchAll = async () => {
    setLoading(true)
    try {
      const params = `from_date=${dateRange.from}&to_date=${dateRange.to}`
      const [feRes, utilRes, costRes, roiRes, perfRes] = await Promise.all([
        api.get(`/analytics/fuel-efficiency?${params}`),
        api.get(`/analytics/fleet-utilization?${params}`),
        canViewFinancial ? api.get(`/analytics/operational-cost?${params}`) : Promise.resolve({ data: { success: false } }),
        canViewFinancial ? api.get(`/analytics/vehicle-roi?${params}`) : Promise.resolve({ data: { success: false } }),
        canViewDriverPerf ? api.get(`/analytics/driver-performance?${params}`) : Promise.resolve({ data: { success: false } }),
      ])
      if (feRes.data.success) setFuelEff(feRes.data.data)
      if (utilRes.data.success) setUtilization(utilRes.data.data)
      if (costRes.data.success) setOpCost(costRes.data.data)
      if (roiRes.data.success) setRoi(roiRes.data.data)
      if (perfRes.data.success) setDriverPerf(perfRes.data.data)
    } catch (err) {
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <PageWrapper title="Analytics" description="Fleet performance and cost analytics">
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--text-secondary)]">Date Range:</label>
          <input type="date" value={dateRange.from} onChange={(e) => setDateRange(d => ({ ...d, from: e.target.value }))} className="form-input w-40" />
          <span className="text-[var(--text-muted)]">to</span>
          <input type="date" value={dateRange.to} onChange={(e) => setDateRange(d => ({ ...d, to: e.target.value }))} className="form-input w-40" />
        </div>
        <Button variant="outline" onClick={() => window.open(`/api/reports/export-csv?from_date=${dateRange.from}&to_date=${dateRange.to}`, '_blank')}>
          <Download className="w-4 h-4 mr-2" />Export CSV
        </Button>
      </div>
      
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Card key={i} className="animate-pulse h-64" />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader><CardTitle>Fleet Utilization</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold">{utilization?.utilization_pct?.toFixed(1)}%</p>
                <p className="text-sm text-[var(--text-muted)]">{utilization?.on_trip_vehicles}/{utilization?.total_active_vehicles} vehicles on trip</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Avg Fuel Efficiency</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold">{fuelEff.reduce((s, v) => s + (v.avg_kmpl || 0), 0) / (fuelEff.length || 1)} km/L</p>
              </CardContent>
            </Card>
            {canViewFinancial && (
              <>
                <Card>
                  <CardHeader><CardTitle>Total Operational Cost</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl sm:text-3xl font-bold">₹{opCost.reduce((s, v) => s + (v.total_cost || 0), 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Avg Fleet ROI</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl sm:text-3xl font-bold">{(roi.reduce((s, v) => s + (v.roi || 0), 0) / (roi.length || 1) * 100).toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          
          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader><CardTitle>Fuel Efficiency by Vehicle</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={fuelEff} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                    <XAxis dataKey="vehicle_name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }} />
                    <Bar dataKey="avg_kmpl" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarWidth={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {canViewFinancial && (
              <Card>
                <CardHeader><CardTitle>Operational Cost Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={opCost} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} />
                      <YAxis dataKey="vehicle_name" type="category" width={100} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }} />
                      <Legend />
                      <Bar dataKey="fuel_cost" fill={CHART_COLORS.primary} name="Fuel" radius={[0, 4, 4, 0]} maxBarWidth={30} stackId="a" />
                      <Bar dataKey="maintenance_cost" fill={CHART_COLORS.warning} name="Maintenance" radius={[0, 4, 4, 0]} maxBarWidth={30} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader><CardTitle>Fleet Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Available', value: utilization?.by_vehicle?.filter((v: any) => v.status === 'Available').length || 0, color: CHART_COLORS.success },
                        { name: 'On Trip', value: utilization?.on_trip_vehicles || 0, color: CHART_COLORS.info },
                        { name: 'In Shop', value: utilization?.by_vehicle?.filter((v: any) => v.status === 'In Shop').length || 0, color: CHART_COLORS.warning },
                        { name: 'Retired', value: utilization?.by_vehicle?.filter((v: any) => v.status === 'Retired').length || 0, color: CHART_COLORS.muted },
                      ]}
                      cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name" labelLine={false}
                    >
                      {['Available', 'On Trip', 'In Shop', 'Retired'].map((_, i) => <Cell key={`cell-${i}`} fill={CHART_COLORS[i as keyof typeof CHART_COLORS] || CHART_COLORS.muted} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Vehicles']} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={10} wrapperStyle={{ paddingRight: 20 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {canViewFinancial && (
              <Card>
                <CardHeader><CardTitle>Operational Cost by Vehicle</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={opCost} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                      <XAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }} />
                      <Area type="monotone" dataKey="total_cost" stroke={CHART_COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#costGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Tables */}
          <div className="grid gap-6 md:grid-cols-2">
            {canViewFinancial && (
              <Card>
                <CardHeader><CardTitle>Vehicle ROI</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full data-table">
                      <thead>
                        <tr>
                          <th>Vehicle</th>
                          <th className="text-right">Acquisition</th>
                          <th className="text-right">Revenue</th>
                          <th className="text-right">Costs</th>
                          <th className="text-right">ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roi.slice(0, 10).map((r: any) => (
                          <tr key={r.vehicle_id}>
                            <td className="font-medium">{r.vehicle_name}</td>
                            <td className="text-right">₹{r.acquisition_cost?.toLocaleString()}</td>
                            <td className="text-right text-green-600">₹{r.revenue?.toLocaleString()}</td>
                            <td className="text-right text-red-600">₹{((r.fuel_cost || 0) + (r.maintenance_cost || 0)).toLocaleString()}</td>
                            <td className="text-right font-semibold" style={{ color: (r.roi || 0) >= 0 ? 'var(--status-available)' : 'var(--status-critical)' }}>
                              {(r.roi * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {canViewDriverPerf && (
              <Card>
                <CardHeader><CardTitle>Driver Performance</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full data-table">
                      <thead>
                        <tr>
                          <th>Driver</th>
                          <th className="text-center">Trips</th>
                          <th className="text-center">Distance</th>
                          <th className="text-center">Efficiency</th>
                          <th className="text-center">Safety</th>
                          <th className="text-center">On-Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {driverPerf.slice(0, 10).map((d: any) => (
                          <tr key={d.driver_id}>
                            <td className="font-medium">{d.driver_name}</td>
                            <td className="text-center">{d.trips_completed}</td>
                            <td className="text-center">{d.total_distance_km?.toLocaleString()} km</td>
                            <td className="text-center">{d.avg_fuel_efficiency?.toFixed(1)} km/L</td>
                            <td className="text-center">{d.safety_score?.toFixed(1)}</td>
                            <td className="text-center text-green-600">{d.on_time_pct?.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </PageWrapper>
  )
}
