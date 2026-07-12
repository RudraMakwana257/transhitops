import { ReactNode } from 'react'
import { clsx } from 'clsx'
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown } from 'lucide-react'

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
          <div className="h-4 bg-[var(--bg-hover)] rounded w-24" />
          <div className="h-10 w-10 rounded-lg bg-[var(--bg-hover)]" />
        </div>
        <div className="h-8 bg-[var(--bg-hover)] rounded w-3/4 mb-2" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-1/2" />
      </div>
    )
  }
  
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-[var(--text-secondary)]">{title}</div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color ? `${color}15` : 'var(--brand-primary-light)' }}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-[var(--text-primary)] mb-1">{value}</div>
      {trend && (
        <div className="flex items-center gap-1 text-xs">
          {trend.positive ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          ) : trend.positive === false ? (
            <ArrowDownRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          )}
          <span className={clsx('font-medium', trend.positive ? 'text-green-600 dark:text-green-400' : trend.positive === false ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]')}>
            {trend.value}
          </span>
          {trend.label && <span className="text-[var(--text-muted)]">{trend.label}</span>}
        </div>
      )}
    </div>
  )
}