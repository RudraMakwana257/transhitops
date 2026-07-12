import { clsx } from 'clsx'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'
  size?: 'sm' | 'md'
  className?: string
  dot?: boolean
}

const variantStyles = {
  default: 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-default)]',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  secondary: 'bg-[var(--bg-sidebar)] text-[var(--text-muted)] border border-[var(--border-default)]',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export function Badge({ children, variant = 'default', size = 'md', className, dot }: BadgeProps) {
  return (
    <span 
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' && 'bg-green-500',
          variant === 'warning' && 'bg-amber-500',
          variant === 'danger' && 'bg-red-500',
          variant === 'info' && 'bg-blue-500',
          variant === 'default' && 'bg-[var(--text-muted)]',
          variant === 'secondary' && 'bg-[var(--text-muted)]'
        )} />
      )}
      {children}
    </span>
  )
}

export function StatusBadge({ 
  status, 
  type = 'vehicle',
  showDot = true 
}: { 
  status: string
  type?: 'vehicle' | 'driver' | 'trip' | 'maintenance'
  showDot?: boolean
}) {
  const config: Record<string, { variant: BadgeProps['variant']; dotColor: string }> = {
    Available: { variant: 'success', dotColor: 'bg-green-500' },
    'On Trip': { variant: 'info', dotColor: 'bg-blue-500' },
    'In Shop': { variant: 'warning', dotColor: 'bg-amber-500' },
    Retired: { variant: 'secondary', dotColor: 'bg-gray-500' },
    'Off Duty': { variant: 'secondary', dotColor: 'bg-gray-500' },
    Suspended: { variant: 'danger', dotColor: 'bg-red-500' },
    Draft: { variant: 'secondary', dotColor: 'bg-gray-500' },
    Dispatched: { variant: 'info', dotColor: 'bg-blue-500' },
    Completed: { variant: 'success', dotColor: 'bg-green-500' },
    Cancelled: { variant: 'danger', dotColor: 'bg-red-500' },
    Open: { variant: 'danger', dotColor: 'bg-red-500' },
    'In Progress': { variant: 'warning', dotColor: 'bg-amber-500' },
    Completed: { variant: 'success', dotColor: 'bg-green-500' },
  }
  
  const cfg = config[status] || { variant: 'default', dotColor: 'bg-gray-500' }
  
  return (
    <Badge variant={cfg.variant} dot={showDot} className="capitalize">
      {status}
    </Badge>
  )
}