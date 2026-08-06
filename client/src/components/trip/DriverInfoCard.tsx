import type { Driver } from '../../types'


import { format } from 'date-fns'

interface DriverInfoCardProps {
  driver: Driver | null
}

export function DriverInfoCard({ driver }: DriverInfoCardProps) {
  if (!driver) return <p className="text-muted-foreground">No driver assigned</p>
  return (
    <div className="space-y-2">
      <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{driver.name}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">License</span><span className="font-medium">{driver.license_number}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{driver.license_category}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Expiry</span><span className="font-medium">{format(new Date(driver.license_expiry), 'MMM d, yyyy')}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Safety Score</span><span className="font-medium">{Number(driver.safety_score || 0).toFixed(1)}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{driver.phone}</span></div>
    </div>
  )
}