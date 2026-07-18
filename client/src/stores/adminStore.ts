import { create } from 'zustand'
import { adminApi } from '../api'
import type { PaginatedData } from '../api'

// @ts-ignore
type Any = any;

interface AdminState {
  companies: PaginatedData<any> | null
  selectedCompany: Any | null
  plans: Any[]
  dashboardStats: Any | null
  loading: boolean
  error: string | null
  
  fetchDashboardStats: () => Promise<void>
  fetchCompanies: (params?: { page?: number; page_size?: number; search?: string }) => Promise<void>
  fetchCompany: (id: string) => Promise<void>
  fetchPlans: () => Promise<void>
  
  createCompany: (data: Any) => Promise<any>
  updateCompany: (id: string, data: Any) => Promise<void>
  suspendCompany: (id: string) => Promise<void>
  activateCompany: (id: string) => Promise<void>
  deleteCompany: (id: string) => Promise<void>
  
  createPlan: (data: Any) => Promise<void>
  updatePlan: (id: string, data: Any) => Promise<void>
  assignPlan: (planId: string, companyId: string) => Promise<void>
}

export const useAdminStore = create<AdminState>((set, get) => ({
  companies: null,
  selectedCompany: null,
  plans: [],
  dashboardStats: null,
  loading: false,
  error: null,

  fetchDashboardStats: async () => {
    set({ loading: true, error: null })
    try {
      const res = await adminApi.getDashboardStats()
      set({ dashboardStats: res.data, loading: false })
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
    }
  },

  fetchCompanies: async (params) => {
    set({ loading: true, error: null })
    try {
      const res = await adminApi.getCompanies(params)
      set({ companies: res.data, loading: false })
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
    }
  },

  fetchCompany: async (id) => {
    set({ loading: true, error: null })
    try {
      const res = await adminApi.getCompany(id)
      set({ selectedCompany: res.data, loading: false })
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
    }
  },

  fetchPlans: async () => {
    set({ loading: true, error: null })
    try {
      const res = await adminApi.getPlans()
      set({ plans: res.data, loading: false })
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
    }
  },

  createCompany: async (data) => {
    set({ loading: true, error: null })
    try {
      const res = await adminApi.createCompany(data)
      set({ loading: false })
      return res.data
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
      throw error
    }
  },

  updateCompany: async (id, data) => {
    set({ loading: true, error: null })
    try {
      await adminApi.updateCompany(id, data)
      await get().fetchCompany(id)
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
      throw error
    }
  },

  suspendCompany: async (id) => {
    set({ loading: true, error: null })
    try {
      await adminApi.suspendCompany(id)
      await get().fetchCompany(id)
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
      throw error
    }
  },

  activateCompany: async (id) => {
    set({ loading: true, error: null })
    try {
      await adminApi.activateCompany(id)
      await get().fetchCompany(id)
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
      throw error
    }
  },

  deleteCompany: async (id) => {
    set({ loading: true, error: null })
    try {
      await adminApi.deleteCompany(id)
      await get().fetchCompany(id)
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
      throw error
    }
  },

  createPlan: async (data) => {
    set({ loading: true, error: null })
    try {
      await adminApi.createPlan(data)
      await get().fetchPlans()
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
      throw error
    }
  },

  updatePlan: async (id, data) => {
    set({ loading: true, error: null })
    try {
      await adminApi.updatePlan(id, data)
      await get().fetchPlans()
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
      throw error
    }
  },

  assignPlan: async (planId, companyId) => {
    set({ loading: true, error: null })
    try {
      await adminApi.assignPlanToCompany(planId, companyId)
      await get().fetchCompany(companyId)
    } catch (error) {
      set({ error: (error as Any).message, loading: false })
      throw error
    }
  }
}))
