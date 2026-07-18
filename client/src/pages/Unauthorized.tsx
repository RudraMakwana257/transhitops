import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { Lock, Home, ArrowLeft } from 'lucide-react'
import { useAuth } from '../store/authStore'

export function Unauthorized() {
  const navigate = useNavigate()
  const { logout } = useAuth()
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
          <Link to="/dashboard" className="btn-secondary inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-lg"><Home className="w-4 h-4 mr-2" />Go to Dashboard</Link>
          <button onClick={() => { logout(); navigate('/login') }} className="btn-secondary inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-lg"><ArrowLeft className="w-4 h-4 mr-2" />Logout</button>
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