import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, className, id, ...props }, ref) => {
    const inputId = id || props.name
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'form-input',
              leftIcon && 'pl-10',
              error && 'form-input-error',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-[var(--text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, InputProps>(
  ({ label, error, helperText, leftIcon: _leftIcon, className, id, ...props }, ref) => {
    const inputId = id || props.name
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={clsx('form-input min-h-[100px] resize-y', error && 'form-input-error', className)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...(props as any)}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-[var(--text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'