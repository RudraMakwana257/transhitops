import { Wrench } from 'lucide-react'

interface MaintenanceItem {
  vehicle_name: string
  type: string
  scheduled_date: string
  status?: string
}

export function UpcomingMaintenance({ maintenance }: { maintenance: MaintenanceItem[] }) {
  if (!maintenance || maintenance.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming maintenance</p>
  }
  return (
    <div className="space-y-3">
      {maintenance.map((item, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.vehicle_name}</p>
            <p className="text-xs text-muted-foreground">{item.type} — {new Date(item.scheduled_date).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
