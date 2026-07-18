import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Download, Calendar, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { CHART_COLORS, formatCurrency } from '../utils/formatters'
import { useAuth } from '../hooks/useAuth'
import { toast } from '../store/toastStore'

const DAY_MS = 86400000

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
      <BarChart3 className="w-10 h-10 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

const DATE_PRESETS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: '1 Year', days: 365 },
]

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
  const [dateRange, setDateRange] = useState({ 
    from: format(new Date(Date.now() - 30 * DAY_MS), 'yyyy-MM-dd'), 
    to: format(new Date(), 'yyyy-MM-dd') 
  })
  
  useEffect(() => {
    fetchAll()
  }, [dateRange.from, dateRange.to])
  
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
      toast('Failed to load analytics', 'error')
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (days: number) => {
    setDateRange({
      from: format(new Date(Date.now() - days * DAY_MS), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    })
  }

  const fleetStatusData = [
    { name: 'On Trip', value: utilization?.on_trip_vehicles || 0, color: CHART_COLORS.info },
    { name: 'Available', value: (utilization?.total_active_vehicles || 0) - (utilization?.on_trip_vehicles || 0), color: CHART_COLORS.success },
  ]
  
  return (
    <PageWrapper title="Analytics" description="Fleet performance and cost analytics">
      {/* Date Range + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
          <div className="flex items-center gap-1.5">
            <input type="date" value={dateRange.from} onChange={(e) => setDateRange(d => ({ ...d, from: e.target.value }))} className="form-input w-36 sm:w-40" />
            <span className="text-[var(--text-muted)] text-sm">—</span>
            <input type="date" value={dateRange.to} onChange={(e) => setDateRange(d => ({ ...d, to: e.target.value }))} className="form-input w-36 sm:w-40" />
          </div>
          <div className="flex gap-1">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.days}
                onClick={() => applyPreset(preset.days)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  Math.round((Date.now() - new Date(dateRange.from).getTime()) / DAY_MS) === preset.days
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-fit" disabled>
          <Download className="w-4 h-4 mr-2" />Export CSV
        </Button>
      </div>
      
      {loading ? (
        <div className="space-y-6">
          <div className={`grid grid-cols-2 gap-4 ${canViewFinancial ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
            {Array.from({ length: canViewFinancial ? 4 : 2 }).map((_, i) => (
              <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl animate-pulse p-4">
                <div className="h-4 bg-[var(--bg-hover)] rounded w-24 mb-4" />
                <div className="h-8 bg-[var(--bg-hover)] rounded w-20 mb-2" />
                <div className="h-3 bg-[var(--bg-hover)] rounded w-32" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl animate-pulse p-6">
                <div className="h-5 bg-[var(--bg-hover)] rounded w-48 mb-4" />
                <div className="h-64 bg-[var(--bg-hover)] rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className={`grid grid-cols-2 gap-4 ${canViewFinancial ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Fleet Utilization</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{utilization?.utilization_pct?.toFixed(1) || 0}%</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {utilization?.on_trip_vehicles || 0}/{utilization?.total_active_vehicles || 0} vehicles on trip
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Avg Fuel Efficiency</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                  {fuelEff.length > 0
                    ? (fuelEff.reduce((s, v) => s + (v.avg_kmpl || 0), 0) / fuelEff.length).toFixed(1)
                    : '—'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">km/L</p>
              </CardContent>
            </Card>
            {canViewFinancial && (
              <>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Total Op. Cost</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                      {opCost.length > 0 ? formatCurrency(opCost.reduce((s, v) => s + (v.total_cost || 0), 0)) : '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Avg Fleet ROI</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                      {roi.length > 0 ? `${(roi.reduce((s, v) => s + (v.roi || 0), 0) / roi.length * 100).toFixed(1)}%` : '—'}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          
          {/* Chart Row 1 — always side-by-side: fuel efficiency + fleet status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Fuel Efficiency by Vehicle</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px] sm:h-[300px]">
                  {fuelEff.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fuelEff} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                        <XAxis dataKey="vehicle_name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '8px' }} />
                        <Bar dataKey="avg_kmpl" fill={CHART_COLORS.primary} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart message="No fuel efficiency data" />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Fleet Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px] sm:h-[300px]">
                  {fleetStatusData.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={fleetStatusData}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}
                          dataKey="value" nameKey="name" labelLine={false}
                        >
                          {fleetStatusData.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={fleetStatusData[i].color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '8px' }} />
                        <Legend layout="horizontal" align="center" verticalAlign="bottom" iconType="circle" iconSize={10} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart message="No fleet status data" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Chart Row 2 — financial charts (side-by-side only when visible) */}
          {canViewFinancial && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Operational Cost Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px] sm:h-[300px]">
                    {opCost.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={opCost} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" horizontal={false} />
                          <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} />
                          <YAxis dataKey="vehicle_name" type="category" width={80} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '8px' }} />
                          <Legend />
                          <Bar dataKey="fuel_cost" fill={CHART_COLORS.primary} name="Fuel" stackId="a" />
                          <Bar dataKey="maintenance_cost" fill={CHART_COLORS.warning} name="Maintenance" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No cost data available" />
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Operational Cost by Vehicle</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px] sm:h-[300px]">
                    {opCost.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={opCost} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                          <XAxis dataKey="vehicle_name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border-default)' }} tickLine={false} />
                          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '8px' }} />
                          <Area type="monotone" dataKey="total_cost" stroke={CHART_COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#costGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No cost data available" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Tables */}
          <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${canViewFinancial && canViewDriverPerf ? 'lg:grid-cols-2' : ''}`}>
            {canViewFinancial && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Vehicle ROI</CardTitle></CardHeader>
                <CardContent className="p-0 sm:p-6">
                  {roi.length > 0 ? (
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                      <table className="w-full data-table text-sm">
                        <thead className="sticky top-0 bg-[var(--bg-card)] z-10">
                          <tr>
                            <th className="px-4 py-2.5 text-left">Vehicle</th>
                            <th className="px-4 py-2.5 text-right">Acquisition</th>
                            <th className="px-4 py-2.5 text-right">Revenue</th>
                            <th className="px-4 py-2.5 text-right">Costs</th>
                            <th className="px-4 py-2.5 text-right">ROI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roi.slice(0, 10).map((r: any) => (
                            <tr key={r.vehicle_id} className="border-t border-[var(--border-default)]/50 hover:bg-[var(--bg-hover)]/50 transition-colors">
                              <td className="px-4 py-2.5 font-medium">{r.vehicle_name}</td>
                              <td className="px-4 py-2.5 text-right">{formatCurrency(r.acquisition_cost || 0)}</td>
                              <td className="px-4 py-2.5 text-right" style={{ color: 'var(--status-available)' }}>{formatCurrency(r.revenue || 0)}</td>
                              <td className="px-4 py-2.5 text-right" style={{ color: 'var(--status-critical)' }}>{formatCurrency((r.fuel_cost || 0) + (r.maintenance_cost || 0))}</td>
                              <td className="px-4 py-2.5 text-right font-semibold" style={{ color: (r.roi || 0) >= 0 ? 'var(--status-available)' : 'var(--status-critical)' }}>
                                {(r.roi * 100).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {roi.length > 10 && (
                        <div className="px-4 py-2 text-xs text-[var(--text-muted)] border-t border-[var(--border-default)]/50">
                          Showing 10 of {roi.length} vehicles
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyChart message="No ROI data available" />
                  )}
                </CardContent>
              </Card>
            )}
            
            {canViewDriverPerf && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Driver Performance</CardTitle></CardHeader>
                <CardContent className="p-0 sm:p-6">
                  {driverPerf.length > 0 ? (
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                      <table className="w-full data-table text-sm">
                        <thead className="sticky top-0 bg-[var(--bg-card)] z-10">
                          <tr>
                            <th className="px-4 py-2.5 text-left">Driver</th>
                            <th className="px-4 py-2.5 text-center">Trips</th>
                            <th className="px-4 py-2.5 text-right">Distance</th>
                            <th className="px-4 py-2.5 text-right">Efficiency</th>
                            <th className="px-4 py-2.5 text-center">Safety</th>
                            <th className="px-4 py-2.5 text-center">On-Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driverPerf.slice(0, 10).map((d: any) => (
                            <tr key={d.driver_id} className="border-t border-[var(--border-default)]/50 hover:bg-[var(--bg-hover)]/50 transition-colors">
                              <td className="px-4 py-2.5 font-medium">{d.driver_name}</td>
                              <td className="px-4 py-2.5 text-center">{d.trips_completed}</td>
                              <td className="px-4 py-2.5 text-right">{d.total_distance_km?.toLocaleString()} km</td>
                              <td className="px-4 py-2.5 text-right">{d.avg_fuel_efficiency?.toFixed(1)} km/L</td>
                              <td className="px-4 py-2.5 text-center">{d.safety_score?.toFixed(1)}</td>
                              <td className="px-4 py-2.5 text-center font-medium" style={{ color: 'var(--status-available)' }}>{d.on_time_pct?.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {driverPerf.length > 10 && (
                        <div className="px-4 py-2 text-xs text-[var(--text-muted)] border-t border-[var(--border-default)]/50">
                          Showing 10 of {driverPerf.length} drivers
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyChart message="No driver performance data" />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
