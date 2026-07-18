import { create } from 'zustand'
import { toast } from '../store/toastStore'
import { api } from '../api/client'
import type { Trip, PaginatedResponse, ApiResponse } from '../types'

interface CreateTripInput {
  vehicle_id: string
  driver_id: string
  source: string
  destination: string
  cargo_weight_kg: number
  planned_distance_km?: number
  revenue: number
  notes?: string
}

interface UpdateTripInput {
  source?: string
  destination?: string
  cargo_weight_kg?: number
  planned_distance_km?: number
  revenue?: number
  notes?: string
}

interface CompleteTripInput {
  actual_distance_km: number
  end_odometer: number
  fuel_consumed_l?: number
}

interface TripState {
  trips: Trip[]
  selectedTrip: Trip | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
  fetchTrips: (params?: { page?: number; search?: string; status?: string; vehicle_id?: string; driver_id?: string; from_date?: string; to_date?: string; sort_by?: string; sort_order?: string; page_size?: number }) => Promise<void>
  fetchTrip: (id: string) => Promise<void>
  createTrip: (data: CreateTripInput) => Promise<void>
  updateTrip: (id: string, data: UpdateTripInput) => Promise<void>
  dispatchTrip: (id: string) => Promise<void>
  completeTrip: (id: string, data: CompleteTripInput) => Promise<void>
  cancelTrip: (id: string, reason: string) => Promise<void>
  clearSelected: () => void
  clearError: () => void
}

export const useTripStore = create<TripState>((set, get) => ({
  trips: [],
  selectedTrip: null,
  loading: false,
  error: null,
  pagination: { page: 1, page_size: 15, total: 0, total_pages: 0 },

  fetchTrips: async (params) => {
    set({ loading: true, error: null })
    try {
      const searchParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            searchParams.append(key, value.toString())
          }
        })
      }
      
      const res = await api.get<ApiResponse<PaginatedResponse<Trip>>>(`/trips?${searchParams.toString()}`)
      if (res.data.success) {
        set({ 
          trips: res.data.data.items, 
          pagination: {
            page: res.data.data.page,
            page_size: res.data.data.page_size,
            total: res.data.data.total,
            total_pages: res.data.data.total_pages
          },
          loading: false 
        })
      }
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to fetch trips', loading: false })
      throw err
    }
  },

  fetchTrip: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const res = await api.get<ApiResponse<Trip>>(`/trips/${id}`)
      if (res.data.success) {
        set({ selectedTrip: res.data.data, loading: false })
        toast('Trip updated successfully', 'success')
      }
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to fetch trip', loading: false })
      throw err
    }
  },

  createTrip: async (data) => {
    set({ loading: true, error: null })
    try {
      await api.post<ApiResponse<Trip>>('/trips', data)
      set({ loading: false })
      get().fetchTrips({ page: 1 })
      toast('Trip created successfully', 'success')
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to create trip', loading: false })
      throw err
    }
  },

  updateTrip: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const res = await api.put<ApiResponse<Trip>>(`/trips/${id}`, data)
      if (res.data.success) {
        set({ selectedTrip: res.data.data, loading: false })
      }
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to update trip', loading: false })
      throw err
    }
  },

  dispatchTrip: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await api.put<ApiResponse<Trip>>(`/trips/${id}/dispatch`, { confirm: true })
      if (res.data.success) {
        set({ selectedTrip: res.data.data, loading: false })
        get().fetchTrips({ page: get().pagination.page })
      toast('Trip deleted', 'success')
      }
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to dispatch trip', loading: false })
      throw err
    }
  },

  completeTrip: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const res = await api.put<ApiResponse<Trip>>(`/trips/${id}/complete`, data)
      if (res.data.success) {
        set({ selectedTrip: res.data.data, loading: false })
        get().fetchTrips({ page: get().pagination.page })
      }
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to complete trip', loading: false })
      throw err
    }
  },

  cancelTrip: async (id, reason) => {
    set({ loading: true, error: null })
    try {
      const res = await api.put<ApiResponse<Trip>>(`/trips/${id}/cancel`, { reason })
      if (res.data.success) {
        set({ selectedTrip: res.data.data, loading: false })
        get().fetchTrips({ page: get().pagination.page })
      }
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to cancel trip', loading: false })
      throw err
    }
  },

  clearSelected: () => set({ selectedTrip: null }),
  clearError: () => set({ error: null })
}))
