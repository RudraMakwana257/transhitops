import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Megaphone, Plus, Trash2, X, AlertTriangle, Info } from 'lucide-react'

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'INFO',
    target: 'ALL',
    is_active: true
  })
  const [saving, setSaving] = useState(false)

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAnnouncements()
      setAnnouncements(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminApi.createAnnouncement(formData)
      setIsCreateOpen(false)
      setFormData({
        title: '',
        message: '',
        type: 'INFO',
        target: 'ALL',
        is_active: true
      })
      fetchAnnouncements()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create announcement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this platform broadcast?')) return
    try {
      await adminApi.deleteAnnouncement(id)
      fetchAnnouncements()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete announcement')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Platform Announcements</h1>
          <p className="text-muted-foreground mt-1 text-sm">Publish global maintenance banners, release updates, and critical notices to tenant dashboards</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 font-semibold">
          <Plus className="w-4 h-4" />
          <span>New Broadcast</span>
        </Button>
      </div>

      <div className="space-y-4">
        {announcements.map((a) => (
          <Card key={a.id} className="p-5 bg-card border-border/80 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl border mt-0.5 ${
                a.type === 'WARNING' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                a.type === 'CRITICAL' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                'bg-blue-500/10 text-blue-600 border-blue-500/20'
              }`}>
                {a.type === 'WARNING' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-foreground">{a.title}</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {a.target === 'ALL' ? 'All Organizations' : `Plan: ${a.target_id || 'Enterprise'}`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{a.message}</p>
                <span className="text-[11px] text-muted-foreground block pt-1">
                  Published on {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}

        {loading && !announcements.length && (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            Loading announcements...
          </div>
        )}

        {!loading && !announcements.length && (
          <Card className="p-12 text-center text-muted-foreground bg-card border-border/80">
            <Megaphone className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="font-semibold text-foreground">No active platform announcements</p>
            <p className="text-xs mt-1">Publish a broadcast notice to display on all tenant dashboards.</p>
          </Card>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsCreateOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-foreground mb-1">Publish Platform Broadcast</h2>
            <p className="text-xs text-muted-foreground mb-4">This notification banner will be displayed to all active tenant sessions.</p>

            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Headline Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notice Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="INFO">Informational / Update</option>
                    <option value="WARNING">Maintenance Warning</option>
                    <option value="CRITICAL">Critical Advisory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Target Audience</label>
                  <select
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="ALL">Entire Platform (All Tenants)</option>
                    <option value="PLAN">Specific Subscription Tier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Message Content</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="font-semibold">Publish Broadcast</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
