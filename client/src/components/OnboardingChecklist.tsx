import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Truck, Users, MapPin, User, X, PartyPopper } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardContent } from './ui/Card'
import { useAuth } from '../hooks/useAuth'
import { api } from '../api/client'

interface OnboardingStatus {
  completed: boolean
  steps: {
    account_created: boolean
    vehicle_added: boolean
    driver_added: boolean
    trip_created: boolean
    profile_completed: boolean
  }
  completion_percentage: number
}

export function OnboardingChecklist() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  // Super admin doesn't need this
  const isSuperAdmin = user?.role === 'super_admin'

  useEffect(() => {
    if (isSuperAdmin || dismissed) return
    
    let isMounted = true

    const fetchStatus = async () => {
      try {
        const res = await api.get('/onboarding/status')
        const data = res.data
        if (!isMounted) return

        setStatus(data)

        if (data.completed && data.completion_percentage === 100) {
          setShowCelebration(true)
          setTimeout(() => {
            setShowCelebration(false)
            setDismissed(true)
            api.patch('/onboarding/complete')
          }, 3000)
        }
      } catch (error) {
        console.error('Failed to fetch onboarding status:', error)
      }
    }
    
    fetchStatus()

    return () => { isMounted = false }
  }, [isSuperAdmin, dismissed])

  if (isSuperAdmin || dismissed || !status || status.completed) return null

  if (showCelebration) {
    return (
      <div className="bg-green-500 text-white rounded-xl p-6 mb-6 flex flex-col items-center justify-center text-center shadow-lg border border-green-600 animate-in fade-in zoom-in duration-300">
        <PartyPopper className="w-12 h-12 mb-3 animate-bounce" />
        <h2 className="text-2xl font-bold mb-1">Your fleet is ready! 🎉</h2>
        <p className="text-green-100">All setup steps completed successfully.</p>
      </div>
    )
  }

  const steps = [
    { key: 'account_created', icon: User, title: 'Account created', desc: 'Welcome aboard!', link: null, done: status.steps.account_created },
    { key: 'vehicle_added', icon: Truck, title: 'Add your first vehicle', desc: 'Add a truck or van to your fleet.', link: '/vehicles', done: status.steps.vehicle_added },
    { key: 'driver_added', icon: Users, title: 'Add your first driver', desc: 'Add driver details and license.', link: '/drivers', done: status.steps.driver_added },
    { key: 'trip_created', icon: MapPin, title: 'Create your first trip', desc: 'Dispatch your first active trip.', link: '/trips', done: status.steps.trip_created },
    { key: 'profile_completed', icon: User, title: 'Complete your profile', desc: 'Add company address and phone.', link: '/settings', done: status.steps.profile_completed },
  ]

  const completedCount = steps.filter(s => s.done).length

  return (
    <Card className="mb-8 border-2 border-[var(--brand-primary)]/20 bg-gradient-to-r from-[var(--brand-primary)]/5 to-transparent relative overflow-hidden">
      <CardContent className="p-6 sm:p-8">
        <div className="absolute top-4 right-4">
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4 mr-1.5" />
            Dismiss for now
          </Button>
        </div>

        <div className="max-w-4xl">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Welcome to TransitOps, {user?.name}!</h2>
          <p className="text-[var(--text-secondary)] mb-8">Let's get your fleet management center set up. You're almost there.</p>

          <div className="mb-8">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-[var(--text-primary)]">Setup Progress</span>
              <span className="text-[var(--brand-primary)]">{completedCount} of 5 steps complete</span>
            </div>
            <div className="w-full bg-[var(--bg-hover)] rounded-full h-2.5 overflow-hidden border border-[var(--border-default)]">
              <div 
                className="bg-[var(--brand-primary)] h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${status.completion_percentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {steps.map((s, idx) => {
              const isCurrent = !s.done && (idx === 0 || steps[idx - 1].done)
              return (
                <div key={s.key} className="relative">
                  {idx !== steps.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-[60%] right-[-40%] h-[2px] bg-[var(--border-default)] z-0" />
                  )}
                  <div className="relative z-10 flex flex-col items-center text-center">
                    {s.link && !s.done ? (
                      <button onClick={() => navigate(s.link)} className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${isCurrent ? 'bg-[var(--brand-primary)] text-white shadow-md cursor-pointer hover:bg-[#b57703]' : 'bg-[var(--bg-card)] border-2 border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--brand-primary)]/50 cursor-pointer'}`}>
                        <s.icon className="w-5 h-5" />
                      </button>
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${s.done ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-500' : 'bg-[var(--bg-card)] border-2 border-[var(--border-default)] text-[var(--text-muted)]'}`}>
                        {s.done ? <Check className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
                      </div>
                    )}
                    <h3 className={`text-sm font-semibold mb-1 ${s.done ? 'text-[var(--text-primary)]' : isCurrent ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {s.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] hidden sm:block">
                      {s.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
