import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

import { toast } from '../store/toastStore'

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        if (!refreshToken) throw new Error('No refresh token')
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        )

        const newToken = res.data.data.access_token
        useAuthStore.getState().setUser(useAuthStore.getState().user!, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`

        return api(originalRequest)
      } catch (refreshError) {
        // Clear persisted auth state BEFORE navigating
        try { localStorage.removeItem('auth-storage') } catch (_) {}
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    if (error.response?.status === 403) {
      toast('You do not have permission to perform this action.', 'error')
      return Promise.reject(error)
    }

    if (error.response?.status === 429) {
      toast('Too many requests. Please wait a moment before trying again.', 'error')
      return Promise.reject(error)
    }

    if (error.response?.status >= 500) {
      toast('Server error encountered. Please try again later.', 'error')
      return Promise.reject(error)
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      toast('Request timed out. Please check your network connection.', 'error')
      return Promise.reject(error)
    }

    if (!error.response && error.request) {
      toast('Network connection failed. Please check your connection.', 'error')
      return Promise.reject(error)
    }
    
    return Promise.reject(error)
  }
)

export { api }

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
    exceptions: {
      list: (params?: Record<string, unknown>) => Promise<any>
      getSummary: () => Promise<any>
      getById: (id: string) => Promise<any>
      triggerDetect: () => Promise<any>
      acknowledge: (id: string) => Promise<any>
      resolve: (id: string, note?: string) => Promise<any>
      dismiss: (id: string, note?: string) => Promise<any>
    }
    subscription: {
      getUsage: () => Promise<any>
      getEntitlements: () => Promise<any>
      listPlans: () => Promise<any>
      changePlan: (planIdentifier: string) => Promise<any>
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
    getUsers: async (params?: Record<string, unknown>) => (await api.get('/settings/users', { params })).data,
    createUser: async (data: Record<string, unknown>) => (await api.post('/settings/users', data)).data,
    updateUser: async (id: string, data: Record<string, unknown>) => (await api.put(`/settings/users/${id}`, data)).data,
    deleteUser: async (id: string) => (await api.delete(`/settings/users/${id}`)).data
  },
  notifications: {
    list: async () => (await api.get('/notifications')).data,
    markRead: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    markAllRead: async () => (await api.patch('/notifications/read-all')).data
  },
  exceptions: {
    list: async (params?: Record<string, unknown>) => (await api.get('/exceptions', { params })).data,
    getSummary: async () => (await api.get('/exceptions/summary')).data,
    getById: async (id: string) => (await api.get(`/exceptions/${id}`)).data,
    triggerDetect: async () => (await api.post('/exceptions/detect')).data,
    acknowledge: async (id: string) => (await api.post(`/exceptions/${id}/acknowledge`)).data,
    resolve: async (id: string, note?: string) => (await api.post(`/exceptions/${id}/resolve`, { resolution_note: note })).data,
    dismiss: async (id: string, note?: string) => (await api.post(`/exceptions/${id}/dismiss`, { resolution_note: note })).data,
  },
  subscription: {
    getUsage: async () => (await api.get('/subscription/usage')).data,
    getEntitlements: async () => (await api.get('/subscription/entitlements')).data,
    listPlans: async () => (await api.get('/subscription/plans')).data,
    changePlan: async (planIdentifier: string) => (await api.post('/subscription/change-plan', { plan_slug: planIdentifier })).data,
  }
});
