export type UserRole = 'fleet_manager' | 'dispatcher' | 'safety_officer' | 'financial_analyst'

export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired'
export type VehicleType = 'Truck' | 'Van' | 'Pickup' | 'Trailer' | 'Bus' | 'Tanker'

export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended'
export type LicenseCategory = 'LMV' | 'HMV' | 'HPMV' | 'Transport'

export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled'
export type MaintenanceStatus = 'Open' | 'In Progress' | 'Completed'
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

export interface Vehicle {
  id: string
  reg_number: string
  name: string
  type: VehicleType
  capacity_kg: number
  acquisition_cost: number
  odometer_km: number
  purchase_date: string | null
  status: VehicleStatus
  region: string
  health_score?: number
  health_grade?: HealthGrade
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  name: string
  license_number: string
  license_category: LicenseCategory
  license_expiry: string
  phone: string
  safety_score: number
  status: DriverStatus
  is_active: boolean
  is_license_expired: boolean
  days_until_expiry: number
  created_at: string
}

export interface Trip {
  id: string
  trip_number: string
  vehicle_id: string
  vehicle: Vehicle
  driver_id: string
  driver: Driver
  source: string
  destination: string
  cargo_weight_kg: number
  planned_distance_km: number | null
  actual_distance_km: number | null
  status: TripStatus
  start_odometer: number | null
  end_odometer: number | null
  fuel_consumed_l: number | null
  revenue: number
  notes: string | null
  dispatched_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
}

export interface MaintenanceLog {
  id: string
  vehicle_id: string
  vehicle: Vehicle
  type: string
  description: string
  status: MaintenanceStatus
  cost: number
  technician: string
  scheduled_date: string
  completed_date: string | null
  odometer_at_service: number | null
  created_at: string
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
  trip_id: string | null
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

export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
  error?: {
    code: string
    details?: string
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}