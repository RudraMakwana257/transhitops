import { Driver } from '../../types'
import { StatusBadge } from '../ui/Badge'
import { Shield, Calendar, IdCard } from 'lucide-react'
import { format } from 'date-fns'

interface DriverInfoCardProps {
  driver: Driver | null
}

export function DriverInfoCard({ driver }: DriverInfoCardProps) {
  if (!driver) return <p className="text-[var(--text-muted)]">No driver assigned</p>
  return (
    <div className="space-y-2">
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Name</span><span className="font-medium">{driver.name}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">License</span><span className="font-medium">{driver.license_number}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Category</span><span className="font-medium">{driver.license_category}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Expiry</span><span className="font-medium">{format(new Date(driver.license_expiry), 'MMM d, yyyy')}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Safety Score</span><span className="font-medium">{driver.safety_score.toFixed(1)}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Phone</span><span className="font-medium">{driver.phone}</span></div>
    </div>
  )
}