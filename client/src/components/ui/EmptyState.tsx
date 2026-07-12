import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 px-4 text-center bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg', className)}>
      {icon && (
        <div className="w-14 h-14 text-[var(--text-muted)] mb-4" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-[var(--text-primary)]">{title}</h3>
      {description && <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function EmptyTableState({ message = 'No data found', action, icon }: { message?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="w-12 h-12 text-[var(--text-muted)] mb-4" aria-hidden="true">{icon}</div>}
      <h3 className="text-lg font-medium text-[var(--text-primary)]">{message}</h3>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

interface LoadingStateProps {
  message?: string
  className?: string
  fullPage?: boolean
}

export function LoadingState({ message = 'Loading...', className, fullPage = false }: LoadingStateProps) {
  if (fullPage) {
    return (
      <div className={clsx('min-h-screen bg-[var(--bg-page)] flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-8 h-8 border-3 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)]">{message}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className={clsx('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-8 h-8 border-3 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-[var(--text-secondary)]">{message}</p>
    </div>
  )
}

export function LoadingTable({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="grid">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="data-table th">
                <div className="h-4 bg-[var(--bg-hover)] animate-pulse rounded w-3/4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="data-table td">
                  <div className="h-5 bg-[var(--bg-hover)] animate-pulse rounded w-3/4" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LoadingCard({ className = '' }: { className?: string }) {
  return (
    <div className={clsx('bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-6 animate-pulse', className)}>
      <div className="h-4 bg-[var(--bg-hover)] rounded w-1/4 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-[var(--bg-hover)] rounded w-1/2" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-3/4" />
        <div className="h-4 bg-[var(--bg-hover)] rounded w-full" />
      </div>
    </div>
  )
}

export function LoadingKPICard() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 min-h-[120px] animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-[var(--bg-hover)] rounded w-1/3" />
        <div className="w-10 h-10 bg-[var(--bg-hover)] rounded-xl" />
      </div>
      <div className="mt-4">
        <div className="h-8 bg-[var(--bg-hover)] rounded w-1/4" />
        <div className="h-3 bg-[var(--bg-hover)] rounded w-1/2 mt-2" />
      </div>
    </div>
  )
}