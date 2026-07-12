import { DataTable } from '../ui/DataTable'
import { StatusBadge } from '../ui/Badge'
import { format } from 'date-fns'
import type { TripStatus } from '../../types'

interface RecentTrip {
  id: string
  trip_number: string
  vehicle: { name: string; reg_number: string }
  driver: { name: string }
  source: string
  destination: string
  status: TripStatus
  created_at: string
}

export function RecentTripsTable({ trips = [] }: { trips: RecentTrip[] }) {
  const columns = [
    { key: 'trip_number', header: 'Trip No.', accessor: 'trip_number' },
    { key: 'route', header: 'Route', render: (row: RecentTrip) => (
      <div>
        <p className="font-medium text-sm">{row.source} → {row.destination}</p>
        <p className="text-xs text-[var(--text-muted)]">{row.vehicle?.name} ({row.vehicle?.reg_number})</p>
      </div>
    )},
    { key: 'driver', header: 'Driver', render: (row: RecentTrip) => row.driver?.name },
    { 
      key: 'status', 
      header: 'Status', 
      render: (row: RecentTrip) => <StatusBadge status={row.status} type="trip" /> 
    },
    { key: 'date', header: 'Date', render: (row: RecentTrip) => format(new Date(row.created_at), 'MMM d, HH:mm') },
  ]
  
  return (
    <DataTable
      columns={columns}
      data={trips}
      onRowClick={(row) => window.location.href = `/trips/${row.id}`}
      emptyMessage="No recent trips"
    />
  )
}