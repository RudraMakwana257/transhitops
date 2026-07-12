import { ReactNode, useMemo, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T, index: number) => ReactNode
  accessor?: keyof T | string
  sortable?: boolean
  width?: string
  minWidth?: string
  maxWidth?: string
  align?: 'left' | 'center' | 'right'
  className?: string
  headerClassName?: string
  cellClassName?: string
  sticky?: boolean
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
  maxHeight?: string
  showVerticalScroll?: boolean
  stickyHeader?: boolean
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
  maxHeight = '60vh',
  showVerticalScroll = true,
  stickyHeader = true,
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

  const tableWrapperClass = clsx(
    'overflow-x-auto',
    showVerticalScroll && 'overflow-y-auto',
    maxHeight && `max-h-[${maxHeight}]`,
    'rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]',
    'data-table-wrapper scrollbar-thin'
  )

  const tableClass = clsx(
    'w-full border-collapse data-table',
    stickyHeader && 'sticky-table'
  )

  if (loading) {
    return (
      <div className={tableWrapperClass}>
        <table className={tableClass} role="grid">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className="data-table th" style={{ width: col.width, minWidth: col.minWidth, maxWidth: col.maxWidth }}>
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
                    <div className="h-5 bg-[var(--bg-hover)] animate-pulse rounded w-3/4" />
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
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg">
        <div className="w-14 h-14 text-[var(--text-muted)] mb-4" aria-hidden="true">
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
    <div className={tableWrapperClass}>
      <table className={tableClass} role="grid">
        <thead>
          <tr className={clsx(stickyHeader && 'sticky top-0 z-10 bg-[var(--bg-sidebar)]')}>
            {selection && (
              <th className="data-table th w-12" style={{ width: '3rem', minWidth: '3rem', maxWidth: '3rem' }}>
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary-light)] cursor-pointer"
                  checked={selection.selectedIds.length === sortedData.length && sortedData.length > 0}
                  indeterminate={selection.selectedIds.length > 0 && selection.selectedIds.length < sortedData.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      selection.onSelectionChange(sortedData.map(selection.getRowId))
                    } else {
                      selection.onSelectionChange([])
                    }
                  }}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                className={clsx('data-table th', col.headerClassName)}
                style={{ 
                  width: col.width, 
                  minWidth: col.minWidth,
                  maxWidth: col.maxWidth,
                  textAlign: col.align,
                  position: col.sticky ? 'sticky' : 'relative',
                  left: col.sticky ? 0 : undefined,
                  zIndex: col.sticky ? 10 : undefined,
                }}
                scope="col"
              >
                {col.sortable && sorting ? (
                  <button
                    onClick={() => sorting.onSort(col.accessor as string || col.key)}
                    className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors w-full"
                    aria-label={`Sort by ${col.header}`}
                  >
                    <span className="truncate">{col.header}</span>
                    {sorting.column === (col.accessor as string || col.key) && (
                      sorting.direction === 'asc' ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    )}
                  </button>
                ) : (
                  <span className="truncate block">{col.header}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-default)]/50">
          {sortedData.map((row, index) => {
            const rowId = getRowId(row)
            const isSelected = selection?.selectedIds.includes(rowId)
            const isHovered = hoveredId === rowId
            
            return (
              <tr
                key={rowId}
                className={clsx(
                  'transition-colors duration-100',
                  isSelected && 'bg-[var(--brand-primary-light)]',
                  isHovered && 'bg-[var(--bg-hover)]',
                  striped && index % 2 === 1 && 'bg-[var(--bg-sidebar)]/30',
                  onRowClick && 'cursor-pointer hover:bg-[var(--bg-hover)]',
                  rowClassName?.(row)
                )}
                onMouseEnter={() => setHoveredId(rowId)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onRowClick?.(row)}
              >
                {selection && (
                  <td className="data-table td w-12" style={{ width: '3rem', minWidth: '3rem', maxWidth: '3rem' }}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary-light)] cursor-pointer"
                      checked={isSelected}
                      onChange={(e) => {
                        const newSelection = e.target.checked
                          ? [...(selection.selectedIds || []), rowId]
                          : (selection.selectedIds || []).filter(id => id !== rowId)
                        selection.onSelectionChange(newSelection)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Select row"
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={clsx('data-table td', col.cellClassName)}
                    style={{ 
                      textAlign: col.align,
                      maxWidth: col.maxWidth,
                      overflow: col.maxWidth ? 'hidden' : undefined,
                      textOverflow: col.maxWidth ? 'ellipsis' : undefined,
                      whiteSpace: col.maxWidth ? 'nowrap' : undefined,
                    }}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2 py-3 border-t border-[var(--border-default)] bg-[var(--bg-sidebar)]/30">
          <div className="text-sm text-[var(--text-secondary)]">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
              className="form-input w-auto py-1.5 px-3 text-sm min-w-[140px]"
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
              <span className="px-3 text-sm text-[var(--text-secondary)] min-w-[80px] text-center">
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