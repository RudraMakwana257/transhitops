import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'


interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, loadingText = 'Processing...', className, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary-light)] disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'bg-[var(--brand-primary)] text-[var(--text-inverse)] hover:bg-[var(--brand-primary-hover)]',
      secondary: 'bg-[var(--bg-sidebar)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)]',
      outline: 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)]',
      ghost: 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    }
    
    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    }

    return (
      <button
        ref={ref}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {loading ? loadingText : children}
      </button>
    )
  }
)

Button.displayName = 'Button'