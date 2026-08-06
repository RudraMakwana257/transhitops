import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import {
  Card as ShadcnCard,
  CardHeader as ShadcnCardHeader,
  CardFooter as ShadcnCardFooter,
  CardTitle as ShadcnCardTitle,
  CardDescription as ShadcnCardDescription,
  CardContent as ShadcnCardContent,
} from './card'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
  
  return (
    <ShadcnCard className={clsx(paddings[padding], className)}>
      {children}
    </ShadcnCard>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <ShadcnCardHeader className={clsx('p-0 mb-4', className)}>{children}</ShadcnCardHeader>
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <ShadcnCardTitle className={className}>{children}</ShadcnCardTitle>
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <ShadcnCardDescription className={className}>{children}</ShadcnCardDescription>
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <ShadcnCardContent className={clsx('p-0', className)}>{children}</ShadcnCardContent>
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <ShadcnCardFooter className={clsx('p-0 mt-4 flex items-center gap-2', className)}>{children}</ShadcnCardFooter>
}