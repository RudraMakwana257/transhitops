import { useEffect, useState } from 'react'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Plus, RotateCcw, X, Building2 } from 'lucide-react'

export function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    company_id: '',
    plan_slug: '',
    amount: 100,
    payment_method: 'UPI',
    billing_period_months: 1,
    reference_number: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const res: any = await adminApi.getPayments({
        company_id: selectedCompanyId || undefined,
        status: selectedStatus || undefined,
        page: 1,
        per_page: 50
      })
      const data = res?.data || res || {}
      const items = data.items || (Array.isArray(data) ? data : [])
      setPayments(items)
      setTotal(data.total || items.length)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDependencies = async () => {
    try {
      const [compRes, planRes]: any[] = await Promise.all([
        adminApi.getCompanies({ page: 1, page_size: 100 }),
        adminApi.getPlans()
      ])
      const compData = compRes?.data || compRes || {}
      const planData = planRes?.data || planRes || []
      setCompanies(compData.items || (Array.isArray(compData) ? compData : []))
      setPlans(Array.isArray(planData) ? planData : (planData.items || []))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchDependencies()
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [selectedCompanyId, selectedStatus])

  const handleOpenCreate = () => {
    const defaultComp = companies[0]?.id || ''
    const defaultPlan = plans[0]?.slug || 'starter'
    setFormData({
      company_id: defaultComp,
      plan_slug: defaultPlan,
      amount: plans[0]?.price_monthly || 100,
      payment_method: 'UPI',
      billing_period_months: 1,
      reference_number: `REF-${Date.now().toString().slice(-6)}`,
      notes: 'Offline payment verified'
    })
    setError('')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adminApi.recordPayment(formData)
      setIsModalOpen(false)
      fetchPayments()
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const handleReverse = async (p: any) => {
    const reason = window.prompt(`Reason for reversing payment of $${p.amount} for ${p.company_name || 'company'}?`)
    if (!reason) return
    try {
      await adminApi.reversePayment(p.id, reason)
      fetchPayments()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reverse payment')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Manual & Offline Payments</h1>
          <p className="text-muted-foreground mt-1 text-sm">Record offline wire transfers, cash, UPI subscriptions, and handle reversals</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 font-semibold">
          <Plus className="w-4 h-4" />
          <span>Record Payment</span>
        </Button>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-card border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1">
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm flex-1 max-w-xs"
          >
            <option value="">All Organizations</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm flex-1 max-w-xs"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="REVERSED">REVERSED</option>
            <option value="PENDING">PENDING</option>
          </select>
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Total Payment Records: <span className="font-bold text-foreground">{total}</span>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/80 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Payment Details</th>
                <th className="px-6 py-3.5">Organization</th>
                <th className="px-6 py-3.5">Plan Tier</th>
                <th className="px-6 py-3.5">Method</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">${p.amount?.toLocaleString()} {p.currency || 'INR'}</div>
                    <div className="text-xs text-muted-foreground font-mono">Ref: {p.reference_number || 'N/A'}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{p.payment_date || p.created_at}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span>{p.company_name || 'Organization'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      {p.plan_name || p.plan_slug || 'Standard'} ({p.billing_period_months || 1} mo)
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-foreground uppercase">{p.payment_method}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      p.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                      p.status === 'REVERSED' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                    {p.status === 'CONFIRMED' && (
                      <Button variant="outline" size="sm" onClick={() => handleReverse(p)} className="text-xs text-destructive border-destructive/20 hover:bg-destructive/10">
                        <RotateCcw className="w-3 h-3 mr-1" /> Reverse
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {loading && !payments.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading payments...</td>
                </tr>
              )}
              {!loading && !payments.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">No payment records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-foreground mb-1">Record Offline Payment</h2>
            <p className="text-xs text-muted-foreground mb-4">Extend tenant subscription access and record manual payment receipt.</p>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Organization</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  required
                >
                  <option value="">-- Select Company --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Subscription Plan</label>
                  <select
                    value={formData.plan_slug}
                    onChange={(e) => {
                      const p = plans.find(pl => pl.slug === e.target.value)
                      setFormData({
                        ...formData,
                        plan_slug: e.target.value,
                        amount: p ? p.price_monthly * formData.billing_period_months : formData.amount
                      })
                    }}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    required
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.slug}>{p.name} (${p.price_monthly}/mo)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Period (Months)</label>
                  <select
                    value={formData.billing_period_months}
                    onChange={(e) => {
                      const m = parseInt(e.target.value) || 1
                      const p = plans.find(pl => pl.slug === formData.plan_slug)
                      setFormData({
                        ...formData,
                        billing_period_months: m,
                        amount: p ? p.price_monthly * m : formData.amount
                      })
                    }}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months (1 Year)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Total Amount Paid ($)"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Wire / NEFT</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="PHONE_CALL">Phone Confirmation</option>
                    <option value="FACE_TO_FACE">In-person Handshake</option>
                    <option value="OTHER">Other Gateway</option>
                  </select>
                </div>
              </div>

              <Input
                label="Payment Reference / Transaction ID"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notes & Verification Details</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" loading={saving} className="font-semibold">Confirm Payment & Activate</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
