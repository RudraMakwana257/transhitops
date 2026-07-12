import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface PageWrapperProps {
  title: string
  description?: string
  headerActions?: ReactNode
  filters?: ReactNode
  children: ReactNode
}

export function PageWrapper({ title, description, headerActions, filters, children }: PageWrapperProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
          {description && <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">{headerActions}</div>
      </div>
      {filters && <div className="card">{filters}</div>}
      <div className="card">{children}</div>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>}
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </div>
  )
}