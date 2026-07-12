import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Truck, MapPin, Users, Wrench, Droplets, Receipt, BarChart2, Settings, TrendingUp, Activity } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  iconBg?: string
  iconColor?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

export function KpiCard({ title, value, icon: Icon, iconBg = 'bg-[var(--brand-primary-light)]', iconColor = 'text-[var(--brand-primary)]', trend, trendValue }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)] mb-2">{title}</p>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{value}</p>
          {trend && trendValue && (
            <p className={`text-xs mt-1 ${trend === 'up' ? 'text-green-600 dark:text-green-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'}`}>
              {trend === 'up' && '↑ '}{trend === 'down' && '↓ '}{trendValue}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}