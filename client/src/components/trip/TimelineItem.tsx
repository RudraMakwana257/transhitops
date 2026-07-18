import type { ReactNode } from 'react'

interface TimelineItemProps {
  icon: ReactNode
  title: string
  time: string
  description?: string
  active: boolean
  variant?: 'danger'
}

export function TimelineItem({ icon, title, time, description, active, variant }: TimelineItemProps) {
  return (
    <div className="flex gap-3 relative">
      <div className="relative flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          active 
            ? (variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-[var(--brand-primary)] text-white') 
            : 'bg-[var(--bg-sidebar)] text-[var(--text-muted)]'
        }`}>
          {icon}
        </div>
        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-[var(--border-default)]" />
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-baseline gap-2">
          <h4 className={`font-medium ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{title}</h4>
          <span className="text-xs text-[var(--text-muted)]">{time}</span>
        </div>
        {description && <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>}
      </div>
    </div>
  )
}