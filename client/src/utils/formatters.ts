export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-IN').format(value)
}

export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(date))
}

export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export const formatDistance = (km: number): string => {
  return `${formatNumber(km)} km`
}

export const formatWeight = (kg: number): string => {
  return `${formatNumber(kg)} kg`
}

export const formatFuelEfficiency = (kmpl: number): string => {
  return `${kmpl.toFixed(1)} km/L`
}

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`
}

export const CHART_COLORS = {
  primary: '#D98E04',
  success: '#22C55E',
  info: '#3B82F6',
  warning: '#F59E0B',
  danger: '#DC2626',
  muted: '#6B7280',
  series: ['#D98E04', '#22C55E', '#3B82F6', '#DC2626', '#F59E0B', '#6B7280'],
}

export const STATUS_COLORS: Record<string, string> = {
  Available: '#22C55E',
  'On Trip': '#3B82F6',
  'In Shop': '#F59E0B',
  Retired: '#6B7280',
  'Off Duty': '#6B7280',
  Suspended: '#DC2626',
  Draft: '#6B7280',
  Dispatched: '#3B82F6',
  Completed: '#22C55E',
  Cancelled: '#DC2626',
  Open: '#DC2626',
  'In Progress': '#F59E0B',
}

export const STATUS_BG: Record<string, string> = {
  Available: 'bg-green-100 dark:bg-green-900/30',
  'On Trip': 'bg-blue-100 dark:bg-blue-900/30',
  'In Shop': 'bg-amber-100 dark:bg-amber-900/30',
  Retired: 'bg-gray-100 dark:bg-gray-800',
  'Off Duty': 'bg-gray-100 dark:bg-gray-800',
  Suspended: 'bg-red-100 dark:bg-red-900/30',
  Draft: 'bg-gray-100 dark:bg-gray-800',
  Dispatched: 'bg-blue-100 dark:bg-blue-900/30',
  Completed: 'bg-green-100 dark:bg-green-900/30',
  Cancelled: 'bg-red-100 dark:bg-red-900/30',
  Open: 'bg-red-100 dark:bg-red-900/30',
  'In Progress': 'bg-amber-100 dark:bg-amber-900/30',
}

export const HEALTH_GRADE_COLORS: Record<string, string> = {
  Excellent: '#22C55E',
  Good: '#3B82F6',
  Fair: '#F59E0B',
  Poor: '#FB923C',
  Critical: '#DC2626',
}