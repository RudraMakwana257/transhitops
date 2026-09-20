import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'
import { Input as ShadcnInput } from './input'
import { Label as ShadcnLabel } from './label'

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
      <div className="w-full space-y-1.5">
        {label && (
          <ShadcnLabel htmlFor={inputId}>
            {label}
            {props.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
          </ShadcnLabel>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {leftIcon}
            </div>
          )}
          <ShadcnInput
            ref={ref}
            id={inputId}
            type={props.type || 'text'}
            className={clsx(
              leftIcon && 'pl-10',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-sm text-muted-foreground">
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
      <div className="w-full space-y-1.5">
        {label && (
          <ShadcnLabel htmlFor={inputId}>
            {label}
            {props.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
          </ShadcnLabel>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={clsx('flex min-h-[120px] w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground transition-all hover:bg-background hover:border-primary/50 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 resize-y', error && 'border-destructive focus-visible:ring-destructive', className)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...(props as any)}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'