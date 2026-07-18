export type UserRole = 'fleet_manager' | 'dispatcher' | 'safety_officer' | 'financial_analyst' | 'super_admin'

export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired' | 'Reserved'
export type VehicleType = 'Truck' | 'Van' | 'Pickup' | 'Trailer' | 'Bus' | 'Tanker'

export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended' | 'On Leave'
export type LicenseCategory = 'LMV' | 'HMV' | 'HPMV' | 'Transport'

export type TripStatus = 'Draft' | 'Dispatched' | 'In Transit' | 'Completed' | 'Cancelled'
export type MaintenanceStatus = 'Open' | 'In Progress' | 'Completed' | 'Cancelled'
export type ExpenseType = 'Fuel' | 'Repair' | 'Tyre' | 'Insurance' | 'Permit' | 'Fine' | 'Toll' | 'Other'
export type HealthGrade = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Company {
  id: string
  name: string
  slug: string
  email: string
  phone?: string
  logo_url?: string
  is_active: boolean
  timezone: string
  currency: string
  vehicle_limit: number
  driver_limit: number
  user_limit: number
  created_at: string
}

export interface Vehicle {
  id: string
  company_id: string
  reg_number: string
  name: string
  type: string
  capacity_kg: number
  status: 'Available' | 'On Trip' | 'In Shop' | 'Retired' | 'Reserved'
  odometer_km: number
  acquisition_cost: number
  purchase_date?: string
  region?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Optional legacy fields that might still be used by UI components
  health_score?: number
  health_grade?: HealthGrade
}

export interface Driver {
  id: string
  company_id: string
  name: string
  license_number: string
  license_category: string
  license_expiry: string
  phone: string
  safety_score: number
  status: 'Available' | 'On Trip' | 'Off Duty' | 'Suspended' | 'On Leave'
  is_active: boolean
  created_at: string
  updated_at: string
  // Legacy UI fields
  is_license_expired?: boolean
  days_until_expiry?: number
}

export interface Trip {
  id: string
  company_id: string
  trip_number: string
  vehicle_id: string
  driver_id: string
  source: string
  destination: string
  status: 'Draft' | 'Dispatched' | 'In Transit' | 'Completed' | 'Cancelled'
  cargo_weight_kg: number
  planned_distance_km?: number
  actual_distance_km?: number
  revenue: number
  dispatched_at?: string
  completed_at?: string
  cancelled_at?: string
  created_at: string
  updated_at: string
  vehicle?: Vehicle
  driver?: Driver
  // Legacy fields
  start_odometer?: number | null
  end_odometer?: number | null
  fuel_consumed_l?: number | null
  notes?: string | null
}

export interface MaintenanceLog {
  id: string
  company_id: string
  vehicle_id: string
  type: string
  description?: string
  status: string
  cost: number
  technician?: string
  scheduled_date?: string
  completed_date?: string
  created_at: string
  vehicle?: Vehicle
  // Legacy fields
  odometer_at_service?: number | null
}

export interface FuelLog {
  id: string
  vehicle_id: string
  vehicle: Vehicle
  driver_id: string | null
  trip_id: string | null
  date: string
  liters: number
  price_per_liter: number
  total_cost: number
  odometer_reading: number | null
  fuel_station: string | null
  created_at: string
}

export interface Expense {
  id: string
  vehicle_id: string | null
  vehicle: { id: string; name: string; reg_number: string } | null
  trip_id: string | null
  trip: { id: string; trip_number: string } | null
  type: ExpenseType
  amount: number
  description: string | null
  date: string
  created_at: string
}

export interface DashboardKPIs {
  active_vehicles: number
  available_vehicles: number
  vehicles_in_shop: number
  active_trips: number
  pending_trips: number
  drivers_available: number
  fleet_utilization_pct: number
  fleet_health_score?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: {
    code: string
    details?: string
  }
}