import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${refreshToken}`
          }
        })
        const newToken = data.data.access_token
        useAuthStore.getState().setUser(useAuthStore.getState().user!, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('auth-storage')
        useAuthStore.getState().logout()
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }

    if (error.response?.status === 403) {
      const message = error.response?.data?.message?.toLowerCase() || ''
      if (message.includes('suspended')) {
        window.location.href = '/suspended'
      }
    }

    return Promise.reject(error)
  }
)

// -- Type Definitions --
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// -- API Methods --
export const adminApi = {
  // Companies
  getCompanies: async (params?: { page?: number; page_size?: number; search?: string }) => {
    const res = await api.get<ApiResponse<PaginatedData<any>>>('/admin/companies', { params })
    return res.data
  },
  getCompany: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/admin/companies/${id}`)
    return res.data
  },
  createCompany: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/admin/companies', data)
    return res.data
  },
  updateCompany: async (id: string, data: any) => {
    const res = await api.put<ApiResponse<any>>(`/admin/companies/${id}`, data)
    return res.data
  },
  suspendCompany: async (id: string) => {
    const res = await api.post<ApiResponse<any>>(`/admin/companies/${id}/suspend`)
    return res.data
  },
  activateCompany: async (id: string) => {
    const res = await api.post<ApiResponse<any>>(`/admin/companies/${id}/activate`)
    return res.data
  },
  deleteCompany: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/admin/companies/${id}`)
    return res.data
  },

  // Plans
  getPlans: async () => {
    const res = await api.get<ApiResponse<any[]>>('/admin/plans')
    return res.data
  },
  createPlan: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/admin/plans', data)
    return res.data
  },
  updatePlan: async (id: string, data: any) => {
    const res = await api.put<ApiResponse<any>>(`/admin/plans/${id}`, data)
    return res.data
  },
  assignPlanToCompany: async (planId: string, companyId: string) => {
    const res = await api.post<ApiResponse<any>>(`/admin/plans/${planId}/assign/${companyId}`)
    return res.data
  },

  // Features
  getCompanyFeatures: async (companyId: string) => {
    const res = await api.get<ApiResponse<Record<string, boolean>>>(`/admin/companies/${companyId}/features`)
    return res.data
  },
  updateCompanyFeatures: async (companyId: string, features: Record<string, boolean>) => {
    const res = await api.put<ApiResponse<any>>(`/admin/companies/${companyId}/features`, { features })
    return res.data
  },

  // Users
  getUsers: async (params?: { page?: number; page_size?: number; search?: string; company_id?: string; role?: string; is_active?: string }) => {
    const res = await api.get<ApiResponse<PaginatedData<any>>>('/admin/users', { params })
    return res.data
  },
  getUser: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/admin/users/${id}`)
    return res.data
  },
  createUser: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/admin/users', data)
    return res.data
  },
  updateUser: async (id: string, data: any) => {
    const res = await api.put<ApiResponse<any>>(`/admin/users/${id}`, data)
    return res.data
  },
  deleteUser: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/admin/users/${id}`)
    return res.data
  },
  resetUserPassword: async (id: string, data?: { password?: string }) => {
    const res = await api.post<ApiResponse<any>>(`/admin/users/${id}/reset-password`, data || {})
    return res.data
  },
  createCompanyUser: async (companyId: string, data: any) => {
    const res = await api.post<ApiResponse<any>>(`/admin/companies/${companyId}/users`, data)
    return res.data
  },

  // Vehicles
  getVehicles: async (params?: { page?: number; page_size?: number; search?: string; company_id?: string; status?: string; type?: string; region?: string }) => {
    const res = await api.get<ApiResponse<PaginatedData<any>>>('/admin/vehicles', { params })
    return res.data
  },
  getVehicle: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/admin/vehicles/${id}`)
    return res.data
  },
  createVehicle: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/admin/vehicles', data)
    return res.data
  },
  updateVehicle: async (id: string, data: any) => {
    const res = await api.put<ApiResponse<any>>(`/admin/vehicles/${id}`, data)
    return res.data
  },
  deleteVehicle: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/admin/vehicles/${id}`)
    return res.data
  },

  // Drivers
  getDrivers: async (params?: { page?: number; page_size?: number; search?: string; company_id?: string; status?: string; category?: string }) => {
    const res = await api.get<ApiResponse<PaginatedData<any>>>('/admin/drivers', { params })
    return res.data
  },
  getDriver: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/admin/drivers/${id}`)
    return res.data
  },
  createDriver: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/admin/drivers', data)
    return res.data
  },
  updateDriver: async (id: string, data: any) => {
    const res = await api.put<ApiResponse<any>>(`/admin/drivers/${id}`, data)
    return res.data
  },
  deleteDriver: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/admin/drivers/${id}`)
    return res.data
  },

  // Trips
  getTrips: async (params?: { page?: number; page_size?: number; search?: string; company_id?: string; status?: string }) => {
    const res = await api.get<ApiResponse<PaginatedData<any>>>('/admin/trips', { params })
    return res.data
  },
  getTrip: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/admin/trips/${id}`)
    return res.data
  },
  createTrip: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/admin/trips', data)
    return res.data
  },
  updateTrip: async (id: string, data: any) => {
    const res = await api.put<ApiResponse<any>>(`/admin/trips/${id}`, data)
    return res.data
  },
  deleteTrip: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/admin/trips/${id}`)
    return res.data
  },

  // Maintenance
  getMaintenanceLogs: async (params?: { page?: number; page_size?: number; search?: string; company_id?: string; status?: string; type?: string }) => {
    const res = await api.get<ApiResponse<PaginatedData<any>>>('/admin/maintenance', { params })
    return res.data
  },
  getMaintenanceLog: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/admin/maintenance/${id}`)
    return res.data
  },
  createMaintenanceLog: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/admin/maintenance', data)
    return res.data
  },
  updateMaintenanceLog: async (id: string, data: any) => {
    const res = await api.put<ApiResponse<any>>(`/admin/maintenance/${id}`, data)
    return res.data
  },
  deleteMaintenanceLog: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/admin/maintenance/${id}`)
    return res.data
  },

  // Fuel
  getFuelLogs: async (params?: { page?: number; page_size?: number; search?: string; company_id?: string }) => {
    const res = await api.get<ApiResponse<PaginatedData<any>>>('/admin/fuel', { params })
    return res.data
  },
  getFuelLog: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/admin/fuel/${id}`)
    return res.data
  },
  createFuelLog: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/admin/fuel', data)
    return res.data
  },
  updateFuelLog: async (id: string, data: any) => {
    const res = await api.put<ApiResponse<any>>(`/admin/fuel/${id}`, data)
    return res.data
  },
  deleteFuelLog: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/admin/fuel/${id}`)
    return res.data
  },

  // Expenses
  getExpenses: async (params?: { page?: number; page_size?: number; search?: string; company_id?: string; type?: string }) => {
    const res = await api.get<ApiResponse<PaginatedData<any>>>('/admin/expenses', { params })
    return res.data
  },
  getExpense: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/admin/expenses/${id}`)
    return res.data
  },
  createExpense: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/admin/expenses', data)
    return res.data
  },
  updateExpense: async (id: string, data: any) => {
    const res = await api.put<ApiResponse<any>>(`/admin/expenses/${id}`, data)
    return res.data
  },
  deleteExpense: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/admin/expenses/${id}`)
    return res.data
  },

  // Payments & Manual Billing
  getPayments: async (params?: { company_id?: string; status?: string; payment_method?: string; page?: number; per_page?: number }) => {
    const res = await api.get<ApiResponse<any>>('/admin/payments', { params })
    return res.data
  },
  recordPayment: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/admin/payments', data)
    return res.data
  },
  reversePayment: async (id: string, reason?: string) => {
    const res = await api.post<ApiResponse<any>>(`/admin/payments/${id}/reverse`, { reason })
    return res.data
  },

  // Audit Logs & Diagnostics
  getAuditLogs: async (params?: { page?: number; page_size?: number; company_id?: string; action?: string; entity_type?: string }) => {
    const res = await api.get<ApiResponse<PaginatedData<any>>>('/admin/audit-logs', { params })
    return res.data
  },
  getLoginAttempts: async (params?: { page?: number; page_size?: number; email?: string }) => {
    const res = await api.get<ApiResponse<PaginatedData<any>>>('/admin/login-attempts', { params })
    return res.data
  },
  getExceptions: async (params?: { page?: number; page_size?: number; company_id?: string }) => {
    const res = await api.get<ApiResponse<PaginatedData<any>>>('/admin/exceptions', { params })
    return res.data
  },
  getDatabaseStats: async () => {
    const res = await api.get<ApiResponse<any>>('/admin/system/database-stats')
    return res.data
  },

  // Impersonation
  impersonate: async (data: { company_id?: string; user_id?: string }) => {
    const res = await api.post<ApiResponse<any>>('/admin/impersonate', data)
    return res.data
  },
  stopImpersonation: async () => {
    const res = await api.post<ApiResponse<any>>('/admin/stop-impersonation')
    return res.data
  },

  // Announcements
  getAnnouncements: async () => {
    const res = await api.get<ApiResponse<any[]>>('/admin/announcements')
    return res.data
  },
  createAnnouncement: async (data: any) => {
    const res = await api.post<ApiResponse<any>>('/admin/announcements', data)
    return res.data
  },
  deleteAnnouncement: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/admin/announcements/${id}`)
    return res.data
  },

  // Global Feature Flags
  getFeatureFlags: async () => {
    const res = await api.get<ApiResponse<any>>('/admin/feature-flags')
    return res.data
  },
  updateFeatureFlag: async (key: string, data: any) => {
    const res = await api.put<ApiResponse<any>>(`/admin/feature-flags/${key}`, data)
    return res.data
  },

  // Platform Settings
  getPlatformSettings: async () => {
    const res = await api.get<ApiResponse<any>>('/admin/platform-settings')
    return res.data
  },
  updatePlatformSettings: async (data: any) => {
    const res = await api.put<ApiResponse<any>>('/admin/platform-settings', data)
    return res.data
  },

  // Dashboard
  getDashboardStats: async () => {
    const res = await api.get<ApiResponse<any>>('/admin/dashboard')
    return res.data
  }
}


declare module 'axios' {
  export interface AxiosInstance {
    fuel: {
      list: (params?: Record<string, unknown>) => Promise<any>
      create: (data: Record<string, unknown>) => Promise<any>
      update: (id: string, data: Record<string, unknown>) => Promise<any>
      delete: (id: string) => Promise<any>
    }
    expenses: {
      list: (params?: Record<string, unknown>) => Promise<any>
      create: (data: Record<string, unknown>) => Promise<any>
      update: (id: string, data: Record<string, unknown>) => Promise<any>
      delete: (id: string) => Promise<any>
    }
    maintenance: {
      list: (params?: Record<string, unknown>) => Promise<any>
      create: (data: Record<string, unknown>) => Promise<any>
      update: (id: string, data: Record<string, unknown>) => Promise<any>
      getById: (id: string) => Promise<any>
    }
    dashboard: {
      getStats: () => Promise<any>
    }
    analytics: {
      getOverview: (params?: Record<string, unknown>) => Promise<any>
      getFleetStats: (params?: Record<string, unknown>) => Promise<any>
      getFuelTrends: (params?: Record<string, unknown>) => Promise<any>
    }
    settings: {
      getUsers: (params?: Record<string, unknown>) => Promise<any>
      createUser: (data: Record<string, unknown>) => Promise<any>
      updateUser: (id: string, data: Record<string, unknown>) => Promise<any>
      deleteUser: (id: string) => Promise<any>
    }
    notifications: {
      list: () => Promise<any>
      markRead: (id: string) => Promise<any>
      markAllRead: () => Promise<any>
    }
  }
}

Object.assign(api, {
  fuel: {
    list: async (params?: Record<string, unknown>) => (await api.get('/fuel', { params })).data,
    create: async (data: Record<string, unknown>) => (await api.post('/fuel', data)).data,
    update: async (id: string, data: Record<string, unknown>) => (await api.put(`/fuel/${id}`, data)).data,
    delete: async (id: string) => (await api.delete(`/fuel/${id}`)).data
  },
  expenses: {
    list: async (params?: Record<string, unknown>) => (await api.get('/expenses', { params })).data,
    create: async (data: Record<string, unknown>) => (await api.post('/expenses', data)).data,
    update: async (id: string, data: Record<string, unknown>) => (await api.put(`/expenses/${id}`, data)).data,
    delete: async (id: string) => (await api.delete(`/expenses/${id}`)).data
  },
  maintenance: {
    list: async (params?: Record<string, unknown>) => (await api.get('/maintenance', { params })).data,
    create: async (data: Record<string, unknown>) => (await api.post('/maintenance', data)).data,
    update: async (id: string, data: Record<string, unknown>) => (await api.put(`/maintenance/${id}`, data)).data,
    getById: async (id: string) => (await api.get(`/maintenance/${id}`)).data
  },
  dashboard: {
    getStats: async () => (await api.get('/dashboard/stats')).data
  },
  analytics: {
    getOverview: async (params?: Record<string, unknown>) => (await api.get('/analytics/overview', { params })).data,
    getFleetStats: async (params?: Record<string, unknown>) => (await api.get('/analytics/fleet', { params })).data,
    getFuelTrends: async (params?: Record<string, unknown>) => (await api.get('/analytics/fuel', { params })).data
  },
  settings: {
    getUsers: async (params?: Record<string, unknown>) => (await api.get('/users', { params })).data,
    createUser: async (data: Record<string, unknown>) => (await api.post('/users', data)).data,
    updateUser: async (id: string, data: Record<string, unknown>) => (await api.put(`/users/${id}`, data)).data,
    deleteUser: async (id: string) => (await api.delete(`/users/${id}`)).data
  },
  notifications: {
    list: async () => (await api.get('/notifications')).data,
    markRead: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    markAllRead: async () => (await api.patch('/notifications/read-all')).data
  }
});
