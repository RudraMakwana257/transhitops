import { Cell, ResponsiveContainer, PieChart, Pie, Tooltip, Legend } from 'recharts'


interface FleetStatusChartProps {
  data: Array<{ status: string; count: number; color: string }>
}

export function FleetStatusChart({ data }: FleetStatusChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col h-full">
      <h3 className="text-xl font-bold text-foreground mb-6">Fleet Status</h3>
      <div className="flex-1 min-h-[300px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={75}
              outerRadius={100}
              paddingAngle={5}
              dataKey="count"
              nameKey="status"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} className="drop-shadow-sm hover:drop-shadow-md transition-all duration-300 outline-none" />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any, name: any) => [<span className="font-semibold">{value}</span>, <span className="capitalize">{name}</span>]}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                padding: '12px 16px',
                color: 'hsl(var(--foreground))'
              }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend 
              layout="horizontal" 
              verticalAlign="bottom" 
              align="center"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: 20 }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-[40px]">
          <span className="text-3xl font-black text-foreground">{total}</span>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total</span>
        </div>
      </div>
    </div>
  )
}