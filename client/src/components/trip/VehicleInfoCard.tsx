import type { Vehicle } from '../../types'



interface VehicleInfoCardProps {
  vehicle: Vehicle | null
}

export function VehicleInfoCard({ vehicle }: VehicleInfoCardProps) {
  if (!vehicle) return <p className="text-[var(--text-muted)]">No vehicle assigned</p>
  return (
    <div className="space-y-2">
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Name</span><span className="font-medium">{vehicle.name}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Reg Number</span><span className="font-medium">{vehicle.reg_number}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Type</span><span className="font-medium">{vehicle.type}</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Capacity</span><span className="font-medium">{vehicle.capacity_kg.toLocaleString()} kg</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Odometer</span><span className="font-medium">{vehicle.odometer_km.toLocaleString()} km</span></div>
      <div className="flex justify-between"><span className="text-[var(--text-secondary)]">Region</span><span className="font-medium">{vehicle.region || '—'}</span></div>
    </div>
  )
}