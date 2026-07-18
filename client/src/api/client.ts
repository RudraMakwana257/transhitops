import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        
        const newToken = res.data.data.access_token
        useAuthStore.getState().setUser(useAuthStore.getState().user!, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        
        return api(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    if (error.response?.status === 403) {
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
