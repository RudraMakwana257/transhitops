import { useEffect, useState, useCallback } from 'react'
import { api } from '../../api/client'
import type { OperationalException } from '../../types'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/CardWrapper'
import { Button } from '../ui/ButtonWrapper'
import { Badge } from '../ui/BadgeWrapper'
import { AlertTriangle, RefreshCw, CheckCircle, Eye, ShieldAlert, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../../store/toastStore'
import { formatDistanceToNow } from 'date-fns'

export function OperationsExceptionsWidget() {
  const navigate = useNavigate()
  const [exceptions, setExceptions] = useState<OperationalException[]>([])
  const [summary, setSummary] = useState<{ CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number; total_active: number }>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    total_active: 0
  })
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [selectedException, setSelectedException] = useState<OperationalException | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, summaryRes] = await Promise.all([
        api.exceptions.list({ status: 'ACTIVE', page_size: 5 }),
        api.exceptions.getSummary()
      ])
      if (listRes?.data?.items) {
        setExceptions(listRes.data.items)
      }
      if (summaryRes?.data) {
        setSummary(summaryRes.data)
      }
    } catch (err: any) {
      // Gracefully handle if exceptions feature is disabled or endpoint fails
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRunDetection = async () => {
    setDetecting(true)
    try {
      const res = await api.exceptions.triggerDetect()
      const data = res?.data || {}
      toast(`Detection complete: ${data.created || 0} new, ${data.resolved || 0} resolved`, 'success')
      await fetchData()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to run detection scan', 'error')
    } finally {
      setDetecting(false)
    }
  }

  const handleAcknowledge = async (id: string) => {
    try {
      await api.exceptions.acknowledge(id)
      toast('Exception acknowledged', 'success')
      fetchData()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to acknowledge exception', 'error')
    }
  }

  const handleResolve = async (id: string, action: 'resolve' | 'dismiss') => {
    setActionLoading(true)
    try {
      if (action === 'resolve') {
        await api.exceptions.resolve(id, resolutionNote)
        toast('Exception marked as resolved', 'success')
      } else {
        await api.exceptions.dismiss(id, resolutionNote)
        toast('Exception dismissed', 'success')
      }
      setSelectedException(null)
      setResolutionNote('')
      fetchData()
    } catch (err: any) {
      toast(err.response?.data?.message || `Failed to ${action} exception`, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const getEntityActionLabel = (exc: OperationalException) => {
    switch (exc.entity_type) {
      case 'driver': return 'View Driver'
      case 'vehicle': return 'View Vehicle'
      case 'maintenance': return 'View Maintenance'
      case 'trip': return 'View Trip'
      default: return 'View Detail'
    }
  }

  const handleNavigateEntity = (exc: OperationalException) => {
    switch (exc.entity_type) {
      case 'driver':
        navigate(`/drivers/${exc.entity_id}`)
        break
      case 'vehicle':
        navigate(`/vehicles/${exc.entity_id}`)
        break
      case 'maintenance':
        navigate(`/maintenance/${exc.entity_id}`)
        break
      case 'trip':
        navigate(`/trips/${exc.entity_id}`)
        break
      default:
        break
    }
  }

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'danger'
      case 'HIGH': return 'warning'
      case 'MEDIUM': return 'info'
      default: return 'default'
    }
  }

  return (
    <Card className="border border-border/40 bg-card/60 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg font-bold text-foreground">
            Operations Exceptions
          </CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunDetection}
          disabled={detecting}
          className="text-xs flex items-center space-x-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${detecting ? 'animate-spin' : ''}`} />
          <span>{detecting ? 'Scanning...' : 'Run Scan'}</span>
        </Button>
      </CardHeader>
      <CardContent>
        {/* Severity Summary Bar */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
            <div className="text-xl font-bold text-red-500">{summary.CRITICAL}</div>
            <div className="text-xs font-medium text-red-400">Critical</div>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="text-xl font-bold text-amber-500">{summary.HIGH}</div>
            <div className="text-xs font-medium text-amber-400">High</div>
          </div>
          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
            <div className="text-xl font-bold text-yellow-500">{summary.MEDIUM}</div>
            <div className="text-xs font-medium text-yellow-400">Medium</div>
          </div>
        </div>

        {/* Exception List */}
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading operational exceptions...</div>
        ) : exceptions.length === 0 ? (
          <div className="py-6 text-center text-sm text-emerald-500 flex flex-col items-center justify-center space-y-1">
            <CheckCircle className="h-6 w-6 text-emerald-500 mb-1" />
            <p className="font-medium">No active operational exceptions</p>
            <p className="text-xs text-muted-foreground">All fleet assets operating within parameters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exceptions.map((exc) => (
              <div
                key={exc.id}
                className="p-3 rounded-lg bg-background/50 border border-border/50 hover:border-border transition-colors flex flex-col space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={getSeverityBadgeVariant(exc.severity) as any}>
                      {exc.severity}
                    </Badge>
                    <span className="font-semibold text-sm text-foreground">{exc.title}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {exc.detected_at ? formatDistanceToNow(new Date(exc.detected_at), { addSuffix: true }) : ''}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{exc.description}</p>

                {exc.meta_data?.recommended_action && (
                  <div className="text-[11px] p-2 rounded bg-amber-500/5 text-amber-300 border border-amber-500/10">
                    <span className="font-semibold">Action Required: </span>
                    {exc.meta_data.recommended_action}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    onClick={() => handleNavigateEntity(exc)}
                    className="text-amber-400 hover:underline flex items-center space-x-1 font-medium"
                  >
                    <Eye className="h-3 w-3" />
                    <span>{getEntityActionLabel(exc)}</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    {exc.status === 'ACTIVE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAcknowledge(exc.id)}
                        className="h-6 text-[11px] px-2"
                      >
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedException(exc)}
                      className="h-6 text-[11px] px-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resolution Modal */}
        {selectedException && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-card border border-border rounded-lg p-5 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="font-bold text-foreground flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Resolve Exception</span>
                </h3>
                <button
                  onClick={() => setSelectedException(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">{selectedException.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedException.description}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Resolution Note (Optional)</label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Explain how this issue was resolved..."
                  className="w-full h-20 px-3 py-2 text-xs rounded-md bg-background border border-border focus:border-amber-500 focus:outline-none text-foreground"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedException(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolve(selectedException.id, 'dismiss')}
                  disabled={actionLoading}
                  className="text-muted-foreground"
                >
                  Dismiss
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleResolve(selectedException.id, 'resolve')}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {actionLoading ? 'Saving...' : 'Confirm Resolution'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
