import { useMemo, useState } from 'react';
import type { ReactNode } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import {
  Table as ShadcnTable,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './table'

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
    'overflow-x-auto relative shadow-sm',
    showVerticalScroll && 'overflow-y-auto',
    maxHeight && `max-h-[${maxHeight}]`,
    'rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm',
    'scrollbar-thin transition-all duration-300'
  )

  if (loading) {
    return (
      <div className={tableWrapperClass}>
        <ShadcnTable>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={col.key} style={{ width: col.width, minWidth: col.minWidth, maxWidth: col.maxWidth }}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map(col => (
                  <TableCell key={col.key}>
                    <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </ShadcnTable>
      </div>
    )
  }

  if (sortedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-card border rounded-xl">
        <div className="w-14 h-14 text-muted-foreground mb-4" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor"/>
            <path d="M9 9h6M9 15h6M9 12h4" stroke="currentColor" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground">{emptyMessage}</h3>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    )
  }

  return (
    <div className={tableWrapperClass}>
      <ShadcnTable className="w-full caption-bottom text-sm border-collapse">
        <TableHeader className={clsx(stickyHeader && 'sticky top-0 z-10 bg-muted/60 backdrop-blur-md border-b border-border/50', 'text-muted-foreground')}>
          <TableRow className="border-b-0 hover:bg-transparent">
            {selection && (
              <TableHead className="w-12 px-4 py-3.5" style={{ width: '3rem', minWidth: '3rem', maxWidth: '3rem' }}>
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-input text-primary focus:ring-ring cursor-pointer"
                  checked={selection.selectedIds.length === sortedData.length && sortedData.length > 0}
                  {...({ indeterminate: selection.selectedIds.length > 0 && selection.selectedIds.length < sortedData.length } as any)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      selection.onSelectionChange(sortedData.map(selection.getRowId))
                    } else {
                      selection.onSelectionChange([])
                    }
                  }}
                  aria-label="Select all rows"
                />
              </TableHead>
            )}
            {columns.map(col => (
              <TableHead
                key={col.key}
                className={col.headerClassName}
                style={{ 
                  width: col.width, 
                  minWidth: col.minWidth,
                  maxWidth: col.maxWidth,
                  textAlign: col.align,
                  position: col.sticky ? 'sticky' : 'relative',
                  left: col.sticky ? 0 : undefined,
                  zIndex: col.sticky ? 10 : undefined,
                }}
              >
                {col.sortable && sorting ? (
                  <button
                    onClick={() => sorting.onSort(col.accessor as string || col.key)}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors w-full"
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
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, index) => {
            const rowId = getRowId(row)
            const isSelected = selection?.selectedIds.includes(rowId)
            const isHovered = hoveredId === rowId
            
            return (
              <TableRow
                key={rowId}
                className={clsx(
                  'border-b border-border/40 transition-colors duration-200',
                  isSelected && 'bg-primary/5',
                  isHovered && 'bg-muted/40 cursor-pointer',
                  striped && index % 2 === 1 && !isHovered && !isSelected && 'bg-muted/10',
                  rowClassName?.(row)
                )}
                onMouseEnter={() => setHoveredId(rowId)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onRowClick?.(row)}
              >
                {selection && (
                  <TableCell className="w-12" style={{ width: '3rem', minWidth: '3rem', maxWidth: '3rem' }}>
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-input text-primary focus:ring-ring cursor-pointer"
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
                  </TableCell>
                )}
                {columns.map(col => (
                  <TableCell
                    key={col.key}
                    className={col.cellClassName}
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
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </ShadcnTable>
      
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border/50 bg-card/40 rounded-b-xl">
          <div className="text-sm font-medium text-muted-foreground">
            Showing <span className="text-foreground">{(pagination.page - 1) * pagination.pageSize + 1}</span> to <span className="text-foreground">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> of <span className="text-foreground">{pagination.total}</span> results
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
              className="flex h-9 w-auto rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-w-[140px] hover:border-primary/50"
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
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
                aria-label="First page"
              >
                <ChevronUp className="w-4 h-4 -rotate-90" />
              </button>
              <button
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
                aria-label="Previous page"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
              <span className="px-3 text-sm text-muted-foreground min-w-[80px] text-center">
                Page {pagination.page} of {(pagination as any).totalPages}
              </span>
              <button
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page === (pagination as any).totalPages}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
                aria-label="Next page"
              >
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
              <button
                onClick={() => pagination.onPageChange((pagination as any).totalPages)}
                disabled={pagination.page === (pagination as any).totalPages}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
                aria-label="Last page"
              >
                <ChevronUp className="w-4 h-4 rotate-90" />
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}