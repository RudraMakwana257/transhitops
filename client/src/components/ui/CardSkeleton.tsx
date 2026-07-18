interface CardSkeletonProps {
  lines?: number
}

export function CardSkeleton({ lines = 6 }: CardSkeletonProps) {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full">
      <div className="space-y-4">
        {Array.from({ length: lines }).map((_, i) => {
          // Alternating widths: full, 3/4, full, 1/2, full, 3/4
          const widthClass = i % 2 === 0 ? (i % 4 === 0 ? 'w-full' : 'w-1/2') : 'w-3/4'
          return (
            <div 
              key={i} 
              className={`h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ${widthClass}`} 
            />
          )
        })}
      </div>
    </div>
  )
}
