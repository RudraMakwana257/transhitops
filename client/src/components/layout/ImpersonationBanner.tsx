import { useAuth } from '../../store/authStore'
import { Button } from '../ui/ButtonWrapper'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

export function ImpersonationBanner() {
  const { user } = useAuth()
  const originalToken = localStorage.getItem('transitops_impersonator_token')

  if (!originalToken) return null

  const handleStopImpersonation = () => {
    const token = localStorage.getItem('transitops_impersonator_token')
    const userStr = localStorage.getItem('transitops_impersonator_user')
    
    if (token) {
      localStorage.setItem('accessToken', token)
      if (userStr) {
        try {
          const u = JSON.parse(userStr)
          localStorage.setItem('user', userStr)
          const authStorage = {
            state: {
              user: u,
              token: token,
              isAuthenticated: true
            },
            version: 0
          }
          localStorage.setItem('auth-storage', JSON.stringify(authStorage))
        } catch {
          // fallback
        }
      }
      localStorage.removeItem('transitops_impersonator_token')
      localStorage.removeItem('transitops_impersonator_user')
      
      window.location.href = '/admin/companies'
    }
  }

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md z-50 sticky top-0">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 animate-pulse flex-shrink-0" />
        <span>
          <strong>Impersonation Session Active:</strong> Viewing as <span className="underline font-bold">{user?.name}</span> ({user?.role?.replace('_', ' ')}) &bull; Tenant: <strong>{(user as any)?.company_name || 'Organization'}</strong>
        </span>
      </div>
      <Button 
        size="sm" 
        onClick={handleStopImpersonation}
        className="bg-black/30 hover:bg-black/50 text-white border-0 text-xs font-bold py-1 px-3 h-auto gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Exit Impersonation</span>
      </Button>
    </div>
  )
}
