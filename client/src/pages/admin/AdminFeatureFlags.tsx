import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { ToggleLeft, ToggleRight, Sliders, CheckCircle2 } from 'lucide-react'

export function AdminFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const fetchFlags = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getFeatureFlags()
      setFlags(res.data || {})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlags()
  }, [])

  const handleToggle = async (key: string, currentEnabled: boolean) => {
    setSavingKey(key)
    try {
      await adminApi.updateFeatureFlag(key, { enabled: !currentEnabled })
      setFlags(prev => ({
        ...prev,
        [key]: { ...prev[key], enabled: !currentEnabled }
      }))
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update feature flag')
    } finally {
      setSavingKey(null)
    }
  }

  const handleRolloutChange = async (key: string, rollout: string) => {
    setSavingKey(key)
    try {
      await adminApi.updateFeatureFlag(key, { rollout })
      setFlags(prev => ({
        ...prev,
        [key]: { ...prev[key], rollout }
      }))
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update rollout')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Feature Flags & Rollout Engine</h1>
          <p className="text-muted-foreground mt-1 text-sm">Gradually roll out beta capabilities, enforce tier gating, or enable platform-wide modules without downtime</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(flags).map(([key, flag]) => (
          <Card key={key} className="p-6 bg-card border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    <span>{flag.name}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{key}</p>
                </div>
                <button
                  onClick={() => handleToggle(key, flag.enabled)}
                  disabled={savingKey === key}
                  className="transition-transform active:scale-95 text-primary"
                >
                  {flag.enabled ? (
                    <ToggleRight className="w-8 h-8 text-primary" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{flag.description}</p>
            </div>

            <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground uppercase text-[10px]">Rollout Target:</span>
                <select
                  value={flag.rollout || 'ALL'}
                  onChange={(e) => handleRolloutChange(key, e.target.value)}
                  className="px-2 py-1 bg-background border border-input rounded-lg text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">Entire Platform (All Orgs)</option>
                  <option value="PLAN_BASED">Plan Tier Restricted</option>
                  <option value="BETA">Beta Cohort Only</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                  flag.enabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'
                }`}>
                  {flag.enabled ? <CheckCircle2 className="w-3 h-3" /> : null}
                  {flag.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </Card>
        ))}

        {loading && !Object.keys(flags).length && (
          <div className="col-span-2 p-12 text-center text-muted-foreground animate-pulse">
            Loading feature flags...
          </div>
        )}
      </div>
    </div>
  )
}
