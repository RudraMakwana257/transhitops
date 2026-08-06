import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: { value: string; label?: string; positive?: boolean }
  color?: string
  loading?: boolean
}

export function KPICard({ title, value, icon, trend, color, loading }: KPICardProps) {
  if (loading) {
    return (
      <div className="kpi-card animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-muted/80 rounded w-24" />
          <div className="h-10 w-10 rounded-xl bg-muted/80" />
        </div>
        <div className="h-8 bg-muted/80 rounded w-3/4 mb-2" />
        <div className="h-4 bg-muted/80 rounded w-1/2" />
      </div>
    )
  }
  
  return (
    <div className="kpi-card group hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors" style={{ backgroundColor: color ? `${color}15` : 'hsl(var(--primary)/0.15)', color: color || 'hsl(var(--primary))' }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{value}</div>
      {trend && (
        <div className="flex items-center gap-1 text-xs">
          {trend.positive ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          ) : trend.positive === false ? (
            <ArrowDownRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className={clsx('font-medium', trend.positive ? 'text-green-600 dark:text-green-400' : trend.positive === false ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
            {trend.value}
          </span>
          {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
        </div>
      )}
    </div>
  )
}