import { create } from 'zustand'
import { toast } from '../store/toastStore'
import { api } from '../api/client'
import type { Driver, PaginatedResponse, ApiResponse } from '../types'

interface CreateDriverInput {
  name: string
  license_number: string
  license_category: string
  license_expiry: string
  phone: string
  status: string
  safety_score: number
}

interface UpdateDriverInput extends Partial<CreateDriverInput> {
  is_active?: boolean
}

interface DriverState {
  drivers: Driver[]
  selectedDriver: Driver | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
  fetchDrivers: (params?: { page?: number; search?: string; status?: string; sort_by?: string; sort_order?: string; page_size?: number }) => Promise<void>
  fetchDriver: (id: string) => Promise<void>
  createDriver: (data: CreateDriverInput) => Promise<void>
  updateDriver: (id: string, data: UpdateDriverInput) => Promise<void>
  deleteDriver: (id: string) => Promise<void>
  clearSelected: () => void
  clearError: () => void
}

export const useDriverStore = create<DriverState>((set, get) => ({
  drivers: [],
  selectedDriver: null,
  loading: false,
  error: null,
  pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 },

  fetchDrivers: async (params) => {
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
      
      const res = await api.get<ApiResponse<PaginatedResponse<Driver>>>(`/drivers?${searchParams.toString()}`)
      if (res.data.success) {
        set({ 
          drivers: res.data.data.items, 
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
      set({ error: (err as any).response?.data?.message || 'Failed to fetch drivers', loading: false })
      throw err
    }
  },

  fetchDriver: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const res = await api.get<ApiResponse<Driver>>(`/drivers/${id}`)
      if (res.data.success) {
        set({ selectedDriver: res.data.data, loading: false })
      }
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to fetch driver', loading: false })
      throw err
    }
  },

  createDriver: async (data) => {
    set({ loading: true, error: null })
    try {
      await api.post<ApiResponse<Driver>>('/drivers', data)
      set({ loading: false })
      get().fetchDrivers({ page: 1 })
      toast('Driver created successfully', 'success')
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to create driver', loading: false })
      throw err
    }
  },

  updateDriver: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const res = await api.put<ApiResponse<Driver>>(`/drivers/${id}`, data)
      if (res.data.success) {
        set({ selectedDriver: res.data.data, loading: false })
        toast('Driver updated successfully', 'success')
      }
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to update driver', loading: false })
      throw err
    }
  },

  deleteDriver: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/drivers/${id}`)
      set({ loading: false })
      get().fetchDrivers({ page: get().pagination.page })
      toast('Driver deleted', 'success')
    } catch (err) {
      set({ error: (err as any).response?.data?.message || 'Failed to delete driver', loading: false })
      throw err
    }
  },

  clearSelected: () => set({ selectedDriver: null }),
  clearError: () => set({ error: null })
}))
