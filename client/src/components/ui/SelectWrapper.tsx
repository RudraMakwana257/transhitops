import type { SelectHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'
import { Label as ShadcnLabel } from './label'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder = 'Select...', className, id, ...props }, ref) => {
    const inputId = id || props.name
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <ShadcnLabel htmlFor={inputId}>
            {label}
            {props.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
          </ShadcnLabel>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={clsx(
              'flex h-10 w-full rounded-xl border border-input bg-background px-3 pr-9 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none text-foreground',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            {...props}
          >
            <option value="" className="bg-background text-foreground">{placeholder}</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-background text-foreground">{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs font-medium text-destructive" role="alert">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
