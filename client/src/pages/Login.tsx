import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { useAuth } from '../store/authStore'
import { useUIStore } from '../store/uiStore'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember_me: z.boolean().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const { theme, toggleTheme } = useUIStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember_me: true },
  })
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  
  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError('')
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 bg-[var(--brand-primary)] rounded-xl flex items-center justify-center mx-auto">
                <Truck className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome to TransitOps</CardTitle>
            <CardDescription>Sign in to access your fleet operations</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <Input
                {...register('email')}
                label="Email"
                type="email"
                placeholder="manager@transitops.com"
                error={errors.email?.message}
                autoComplete="email"
                autoFocus
              />
              
              <div className="relative">
                <Input
                  {...register('password')}
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('remember_me')}
                    className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary-light)]"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-[var(--brand-primary)] hover:underline">
                  Forgot password?
                </Link>
              </div>
              
              <Button type="submit" className="w-full" loading={loading} loadingText="Signing in...">
                Sign In
              </Button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-[var(--border-default)]">
              <p className="text-sm text-[var(--text-muted)] text-center">
                Demo accounts: manager@transitops.com, dispatcher@transitops.com, safety@transitops.com, finance@transitops.com
              </p>
              <p className="text-sm text-[var(--text-muted)] text-center mt-1">
                Password for all: <code className="bg-[var(--bg-sidebar)] px-1.5 py-0.5 rounded">Admin@123</code>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="fixed bottom-4 right-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label={theme === 'light' ? 'Switch to Operations Night' : 'Switch to Operations Light'}>
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}