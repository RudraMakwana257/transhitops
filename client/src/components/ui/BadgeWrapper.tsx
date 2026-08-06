import { clsx } from 'clsx'
import { Badge as ShadcnBadge } from './badge'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'
  size?: 'sm' | 'md'
  className?: string
  dot?: boolean
}

export function Badge({ children, variant = 'default', size = 'md', className, dot }: BadgeProps) {
  // Map our custom variants to shadcn ones, or use custom styling via className
  let shadcnVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
  
  // Actually, shadcn badge is small. We can apply additional classes.
  const extraClasses = {
    success: 'bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:bg-green-500/10 dark:text-green-400',
    warning: 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400',
    danger: 'bg-destructive/15 text-destructive hover:bg-destructive/25 dark:bg-destructive/10 dark:text-destructive',
    info: 'bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:bg-blue-500/10 dark:text-blue-400',
    default: '',
    secondary: '',
  };

  if (variant === 'danger') shadcnVariant = 'destructive';
  else if (variant === 'secondary') shadcnVariant = 'secondary';
  else if (variant !== 'default') shadcnVariant = 'outline'; // base for custom colors

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  return (
    <ShadcnBadge 
      variant={shadcnVariant}
      className={clsx(
        variant !== 'default' && variant !== 'secondary' && variant !== 'danger' && extraClasses[variant as keyof typeof extraClasses],
        sizeClasses[size],
        className
      )}
    >
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          variant === 'success' && 'bg-green-500',
          variant === 'warning' && 'bg-amber-500',
          variant === 'danger' && 'bg-red-500',
          variant === 'info' && 'bg-blue-500',
          variant === 'default' && 'bg-muted-foreground',
          variant === 'secondary' && 'bg-muted-foreground'
        )} />
      )}
      {children}
    </ShadcnBadge>
  )
}

export function StatusBadge({ 
  status, 
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
    Open: { variant: 'danger', dotColor: 'bg-red-500' },
    'In Progress': { variant: 'warning', dotColor: 'bg-amber-500' },
    Closed: { variant: 'success', dotColor: 'bg-green-500' },
  }
  
  const cfg = config[status] || { variant: 'default', dotColor: 'bg-gray-500' }
  
  return (
    <Badge variant={cfg.variant} dot={showDot} className="capitalize">
      {status}
    </Badge>
  )
}