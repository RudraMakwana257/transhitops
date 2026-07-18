import { Link } from 'react-router-dom'
import { Ban, Mail } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export function Suspended() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <Ban className="w-8 h-8 text-red-600" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Account Suspended</h1>
          <p className="text-slate-500 mt-2">
            Your organization's account has been suspended by the platform administrator. 
            Access to TransitOps is currently disabled.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600">
            If you believe this is an error or wish to restore access, please contact support.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button className="w-full gap-2 bg-slate-900 hover:bg-slate-800" onClick={() => window.location.href = 'mailto:support@transitops.com'}>
            <Mail className="w-4 h-4" />
            Contact Support
          </Button>
          <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-slate-700">
            &larr; Back to Login
          </Link>
        </div>
      </Card>
    </div>
  )
}
