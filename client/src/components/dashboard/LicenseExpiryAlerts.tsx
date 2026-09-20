import { AlertTriangle, AlertCircle, Clock, CheckCircle } from 'lucide-react'

import { Button } from '../ui/ButtonWrapper'

interface LicenseAlert {
  driver_id: string
  name: string
  license_number: string
  expiry_date: string
  days_remaining: number
  status: 'expiring' | 'expired'
}

export function LicenseExpiryAlerts({ 
  expiring = [], 
  expired = [] 
}: { 
  expiring: LicenseAlert[] 
  expired: LicenseAlert[] 
}) {
  const allAlerts = [
    ...expiring.map((a: any) => ({ ...a, days_remaining: a.days_remaining ?? a.days_left ?? 0, severity: 'warning' as const, status: 'expiring' as const })),
    ...expired.map((a: any) => ({ ...a, days_remaining: a.days_remaining ?? (a.days_overdue ? -a.days_overdue : 0), severity: 'danger' as const, status: 'expired' as const }))
  ].sort((a, b) => a.days_remaining - b.days_remaining)
  
  if (!allAlerts.length) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <p className="text-muted-foreground">All licenses are valid</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {allAlerts.slice(0, 5).map((alert: any, idx: number) => (
        <div 
          key={alert.id || alert.driver_id || `${alert.license_number}-${idx}`} 
          className={`flex items-start gap-3 p-3 rounded-xl border ${
            alert.severity === 'danger' 
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
          }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {alert.severity === 'danger' ? (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground">{alert.name}</p>
            <p className="text-xs text-muted-foreground">License: {alert.license_number}</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className={`text-xs font-medium ${
                alert.severity === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {alert.status === 'expired' 
                  ? `Expired ${Math.abs(alert.days_remaining)} days ago`
                  : `Expires in ${alert.days_remaining} days`}
              </span>
            </div>
          </div>
        </div>
      ))}
      
      {allAlerts.length > 5 && (
        <div className="text-center pt-2">
          <Button variant="ghost" size="sm" className="w-full">
            View all {allAlerts.length} alerts
          </Button>
        </div>
      )}
    </div>
  )
}