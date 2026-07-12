import { ReactNode } from 'react'
import { Filter, X, Search, ChevronDown } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'
import { Select, SelectOption } from './Select'
import { clsx } from 'clsx'

export interface FilterField {
  key: string
  label?: string
  type: 'text' | 'select' | 'date' | 'date-range' | 'multiselect'
  placeholder?: string
  options?: SelectOption[]
  className?: string
  value?: string | string[]
  onChange: (value: string | string[]) => void
}

interface FilterBarProps {
  fields: FilterField[]
  searchField?: {
    placeholder: string
    value: string
    onChange: (value: string) => void
  }
  onClear?: () => void
  onToggleAdvanced?: () => void
  showAdvanced?: boolean
  hasActiveFilters?: boolean
  className?: string
  children?: ReactNode
}

export function FilterBar({ 
  fields, 
  searchField, 
  onClear, 
  onToggleAdvanced, 
  showAdvanced, 
  hasActiveFilters,
  className,
  children 
}: FilterBarProps) {
  return (
    <div className={clsx('flex flex-wrap items-end gap-3', className)}>
      {searchField && (
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <Input
            placeholder={searchField.placeholder}
            value={searchField.value}
            onChange={(e) => searchField.onChange(e.target.value)}
            className="pl-10"
          />
        </div>
      )}
      
      {fields.map(field => (
        <div key={field.key} className={clsx(field.className)}>
          {field.label && <label className="block text-xs text-[var(--text-muted)] mb-1">{field.label}</label>}
          {field.type === 'select' && (
            <Select
              value={field.value as string}
              onChange={(e) => field.onChange(e.target.value)}
              options={field.options || []}
              placeholder={field.placeholder}
              className={field.className}
            />
          )}
          {field.type === 'text' && (
            <Input
              placeholder={field.placeholder}
              value={field.value as string}
              onChange={(e) => field.onChange(e.target.value)}
              className={field.className}
            />
          )}
          {field.type === 'date' && (
            <Input
              type="date"
              value={field.value as string}
              onChange={(e) => field.onChange(e.target.value)}
              className={field.className}
            />
          )}
          {field.type === 'date-range' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={(field.value as string[])[0] || ''}
                onChange={(e) => field.onChange([e.target.value, (field.value as string[])[1] || ''])}
                className="w-36"
                placeholder="From"
              />
              <span className="text-[var(--text-muted)] text-sm">to</span>
              <Input
                type="date"
                value={(field.value as string[])[1] || ''}
                onChange={(e) => field.onChange([(field.value as string[])[0] || '', e.target.value])}
                className="w-36"
                placeholder="To"
              />
            </div>
          )}
        </div>
      ))}
      
      {onToggleAdvanced && (
        <Button 
          variant={showAdvanced ? 'primary' : 'outline'} 
          size="sm"
          onClick={onToggleAdvanced}
          className="gap-1"
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          <ChevronDown className={clsx('w-4 h-4 transition-transform', showAdvanced && 'rotate-180')} />
          {hasActiveFilters && <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />}
        </Button>
      )}
      
      {onClear && hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      )}
      
      {children}
    </div>
  )
}

interface AdvancedFiltersPanelProps {
  isOpen: boolean
  onClose: () => void
  onClear: () => void
  title?: string
  children: ReactNode
}

export function AdvancedFiltersPanel({ isOpen, onClose, onClear, title = 'Advanced Filters', children }: AdvancedFiltersPanelProps) {
  if (!isOpen) return null
  
  return (
    <div className="mb-6 p-4 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-default)] animate-slide-down">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">{title}</h4>
        <Button variant="ghost" size="sm" onClick={() => { onClear(); onClose(); }}>
          Clear All
        </Button>
      </div>
      {children}
    </div>
  )
}

interface FilterChipProps {
  label: string
  value: string
  onRemove: () => void
  variant?: 'default' | 'primary' | 'danger'
}

export function FilterChip({ label, value, onRemove, variant = 'default' }: FilterChipProps) {
  const variants = {
    default: 'bg-[var(--bg-sidebar)] border border-[var(--border-default)]',
    primary: 'bg-[var(--brand-primary-light)] border border-[var(--brand-primary)]',
    danger: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${variants[variant]}`}>
      {label}: {value}
      <button 
        onClick={onRemove}
        className="ml-1 p-0.5 rounded hover:bg-[var(--bg-hover)]"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}