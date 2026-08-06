import type { ReactNode } from 'react'
import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '../ui/ButtonWrapper'

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
    <div className="space-y-6 sm:space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{description}</p>}
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
        <div className="sm:hidden p-4 rounded-xl bg-muted/50 border animate-in slide-in-from-top-2">
          {filters}
        </div>
      )}

      {/* Desktop Filters */}
      {filters && (
        <div className="hidden sm:block rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden transition-shadow hover:shadow-md">
          <div className="px-6 py-4 border-b bg-muted/30">
            {filters}
          </div>
          <div className="p-6">{children}</div>
        </div>
      )}

      {!filters && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden transition-shadow hover:shadow-md">
          <div className="p-6 sm:p-8">{children}</div>
        </div>
      )}
    </div>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-1">{subtitle}</p>}
      </div>
      {action && <div className="w-full sm:w-auto flex-shrink-0">{action}</div>}
    </div>
  )
}
