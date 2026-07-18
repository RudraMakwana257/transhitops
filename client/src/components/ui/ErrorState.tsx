import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  message: string
  detail?: string
  onRetry?: () => void
}

export function ErrorState({ message, detail, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
      <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">{message}</h3>
      {detail && <p className="text-sm text-red-700/80 dark:text-red-400/80 max-w-md mb-6">{detail}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
