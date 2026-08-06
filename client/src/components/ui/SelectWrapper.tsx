import type { SelectHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { clsx } from 'clsx'
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
        <select
          ref={ref}
          id={inputId}
          className={clsx(
            'flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none', 
            error && 'border-destructive focus-visible:ring-destructive', 
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && (
          <p id={`${inputId}-error`} className="text-sm font-medium text-destructive" role="alert">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
