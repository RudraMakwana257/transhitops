import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/CardWrapper'
import { Badge } from '../ui/BadgeWrapper'
import { Button } from '../ui/ButtonWrapper'
import { Zap, AlertTriangle, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react'
import { toast } from '../../store/toastStore'

interface QuotaResource {
  used: number
  limit: number | null
  remaining: number | null
  over_limit: boolean
  unlimited: boolean
}

interface SubscriptionUsageData {
  subscription: {
    status: string
    current_period_end?: string
    trial_ends_at?: string
  } | null
  plan: {
    name: string
    slug: string
    price_monthly: number
  } | null
  resources: {
    users: QuotaResource
    vehicles: QuotaResource
    drivers: QuotaResource
    active_trips: QuotaResource
  }
  over_limit: boolean
}

export function SubscriptionUsageCard() {
  const [data, setData] = useState<SubscriptionUsageData | null>(null)
  const [entitlements, setEntitlements] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  const fetchUsage = async () => {
    setLoading(true)
    try {
      const [usageRes, entRes] = await Promise.all([
        api.subscription.getUsage(),
        api.subscription.getEntitlements()
      ])
      if (usageRes?.data) setData(usageRes.data)
      if (entRes?.data?.features) setEntitlements(entRes.data.features)
    } catch (err: any) {
      toast('Failed to load subscription usage', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsage()
  }, [])

  if (loading) {
    return (
      <Card className="mb-6 border-border/40 bg-card/60 animate-pulse">
        <CardContent className="p-6">
          <div className="h-20 bg-muted/40 rounded-lg mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-24 bg-muted/40 rounded-lg" />
            <div className="h-24 bg-muted/40 rounded-lg" />
            <div className="h-24 bg-muted/40 rounded-lg" />
            <div className="h-24 bg-muted/40 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const planName = data.plan?.name || 'Standard'
  const planSlug = data.plan?.slug || 'starter'
  const status = data.subscription?.status || 'active'

  const renderResourceQuota = (label: string, quota: QuotaResource) => {
    if (!quota) return null
    const { used, limit, over_limit, unlimited } = quota
    const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0

    let barColor = 'bg-emerald-500'
    let textColor = 'text-foreground'
    if (over_limit || (limit && used >= limit)) {
      barColor = 'bg-red-500'
      textColor = 'text-red-500 font-bold'
    } else if (pct >= 85) {
      barColor = 'bg-amber-500'
      textColor = 'text-amber-500 font-semibold'
    }

    return (
      <div className="p-4 rounded-lg bg-background/50 border border-border/50 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">{label}</span>
          <span className={textColor}>
            {unlimited ? `${used} / ∞` : `${used} / ${limit}`}
          </span>
        </div>
        {!unlimited && (
          <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
            <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${pct}%` }} />
          </div>
        )}
        <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
          <span>{unlimited ? 'Unlimited Tier' : `${quota.remaining ?? 0} remaining`}</span>
          {over_limit && (
            <span className="text-red-400 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Over Limit
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="mb-6 border-border/50 bg-card/60 backdrop-blur-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              Subscription & Quotas
              <Badge variant={status === 'active' ? 'success' : 'warning'} className="uppercase text-[10px]">
                {status}
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plan: <span className="font-semibold text-foreground capitalize">{planName}</span> ({planSlug})
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsage} className="text-xs flex items-center gap-1">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.over_limit && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-500">Subscription Resource Quota Exceeded</p>
              <p className="mt-0.5 text-muted-foreground">
                Your tenant is currently using more resources than permitted by your plan. Existing assets remain intact, but creation of new resources is blocked until usage is reduced or plan is upgraded.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {renderResourceQuota('Vehicles', data.resources.vehicles)}
          {renderResourceQuota('Drivers', data.resources.drivers)}
          {renderResourceQuota('Users', data.resources.users)}
          {renderResourceQuota('Active Trips', data.resources.active_trips)}
        </div>

        <div className="pt-2 border-t border-border/40">
          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Included Feature Entitlements
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(entitlements).map(([key, enabled]) => (
              <div
                key={key}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 ${
                  enabled
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-muted/20 border-border/40 text-muted-foreground opacity-60'
                }`}
              >
                <CheckCircle2 className={`w-3 h-3 ${enabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                <span className="capitalize">{key.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
