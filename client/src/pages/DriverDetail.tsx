import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Driver, Trip } from '../types'
import { DataTable } from '../components/ui/DataTableWrapper'
import { StatusBadge } from '../components/ui/BadgeWrapper'
import { Button } from '../components/ui/ButtonWrapper'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/CardWrapper'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Users, Shield, AlertTriangle, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { toast } from '../store/toastStore'

export function DriverDetail() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'trips'>('overview')
  const [updatingScore, setUpdatingScore] = useState(false)
  const [scoreValue, setScoreValue] = useState('')
  const [showScoreEdit, setShowScoreEdit] = useState(false)

  const canManage = hasRole(['fleet_manager'])
  const canEditSafety = hasRole(['fleet_manager', 'safety_officer'])

  useEffect(() => {
    if (id) fetchAll()
  }, [id])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [dRes, tRes] = await Promise.all([
        api.get(`/drivers/${id}`),
        api.get(`/drivers/${id}/trips?page_size=10`),
      ])
      if (dRes.data.success) {
        setDriver(dRes.data.data)
        setScoreValue(dRes.data.data.safety_score.toString())
      }
      if (tRes.data.success) setTrips(tRes.data.data)
    } catch (err) {
      toast('Failed to load driver', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleScoreUpdate = async () => {
    if (!scoreValue || isNaN(Number(scoreValue))) return
    setUpdatingScore(true)
    try {
      await api.put(`/drivers/${id}`, { safety_score: Number(scoreValue) })
      toast('Safety score updated', 'success')
      setShowScoreEdit(false)
      fetchAll()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to update score', 'error')
    } finally {
      setUpdatingScore(false)
    }
  }

  const handleSuspend = async () => {
    if (!confirm('Suspend this driver? They will be removed from dispatch pool.')) return
    try {
      await api.put(`/drivers/${id}`, { status: 'Suspended' })
      toast('Driver suspended', 'success')
      fetchAll()
    } catch (err: any) {
      toast(err.response?.data?.message || 'Failed to suspend', 'error')
    }
  }

  if (loading) return <div className="p-6 space-y-6 animate-pulse"><div className="h-8 bg-muted/50 rounded w-48" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted/50 rounded-xl" />)}</div><div className="h-64 bg-muted/50 rounded-xl" /></div>
  if (!driver) return <div className="p-6 text-center text-muted-foreground">Driver not found</div>

  const days = driver.days_until_expiry
  const isExpired = days !== undefined && days < 0
  const isExpiringSoon = days !== undefined && days >= 0 && days <= 30

  return (
    <PageWrapper
      title={driver.name}
      description={`${driver.license_number} • ${driver.license_category}`}
      headerActions={
        <>
          {canEditSafety && (
            <Button variant="outline" onClick={() => setShowScoreEdit(!showScoreEdit)}>
              <Shield className="w-4 h-4 mr-2" />Edit Safety Score
            </Button>
          )}
          {canManage && driver.status !== 'Suspended' && (
            <Button variant="outline" onClick={handleSuspend} className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 mr-2" />Suspend
            </Button>
          )}
        </>
      }
    >
      {showScoreEdit && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Update Safety Score</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={scoreValue}
                  onChange={(e) => setScoreValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground"
                />
              </div>
              <Button onClick={handleScoreUpdate} loading={updatingScore}>Save</Button>
              <Button variant="ghost" onClick={() => setShowScoreEdit(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <StatusBadge status={driver.status} type="driver" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Safety Score</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{Number(driver.safety_score || 0).toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isExpired ? 'bg-red-100 dark:bg-red-900/30' : isExpiringSoon ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                <AlertTriangle className={`w-6 h-6 ${isExpired ? 'text-red-600 dark:text-red-400' : isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">License Expiry</p>
                <p className={`font-bold ${isExpired ? 'text-red-600 dark:text-red-400' : isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                  {format(new Date(driver.license_expiry), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isExpired ? `Expired ${Math.abs(days as number)} days ago` : isExpiringSoon ? `Expires in ${days} days` : `${days !== undefined ? days : 'Unknown'} days left`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-bold">{driver.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex border-b border-border mb-6">
        {(['overview', 'trips'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <Card>
          <CardHeader><CardTitle>Driver Information</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><dt className="text-sm text-muted-foreground">Full Name</dt><dd className="font-medium">{driver.name}</dd></div>
                <div><dt className="text-sm text-muted-foreground">License Number</dt><dd className="font-medium font-mono">{driver.license_number}</dd></div>
                <div><dt className="text-sm text-muted-foreground">License Category</dt><dd className="font-medium">{driver.license_category}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Phone</dt><dd className="font-medium">{driver.phone}</dd></div>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {activeTab === 'trips' && (
        <Card>
          <CardHeader><CardTitle>Recent Trips</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'trip_number', header: 'Trip No', accessor: 'trip_number', sortable: true },
                { key: 'route', header: 'Route', render: (t: Trip) => `${t.source} → ${t.destination}` },
                { key: 'status', header: 'Status', render: (t: Trip) => <StatusBadge status={t.status} type="trip" /> },
                { key: 'date', header: 'Date', accessor: 'created_at', sortable: true, render: (t: Trip) => format(new Date(t.created_at), 'MMM d, yyyy') },
              ]}
              data={trips}
              loading={loading}
              emptyMessage="No trips found"
              onRowClick={(t) => navigate(`/trips/${t.id}`)}
            />
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  )
}
