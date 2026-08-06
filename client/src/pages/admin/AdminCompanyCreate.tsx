import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../stores/adminStore'
import { adminApi } from '../../api'
import { Card } from '../../components/ui/CardWrapper'
import { Button } from '../../components/ui/ButtonWrapper'
import { Input } from '../../components/ui/InputWrapper'
import { Building2, User, Copy, Check } from 'lucide-react'

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
      
      setSuccessData({
        companyId: newCompanyId,
        email: userRes.data.user.email,
        password: userRes.data.temporary_password
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
      <div className="max-w-2xl mx-auto mt-10">
        <Card className="p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Company Created Successfully!</h2>
            <p className="text-slate-500 mt-2">The company and initial administrator account have been provisioned.</p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-left space-y-4">
            <h3 className="font-semibold text-amber-800">Admin Credentials</h3>
            <p className="text-sm text-amber-700">Please save this password now. It is auto-generated and cannot be recovered later.</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-amber-800">Email</label>
                <div className="font-mono bg-white px-3 py-2 rounded border border-amber-200">{successData.email}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-amber-800">Temporary Password</label>
                <div className="flex gap-2">
                  <div className="font-mono bg-white px-3 py-2 rounded border border-amber-200 flex-1">
                    {successData.password}
                  </div>
                  <Button variant="outline" onClick={handleCopy} className="bg-white hover:bg-amber-100 border-amber-200 text-amber-700">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <Button onClick={() => navigate(`/admin/companies/${successData.companyId}`)} className="w-full">
              Proceed to Company Details
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create New Company</h1>
        <p className="text-slate-500 mt-1">Provision a new tenant organization and initial admin user</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Organization Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Company Name" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} required />
            <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
            <Input label="GST Number" name="gst_number" value={formData.gst_number} onChange={handleChange} />
            
            <div className="md:col-span-2">
              <Input label="Address" name="address" value={formData.address} onChange={handleChange} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
              <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange} className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            
            <Input label="Vehicle Limit (0 = unlmt)" type="number" name="vehicle_limit" value={formData.vehicle_limit} onChange={handleChange} />
            <Input label="Driver Limit (0 = unlmt)" type="number" name="driver_limit" value={formData.driver_limit} onChange={handleChange} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Initial Administrator</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6">This user will be created as a Fleet Manager and receive full access to this organization.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="First Name" name="admin_first_name" value={formData.admin_first_name} onChange={handleChange} required />
            <Input label="Last Name" name="admin_last_name" value={formData.admin_last_name} onChange={handleChange} required />
            <div className="md:col-span-2">
              <Input label="Admin Email" type="email" name="admin_email" value={formData.admin_email} onChange={handleChange} required />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" type="button" onClick={() => navigate('/admin/companies')}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Company</Button>
        </div>
      </form>
    </div>
  )
}
