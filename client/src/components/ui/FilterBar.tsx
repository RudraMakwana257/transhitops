import type { ReactNode } from 'react'
import { X, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from './ButtonWrapper'
import { Input } from './InputWrapper'
import { Select } from './SelectWrapper'
import type { SelectOption } from './SelectWrapper'
import { clsx } from 'clsx'

export interface FilterField {
  key: string
  label?: string
  type: 'text' | 'select' | 'date' | 'date-range' | 'multiselect'
  placeholder?: string
  options?: SelectOption[]
  className?: string
  value?: string | string[]
  onChange?: (value: string | string[]) => void
}

interface FilterBarProps {
  fields: FilterField[]
  values?: Record<string, any>
  onChange?: (values: Record<string, any>) => void
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
  showOnMobile?: boolean
}

export function FilterBar({
  fields,
  values,
  onChange,
  searchField,
  onClear,
  onToggleAdvanced,
  showAdvanced,
  hasActiveFilters,
  className,
  children,
  showOnMobile = false,
}: FilterBarProps) {
  const getFieldValue = (key: string) => {
    if (values) return values[key] ?? ''
    return fields.find(f => f.key === key)?.value ?? ''
  }

  const handleFieldChange = (key: string, val: string) => {
    if (onChange && values) {
      onChange({ ...values, [key]: val })
    }
  }

  const activeCount = values
    ? Object.entries(values).filter(([, v]) => v !== '' && v !== undefined && v !== null).length
    : 0

  return (
    <div className={clsx(
      'flex flex-wrap items-end gap-2 sm:gap-3',
      !showOnMobile && 'max-sm:hidden',
      className
    )}>
      {searchField && (
        <div className="relative flex-1 min-w-[160px] sm:min-w-[200px] max-w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchField.placeholder}
            value={searchField.value}
            onChange={(e) => searchField.onChange(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 sm:gap-3 flex-1 sm:flex-none">
        {fields.map(field => {
          const val = getFieldValue(field.key)
          const handleChange = (v: string) => handleFieldChange(field.key, v)

          return (
            <div key={field.key} className={clsx(field.className || 'min-w-0')}>
              {field.label && <label className="block text-xs text-muted-foreground mb-1 font-medium">{field.label}</label>}
              {field.type === 'select' && (
                <Select
                  value={val}
                  onChange={(e) => handleChange(e.target.value)}
                  options={field.options || []}
                  placeholder={field.placeholder}
                  className={clsx('w-full sm:w-auto', field.className)}
                />
              )}
              {field.type === 'text' && (
                <Input
                  placeholder={field.placeholder}
                  value={val}
                  onChange={(e) => handleChange(e.target.value)}
                  className={clsx('w-full sm:w-auto', field.className)}
                />
              )}
              {field.type === 'date' && (
                <Input
                  type="date"
                  value={val}
                  onChange={(e) => handleChange(e.target.value)}
                  className={clsx('w-full sm:w-auto', field.className)}
                />
              )}
              {field.type === 'date-range' && (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={val}
                    onChange={(e) => handleChange(e.target.value)}
                    className="w-32 sm:w-36"
                    placeholder="From"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        {onToggleAdvanced && (
          <Button
            variant={showAdvanced ? 'primary' : 'outline'}
            size="sm"
            onClick={onToggleAdvanced}
            className="gap-1"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold leading-none">
                {activeCount}
              </span>
            )}
          </Button>
        )}

        {onClear && hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-muted-foreground">
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        )}

        {children}
      </div>
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
    <div className="mb-6 p-4 sm:p-5 rounded-xl bg-card border border-border/50 shadow-sm animate-slide-down">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
        <Button variant="ghost" size="sm" onClick={() => { onClear(); onClose(); }} className="text-muted-foreground">
          <X className="w-4 h-4 mr-1" />
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
    default: 'bg-muted/50 border border-border text-muted-foreground',
    primary: 'bg-primary/10 border border-primary/50 text-primary',
    danger: 'bg-destructive/10 border border-destructive/50 text-destructive'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold ${variants[variant]}`}>
      <span className="opacity-70">{label}:</span>
      <span className="font-semibold">{value}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded hover:hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}
