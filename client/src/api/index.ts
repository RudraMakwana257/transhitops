import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token') // We'll assume the authStore persists token to localStorage or we can read it directly.
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
        // Attempt refresh
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('refresh_token')}`
          }
        })
        localStorage.setItem('token', data.data.access_token)
        originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
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
  createCompanyUser: async (companyId: string, data: any) => {
    const res = await api.post<ApiResponse<any>>(`/admin/companies/${companyId}/users`, data)
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
