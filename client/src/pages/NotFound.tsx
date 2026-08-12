import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'

export function NotFound() {
  return (
    <div className="min-h-[450px] flex items-center justify-center p-6 text-center">
      <div className="max-w-md flex flex-col items-center space-y-4">
        <div className="p-4 bg-slate-100 dark:bg-slate-800/60 rounded-full">
          <FileQuestion className="w-10 h-10 text-slate-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Page Not Found</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The page or resource you are looking for does not exist or has been moved.
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  )
}
