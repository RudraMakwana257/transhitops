import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, Eye, EyeOff, AlertCircle, Moon, Sun, Building2, User as UserIcon, Mail, Lock } from 'lucide-react'
import { Button } from '../components/ui/ButtonWrapper'
import { Input } from '../components/ui/InputWrapper'
import { useAuth } from '../store/authStore'
import { useUIStore } from '../store/uiStore'

const registerSchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
})

type RegisterForm = z.infer<typeof registerSchema>

export function Register() {
  const navigate = useNavigate()
  const { register: registerUser, isAuthenticated } = useAuth()
  const { theme, toggleTheme } = useUIStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  if (isAuthenticated) {
    const role = useAuth.getState().user?.role
    return <Navigate to={role === 'super_admin' ? '/admin/dashboard' : '/dashboard'} replace />
  }

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    setError('')
    try {
      await registerUser(data.company_name, data.name, data.email, data.password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background transition-colors duration-200">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4 shadow-sm">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Get Started with TransitOps</h1>
          <p className="text-sm text-muted-foreground mt-1">Autonomous Multi-Tenant Fleet Operations Platform</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-1">Create your organization</h2>
          <p className="text-xs text-muted-foreground mb-6">Enter your organization details to start your fleet operations.</p>

          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  {...register('company_name')}
                  placeholder="Acme Logistics LLC"
                  className="pl-9 bg-background border-border"
                />
              </div>
              {errors.company_name && (
                <p className="text-xs text-destructive mt-1">{errors.company_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Your Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  {...register('name')}
                  placeholder="John Doe"
                  className="pl-9 bg-background border-border"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Work Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="john@acmelogistics.com"
                  className="pl-9 bg-background border-border"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-10 bg-background border-border"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full mt-2" loading={loading} loadingText="Creating account...">
              Create Organization & Start
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-amber-500 hover:text-amber-600 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50">
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}>
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  )
}
