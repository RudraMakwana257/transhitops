import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { MaintenanceLog, MaintenanceStatus } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/Card'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ArrowLeft, Save, Edit, PenTool } from 'lucide-react'
import { toast } from '../store/toastStore'
import { StatusBadge } from '../components/ui/Badge'
import { format } from 'date-fns'

const STATUSES: { value: MaintenanceStatus; label: string }[] = [
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Completed', label: 'Completed' },
]

export function MaintenanceDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  
  const [log, setLog] = useState<MaintenanceLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [form, setForm] = useState({
    status: '',
    cost: '',
    technician: '',
    completed_date: '',
    description: '',
  })

  useEffect(() => {
    fetchLog()
  }, [id])

  const fetchLog = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await api.get(`/maintenance/${id}`)
      if (res.data.success) {
        setLog(res.data.data)
        setForm({
          status: res.data.data.status,
          cost: res.data.data.cost.toString(),
          technician: res.data.data.technician || '',
          completed_date: res.data.data.completed_date ? res.data.data.completed_date.split('T')[0] : '',
          description: res.data.data.description || '',
        })
      }
    } catch (err) {
      setError((err as any).response?.data?.message || 'Failed to fetch maintenance log')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSubmitting(true)
    try {
      const res = await api.patch(`/maintenance/${id}`, {
        status: form.status,
        cost: Number(form.cost),
        technician: form.technician,
        completed_date: form.completed_date || null,
        description: form.description,
      })
      if (res.data.success) {
        setLog(res.data.data)
        setIsEditing(false)
        toast('Maintenance log updated', 'success')
      }
    } catch (err) {
      toast((err as any).response?.data?.message || 'Failed to update maintenance log', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)
  }

  return (
    <PageWrapper
      title="Maintenance Details"
      description="View and update maintenance record"
      headerActions={
        <div className="flex gap-2">
          {!isEditing && (
            <Button variant="primary" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />Edit Record
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/maintenance')}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
        </div>
      }
    >
      <Card className="max-w-3xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-orange-500" />
            Maintenance Record
          </CardTitle>
          {log && !isEditing && <StatusBadge status={log.status} type="maintenance" />}
        </CardHeader>

        {loading ? (
          <div className="p-8 flex justify-center text-[var(--text-muted)] animate-pulse">Loading maintenance data...</div>
        ) : error ? (
          <div className="p-6 text-red-500">{error}</div>
        ) : log ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Read-only sections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pb-4 border-b border-[var(--border-color)]">
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Vehicle</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {log.vehicle?.name} ({log.vehicle?.reg_number})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Service Type</p>
                  <p className="font-medium text-[var(--text-primary)]">{log.type}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Scheduled Date</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {log.scheduled_date ? format(new Date(log.scheduled_date), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)] mb-1">Created At</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                {!isEditing && (
                  <>
                    <div>
                      <p className="text-sm text-[var(--text-muted)] mb-1">Cost</p>
                      <p className="font-medium text-[var(--text-primary)]">{formatCurrency(log.cost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text-muted)] mb-1">Technician</p>
                      <p className="font-medium text-[var(--text-primary)]">{log.technician || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--text-muted)] mb-1">Completed Date</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {log.completed_date ? format(new Date(log.completed_date), 'MMM d, yyyy') : '—'}
                      </p>
                    </div>
                    <div className="sm:col-span-2 mt-2">
                      <p className="text-sm text-[var(--text-muted)] mb-1">Description</p>
                      <p className="font-medium text-[var(--text-primary)] whitespace-pre-wrap">{log.description || '—'}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Editable sections */}
              {isEditing && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select label="Status" value={form.status} onChange={set('status')} options={STATUSES} />
                    <Input label="Cost (INR)" type="number" step="0.01" value={form.cost} onChange={set('cost')} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Technician" value={form.technician} onChange={set('technician')} />
                    <Input label="Completed Date" type="date" value={form.completed_date} onChange={set('completed_date')} />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-[var(--text-primary)]">Description</label>
                    <textarea 
                      className="w-full px-3 py-2 border rounded-md bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] border-[var(--border-color)] text-[var(--text-primary)]"
                      rows={4} 
                      value={form.description} 
                      onChange={set('description')}
                    />
                  </div>
                </div>
              )}
            </CardContent>

            {isEditing && (
              <CardFooter className="flex justify-end gap-3 bg-[var(--surface-color)] border-t border-[var(--border-color)] py-4 mt-2">
                <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button type="submit" loading={submitting}><Save className="w-4 h-4 mr-2" />Save Record</Button>
              </CardFooter>
            )}
          </form>
        ) : null}
      </Card>
    </PageWrapper>
  )
}
