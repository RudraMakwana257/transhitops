import { create } from 'zustand'
import { toast } from '../store/toastStore'
import { api } from '../api/client'
import type { Vehicle, PaginatedResponse, ApiResponse } from '../types'

interface CreateVehicleInput {
  reg_number: string
  name: string
  type: string
  capacity_kg: number
  status: string
  odometer_km: number
  acquisition_cost: number
  purchase_date?: string
  region?: string
}

interface UpdateVehicleInput extends Partial<CreateVehicleInput> {
  is_active?: boolean
}

interface VehicleState {
  vehicles: Vehicle[]
  selectedVehicle: Vehicle | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
  fetchVehicles: (params?: { page?: number; search?: string; status?: string; type?: string; region?: string; sort_by?: string; sort_order?: string; page_size?: number }) => Promise<void>
  fetchVehicle: (id: string) => Promise<void>
  createVehicle: (data: CreateVehicleInput) => Promise<void>
  updateVehicle: (id: string, data: UpdateVehicleInput) => Promise<void>
  deleteVehicle: (id: string) => Promise<void>
  clearSelected: () => void
  clearError: () => void
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  loading: false,
  error: null,
  pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 },

  fetchVehicles: async (params) => {
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
      
      const res = await api.get<ApiResponse<PaginatedResponse<Vehicle>>>(`/vehicles?${searchParams.toString()}`)
      if (res.data.success) {
        set({ 
          vehicles: res.data.data.items, 
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
      set({ error: (err as any).response?.data?.message || 'Failed to fetch vehicles', loading: false })
      throw err
    }
  },

  fetchVehicle: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const res = await api.get<ApiResponse<Vehicle>>(`/vehicles/${id}`)
      if (res.data.success) {
        set({ selectedVehicle: res.data.data, loading: false })
        toast('Vehicle updated successfully', 'success')
      }
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to fetch vehicle', loading: false })
      throw err
    }
  },

  createVehicle: async (data) => {
    set({ loading: true, error: null })
    try {
      await api.post<ApiResponse<Vehicle>>('/vehicles', data)
      set({ loading: false })
      // Optionally refresh list
      get().fetchVehicles({ page: 1 })
      toast('Vehicle created successfully', 'success')
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to create vehicle', loading: false })
      throw err
    }
  },

  updateVehicle: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const res = await api.put<ApiResponse<Vehicle>>(`/vehicles/${id}`, data)
      if (res.data.success) {
        set({ selectedVehicle: res.data.data, loading: false })
      }
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to update vehicle', loading: false })
      throw err
    }
  },

  deleteVehicle: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/vehicles/${id}`)
      set({ loading: false })
      get().fetchVehicles({ page: get().pagination.page })
      toast('Vehicle deleted', 'success')
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to delete vehicle', loading: false })
      throw err
    }
  },

  clearSelected: () => set({ selectedVehicle: null }),
  clearError: () => set({ error: null })
}))
