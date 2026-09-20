import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { AlertTriangle, Save, CheckCircle2 } from 'lucide-react'

export function AdminSettings() {
  const [settings, setSettings] = useState<any>({
    platform_name: 'TransitOps Global Fleet Operations',
    default_timezone: 'Asia/Kolkata',
    default_currency: 'INR',
    maintenance_mode: false,
    maintenance_message: 'Platform undergoing scheduled upgrade. Service will resume shortly.',
    session_timeout_mins: 120,
    min_password_length: 8,
    mfa_enforced: false,
    support_contact_email: 'support@transitops.com'
  })
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)


  const fetchSettings = async () => {
    try {
      const res = await adminApi.getPlatformSettings()
      if (res.data) {
        setSettings(res.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminApi.updatePlatformSettings(settings)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Platform Governance & Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Global branding, maintenance mode gating, session security rules, and defaults</p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>Platform configuration saved and synchronized successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Maintenance Mode Alert Banner */}
        <Card className={`p-5 border ${settings.maintenance_mode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-card border-border/80'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">Global Maintenance Mode</h3>
                <p className="text-xs text-muted-foreground">
                  When enabled, all non-admin tenant traffic is redirected to the maintenance standby page.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="maintenance_mode"
                checked={settings.maintenance_mode}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                className="w-5 h-5 text-amber-500 rounded border-input focus:ring-amber-500 accent-amber-500"
              />
              <label htmlFor="maintenance_mode" className="text-xs font-bold text-foreground cursor-pointer">
                {settings.maintenance_mode ? 'Enabled (Restricted)' : 'Disabled (Live)'}
              </label>
            </div>
          </div>
        </Card>

        {/* Branding & Platform Identity */}
        <Card className="p-6 bg-card border-border/80 space-y-4">
          <h2 className="text-base font-bold text-foreground">Branding & Regional Defaults</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Platform Application Name"
              value={settings.platform_name}
              onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
              required
            />
            <Input
              label="Support Contact Email"
              type="email"
              value={settings.support_contact_email}
              onChange={(e) => setSettings({ ...settings, support_contact_email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Default Timezone</label>
              <select
                value={settings.default_timezone}
                onChange={(e) => setSettings({ ...settings, default_timezone: e.target.value })}
                className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC / GMT</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Default Billing Currency</label>
              <select
                value={settings.default_currency}
                onChange={(e) => setSettings({ ...settings, default_currency: e.target.value })}
                className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Security Policies */}
        <Card className="p-6 bg-card border-border/80 space-y-4">
          <h2 className="text-base font-bold text-foreground">Session & Security Policies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Session Timeout Duration (Minutes)"
              type="number"
              value={settings.session_timeout_mins}
              onChange={(e) => setSettings({ ...settings, session_timeout_mins: parseInt(e.target.value) || 60 })}
            />
            <Input
              label="Minimum Password Complexity Length"
              type="number"
              value={settings.min_password_length}
              onChange={(e) => setSettings({ ...settings, min_password_length: parseInt(e.target.value) || 8 })}
            />
          </div>

          <div className="flex items-center gap-2 pt-2 opacity-60">
            <input
              type="checkbox"
              id="mfa_enforced"
              checked={false}
              disabled
              className="w-4 h-4 text-primary rounded border-input cursor-not-allowed"
            />
            <label htmlFor="mfa_enforced" className="text-xs font-semibold text-foreground cursor-not-allowed flex items-center gap-2">
              <span>Enforce Multi-Factor Authentication (MFA) for Organization Admins</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Coming Soon
              </span>
            </label>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} className="gap-2 font-semibold">
            <Save className="w-4 h-4" />
            <span>Save Platform Settings</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
