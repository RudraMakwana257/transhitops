import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

const COLORS = ['#D98E04', '#22C55E', '#3B82F6', '#DC2626', '#F59E0B', '#6B7280']

interface FleetStatusItem {
  status: string
  count: number
  color: string
}

export function FleetStatusChart({ data }: { data: FleetStatusItem[] }) {
  if (!data?.length) return <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">No data</div>
  
  return (
    <div className="h-64">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey="count"
          nameKey="status"
          label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Vehicles']} />
        <Legend />
      </PieChart>
    </div>
  )
}

export function FuelTrendChart({ data }: { data: { date: string; total_cost: number }[] }) {
  if (!data?.length) return <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">No data</div>
  
  return (
    <div className="h-64">
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D98E04" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#D98E04" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
        <XAxis 
          dataKey="date" 
          tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border-default)' }}
          tickLine={false}
        />
        <YAxis 
          tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Total Cost']}
        />
        <Area 
          type="monotone" 
          dataKey="total_cost" 
          stroke="#D98E04" 
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#fuelGradient)"
        />
      </AreaChart>
    </div>
  )
}

export function BarChartWidget({ 
  data, 
  xKey, 
  yKey, 
  color = '#D98E04', 
  title 
}: { 
  data: Record<string, any>[]
  xKey: string
  yKey: string
  color?: string
  title?: string
}) {
  if (!data?.length) return <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">No data</div>
  
  return (
    <Card>
      {title && <CardHeader><CardTitle>{title}</CardTitle></CardHeader>}
      <CardContent>
        <div className="h-64">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
            <XAxis 
              dataKey={xKey} 
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-default)' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }} />
            <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarWidth={40} />
          </BarChart>
        </div>
      </CardContent>
    </Card>
  )
}