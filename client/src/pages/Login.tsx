import { useState } from 'react'
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, Eye, EyeOff, AlertCircle, Moon, Sun, ArrowLeft, Mail, Lock } from 'lucide-react'
import { Button } from '../components/ui/ButtonWrapper'
import { Input } from '../components/ui/InputWrapper'
import { useAuth } from '../store/authStore'
import { useUIStore } from '../store/uiStore'

const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

const demos = [
  { role: 'Super Admin', email: 'admin@transitops.com', password: 'SuperAdmin@123', color: '#EF4444' },
  { role: 'Fleet Manager', email: 'manager@transitops.com', password: 'Admin@123', color: '#D98E04' },
  { role: 'Dispatcher', email: 'dispatcher@transitops.com', password: 'Admin@123', color: '#3B82F6' },
  { role: 'Safety Officer', email: 'safety@transitops.com', password: 'Admin@123', color: '#22C55E' },
  { role: 'Financial Analyst', email: 'finance@transitops.com', password: 'Admin@123', color: '#8B5CF6' },
]

export function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const { theme, toggleTheme } = useUIStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const location = useLocation()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: location.state?.email || '',
      password: location.state?.password || '',
      remember_me: true
    },
  })

  if (isAuthenticated) {
    const role = useAuth.getState().user?.role
    return <Navigate to={role === 'super_admin' ? '/admin/dashboard' : '/dashboard'} replace />
  }

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError('')
    try {
      await login(data.email, data.password)
      const role = useAuth.getState().user?.role
      navigate(role === 'super_admin' ? '/admin/dashboard' : '/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (email: string, password?: string) => {
    setValue('email', email)
    setValue('password', password || 'Admin@123')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — Brand Side */}
      <div className="hidden lg:flex w-1/2 bg-card border-r border-border items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, hsl(var(--primary)) 0%, transparent 60%)' }} />
        <div className="relative max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Truck className="w-11 h-11 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            From Dispatch<br />to <span className="text-primary">Decisions</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Intelligent fleet operations center. Manage vehicles, drivers, trips, and costs from a single command center.
          </p>
          <div className="mt-10 space-y-3 text-left">
            {[
              'Real-time fleet tracking & health monitoring',
              'AI-powered trip recommendations',
              'Driver safety scoring & compliance',
              'Comprehensive analytics & reporting',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-foreground">TransitOps</span>
          </div>

          <div className="bg-card border border-border rounded-xl" style={{ borderLeft: '3px solid hsl(var(--primary))' }}>
            <div className="p-6 pb-0">
              <h2 className="text-xl font-bold text-foreground">Welcome back</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sign in to your operations center</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-5 space-y-5">
              {error && (
                <div className="px-3 py-2.5 rounded-xl flex items-start gap-2.5 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400" role="alert">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                {...register('email')}
                label="Email"
                type="email"
                placeholder="you@company.com"
                error={errors.email?.message}
                autoComplete="email"
                autoFocus
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <div className="relative">
                <Input
                  {...register('password')}
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  autoComplete="current-password"
                  leftIcon={<Lock className="w-4 h-4" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  {...register('remember_me')}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/10 focus:ring-offset-0"
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>

              <Button type="submit" className="w-full" loading={loading} loadingText="Signing in...">
                Sign In
              </Button>

              <div className="text-center mt-3 text-xs text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-amber-500 hover:text-amber-600 transition-colors">
                  Create Organization
                </Link>
              </div>
            </form>
          </div>

          {/* Demo Quick Fill (Disabled by default in production) */}
          {(import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true' || import.meta.env.DEV) && (
            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 text-center">Quick fill demo account</p>
              <div className="grid grid-cols-2 gap-2">
                {demos.map((d) => {
                  return (
                    <button
                      key={d.email}
                      type="button"
                      onClick={() => fillDemo(d.email, d.password)}
                      className="text-left px-3 py-2.5 rounded-xl border border-border bg-card hover:hover:bg-accent hover:text-accent-foreground hover:border-border transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <p className="text-xs font-medium text-foreground truncate">{d.role}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5 pl-4">{d.email}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to Operations Night' : 'Switch to Operations Light'}>
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  )
}
