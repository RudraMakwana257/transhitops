export function FuelTrendChart({ data }: { data: Array<{ date: string; total_cost: number }> }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No fuel data available</p>
  }
  const max = Math.max(...data.map(d => d.total_cost))
  return (
    <div className="space-y-1">
      {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 10)) === 0 || i === data.length - 1).map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-24 text-[var(--text-muted)] truncate">{new Date(d.date).toLocaleDateString()}</span>
          <div className="flex-1 h-4 rounded bg-[var(--border-default)] overflow-hidden">
            <div className="h-full rounded bg-[var(--brand-primary)]" style={{ width: `${(d.total_cost / max) * 100}%` }} />
          </div>
          <span className="w-16 text-right font-medium">₹{(d.total_cost).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}
