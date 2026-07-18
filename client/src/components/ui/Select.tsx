import type { SelectHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { clsx } from 'clsx'

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
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={clsx('form-input', error && 'form-input-error', className)}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
