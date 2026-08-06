import type { Vehicle } from '../../types'



interface VehicleInfoCardProps {
  vehicle: Vehicle | null
}

export function VehicleInfoCard({ vehicle }: VehicleInfoCardProps) {
  if (!vehicle) return <p className="text-muted-foreground">No vehicle assigned</p>
  return (
    <div className="space-y-2">
      <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{vehicle.name}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Reg Number</span><span className="font-medium">{vehicle.reg_number}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{vehicle.type}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Capacity</span><span className="font-medium">{vehicle.capacity_kg.toLocaleString()} kg</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Odometer</span><span className="font-medium">{vehicle.odometer_km.toLocaleString()} km</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Region</span><span className="font-medium">{vehicle.region || '—'}</span></div>
    </div>
  )
}