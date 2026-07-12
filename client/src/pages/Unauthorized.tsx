import { Link } from 'react-router-dom'
import { Lock, Home, User, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function Unauthorized() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <Lock className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h1>
        <p className="text-[var(--text-secondary)] mb-6">
          You don't have permission to access this page. 
          Please contact your fleet manager if you believe this is an error.
        </p>
        
        <div className="space-y-3">
          <Button asChild variant="outline"><Link to="/dashboard"><Home className="w-4 h-4 mr-2" />Go to Dashboard</Link></Button>
          <Button asChild variant="outline"><Link to="/logout"><ArrowLeft className="w-4 h-4 mr-2" />Logout</Link></Button>
        </div>
        
        <div className="mt-8 p-4 rounded-lg bg-[var(--bg-sidebar)] border border-[var(--border-default)]">
          <p className="text-sm text-[var(--text-muted)]">
            <strong>Your Role:</strong> {localStorage.getItem('user_role')?.replace('_', ' ') || 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  )
}