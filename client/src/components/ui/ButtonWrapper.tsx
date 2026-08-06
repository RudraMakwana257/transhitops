import { forwardRef } from 'react';
import { Button as ShadcnButton } from './button';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, loadingText = 'Processing...', className, disabled, children, ...props }, ref) => {
    
    // Map variants
    let shadcnVariant: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' = 'default';
    if (variant === 'danger') shadcnVariant = 'destructive';
    else if (variant === 'primary') shadcnVariant = 'default';
    else shadcnVariant = variant;

    // Map sizes
    let shadcnSize: 'default' | 'sm' | 'lg' = 'default';
    if (size === 'md') shadcnSize = 'default';
    else shadcnSize = size;

    return (
      <ShadcnButton
        ref={ref}
        variant={shadcnVariant}
        size={shadcnSize}
        className={className}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? loadingText : children}
      </ShadcnButton>
    )
  }
)

Button.displayName = 'Button'