import { Cell, ResponsiveContainer, PieChart, Pie, Tooltip, Legend } from 'recharts'
import { CHART_COLORS } from '../../utils/formatters'

interface FleetStatusChartProps {
  data: Array<{ status: string; count: number; color: string }>
}

export function FleetStatusChart({ data }: FleetStatusChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Fleet Status</h3>
      <div className="h-64 flex flex-col items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
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
              label={({ status, count, percent }) => `${status}: ${count} (${(percent * 100).toFixed(1)}%)`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{ 
                backgroundColor: 'var(--bg-card)', 
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend 
              layout="vertical" 
              align="right" 
              verticalAlign="middle"
              iconType="circle"
              iconSize={10}
              wrapperStyle={{ paddingRight: 20 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
        {data.map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[var(--text-secondary)]">{item.status}: <span className="font-medium text-[var(--text-primary)]">{item.count}</span></span>
          </div>
        ))}
        <div className="flex items-center gap-2 font-medium">
          <span className="w-3 h-3 rounded-full bg-[var(--text-muted)]" />
          <span className="text-[var(--text-primary)]">Total: {total}</span>
        </div>
      </div>
    </div>
  )
}