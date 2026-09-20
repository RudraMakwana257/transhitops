import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../stores/adminStore'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Building2, User, Copy, Check, ArrowLeft, ShieldAlert } from 'lucide-react'

export function AdminCompanyCreate() {
  const navigate = useNavigate()
  const { createCompany } = useAdminStore()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<{ companyId: string, email: string, password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    gst_number: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    vehicle_limit: 0,
    driver_limit: 0,
    user_limit: 0,
    admin_first_name: '',
    admin_last_name: '',
    admin_email: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value
    setFormData(prev => ({ ...prev, [e.target.name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      // 1. Create company
      const companyPayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        gst_number: formData.gst_number,
        timezone: formData.timezone,
        currency: formData.currency,
        vehicle_limit: formData.vehicle_limit,
        driver_limit: formData.driver_limit,
        user_limit: formData.user_limit
      }
      const companyRes = await createCompany(companyPayload)
      const newCompanyId = companyRes.id
      
      // 2. Create admin user
      const userPayload = {
        first_name: formData.admin_first_name,
        last_name: formData.admin_last_name,
        email: formData.admin_email
      }
      const userRes = await adminApi.createCompanyUser(newCompanyId, userPayload)
      const uData = userRes.data?.data || userRes.data || {}
      
      setSuccessData({
        companyId: newCompanyId,
        email: uData.user?.email || formData.admin_email,
        password: uData.temporary_password || 'Admin@123'
      })
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create company')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (successData) {
      navigator.clipboard.writeText(successData.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto mt-6 animate-in fade-in zoom-in-95 duration-300">
        <Card className="p-8 text-center space-y-6 border-border/80 bg-card shadow-md">
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground">Organization Provisioned!</h2>
            <p className="text-muted-foreground mt-1 text-sm">The tenant company and initial fleet administrator have been initialized.</p>
          </div>
          
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-left space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-foreground text-sm">Administrator Credentials</h3>
            </div>
            <p className="text-xs text-muted-foreground">Please copy and save these credentials securely. They cannot be viewed again once you leave this page.</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Login Email</label>
                <div className="font-mono bg-background text-foreground px-3.5 py-2.5 rounded-xl border border-input text-xs font-bold mt-1">
                  {successData.email}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Generated Password</label>
                <div className="flex gap-2 mt-1">
                  <div className="font-mono bg-background text-foreground px-3.5 py-2.5 rounded-xl border border-input text-xs font-bold flex-1">
                    {successData.password}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs gap-1">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-2">
            <Button onClick={() => navigate(`/admin/companies/${successData.companyId}`)} className="w-full font-semibold">
              Open Organization Dashboard &rarr;
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <button
          onClick={() => navigate('/admin/companies')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizations</span>
        </button>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Provision Organization</h1>
        <p className="text-muted-foreground mt-1 text-sm">Register a new enterprise tenant and generate primary management credentials</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 border-border/80 bg-card shadow-xs">
          <div className="flex items-center gap-2 mb-6 border-b border-border/60 pb-3">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Organization Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input label="Company Name" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="Business Email" type="email" name="email" value={formData.email} onChange={handleChange} required />
            <Input label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} />
            <Input label="GST / Tax Identification" name="gst_number" value={formData.gst_number} onChange={handleChange} />
            
            <div className="md:col-span-2">
              <Input label="Headquarters Address" name="address" value={formData.address} onChange={handleChange} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Timezone</label>
              <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Billing Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange} className="w-full h-10 px-3 py-2 bg-background border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            
            <Input label="Vehicle Limit (0 = unlimited)" type="number" name="vehicle_limit" value={formData.vehicle_limit} onChange={handleChange} />
            <Input label="Driver Limit (0 = unlimited)" type="number" name="driver_limit" value={formData.driver_limit} onChange={handleChange} />
          </div>
        </Card>

        <Card className="p-6 border-border/80 bg-card shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Primary Fleet Administrator</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-6">This initial user will be granted Fleet Manager permissions and receive auto-generated credentials.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input label="First Name" name="admin_first_name" value={formData.admin_first_name} onChange={handleChange} required />
            <Input label="Last Name" name="admin_last_name" value={formData.admin_last_name} onChange={handleChange} required />
            <div className="md:col-span-2">
              <Input label="Admin Email" type="email" name="admin_email" value={formData.admin_email} onChange={handleChange} required />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={() => navigate('/admin/companies')}>Cancel</Button>
          <Button type="submit" loading={loading} className="font-semibold">Provision Organization</Button>
        </div>
      </form>
    </div>
  )
}
