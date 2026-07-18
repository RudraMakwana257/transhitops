import type { ReactNode } from 'react'
import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '../ui/Button'

interface PageWrapperProps {
  title: string
  description?: string
  headerActions?: ReactNode
  filters?: ReactNode
  children: ReactNode
}

export function PageWrapper({ title, description, headerActions, filters, children }: PageWrapperProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] truncate">{title}</h1>
          {description && <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 line-clamp-1">{description}</p>}
        </div>
        {headerActions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {filters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="sm:hidden gap-1.5"
              >
                <Filter className="w-4 h-4" />
                {showMobileFilters ? <X className="w-3 h-3" /> : null}
              </Button>
            )}
            {headerActions}
          </div>
        )}
      </div>

      {/* Mobile Filters */}
      {filters && showMobileFilters && (
        <div className="sm:hidden p-3 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-default)] animate-slide-down">
          {filters}
        </div>
      )}

      {/* Desktop Filters */}
      {filters && (
        <div className="hidden sm:block card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-sidebar)]">
            {filters}
          </div>
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      )}

      {!filters && (
        <div className="card overflow-hidden">
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      )}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] truncate">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 line-clamp-1">{subtitle}</p>}
      </div>
      {action && <div className="w-full sm:w-auto flex-shrink-0">{action}</div>}
    </div>
  )
}
