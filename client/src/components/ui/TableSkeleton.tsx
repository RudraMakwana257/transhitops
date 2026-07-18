interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-4 font-medium">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/25">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-full"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
