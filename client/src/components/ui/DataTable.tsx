import { ReactNode, useMemo, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { Badge } from './Badge'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => ReactNode
  accessor?: keyof T | string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  emptyAction?: ReactNode
  onRowClick?: (row: T) => void
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (size: number) => void
  }
  sorting?: {
    column: string
    direction: 'asc' | 'desc'
    onSort: (column: string) => void
  }
  selection?: {
    selectedIds: string[]
    onSelectionChange: (ids: string[]) => void
    getRowId: (row: T) => string
  }
  rowClassName?: (row: T) => string
  striped?: boolean
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  emptyAction,
  onRowClick,
  pagination,
  sorting,
  selection,
  rowClassName,
  striped = true,
}: DataTableProps<T>) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const getRowId = (row: T) => row.id || JSON.stringify(row)
  
  const sortedData = useMemo(() => {
    if (!sorting) return data
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sorting.column]
      const bVal = (b as any)[sorting.column]
      if (aVal < bVal) return sorting.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sorting.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sorting])

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full" role="grid">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className="data-table th" style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key} className="data-table td">
                    <div className="h-4 bg-[var(--bg-hover)] animate-pulse rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (sortedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-12 h-12 text-[var(--text-muted)] mb-4" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor"/>
            <path d="M9 9h6M9 15h6M9 12h4" stroke="currentColor" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[var(--text-primary)]">{emptyMessage}</h3>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="grid">
        <thead>
          <tr className="sticky top-0 z-10">
            {selection && (
              <th className="data-table th w-12">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary-light)]"
                  checked={selection.selectedIds.length === sortedData.length && sortedData.length > 0}
                  indeterminate={selection.selectedIds.length > 0 && selection.selectedIds.length < sortedData.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      selection.onSelectionChange(sortedData.map(selection.getRowId))
                    } else {
                      selection.onSelectionChange([])
                    }
                  }}
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                className={clsx('data-table th', col.className)}
                style={{ width: col.width, textAlign: col.align }}
                scope="col"
              >
                {col.sortable && sorting ? (
                  <button
                    onClick={() => sorting.onSort(col.accessor as string || col.key)}
                    className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
                    aria-label={`Sort by ${col.header}`}
                  >
                    <span>{col.header}</span>
                    {sorting.column === (col.accessor as string || col.key) && (
                      sorting.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => {
            const rowId = getRowId(row)
            const isSelected = selection?.selectedIds.includes(rowId)
            const isHovered = hoveredId === rowId
            
            return (
              <tr
                key={rowId}
                className={clsx(
                  'transition-colors',
                  isSelected && 'bg-[var(--brand-primary-light)]',
                  isHovered && 'bg-[var(--bg-hover)]',
                  striped && index % 2 === 1 && 'bg-[var(--bg-sidebar)]/50',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row)
                )}
                onMouseEnter={() => setHoveredId(rowId)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onRowClick?.(row)}
              >
                {selection && (
                  <td className="data-table td w-12">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary-light)]"
                      checked={isSelected}
                      onChange={(e) => {
                        const newSelection = e.target.checked
                          ? [...(selection.selectedIds || []), rowId]
                          : (selection.selectedIds || []).filter(id => id !== rowId)
                        selection.onSelectionChange(newSelection)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={clsx('data-table td', col.className)}
                    style={{ textAlign: col.align }}
                  >
                    {col.render 
                      ? col.render(row, index)
                      : col.accessor
                        ? String((row as any)[col.accessor] ?? '')
                        : ''
                    }
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
          <div className="text-sm text-[var(--text-secondary)]">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
              className="form-input w-auto py-1.5 text-sm"
              aria-label="Rows per page"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
            <nav className="flex items-center gap-1" aria-label="Pagination">
              <button
                onClick={() => pagination.onPageChange(1)}
                disabled={pagination.page === 1}
                className="btn-secondary p-1.5"
                aria-label="First page"
              >
                <ChevronUp className="w-4 h-4 rotate-90" />
              </button>
              <button
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn-secondary p-1.5"
                aria-label="Previous page"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm text-[var(--text-secondary)]">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="btn-secondary p-1.5"
                aria-label="Next page"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => pagination.onPageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                className="btn-secondary p-1.5"
                aria-label="Last page"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}