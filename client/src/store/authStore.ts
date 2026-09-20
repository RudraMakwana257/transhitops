import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '../types'
import api from '../api/client'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (companyName: string, name: string, email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (roles: UserRole[]) => boolean
  setUser: (user: User, token: string, refreshToken?: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const res = await api.post('/auth/login', { email, password })
          const data = res.data

          localStorage.setItem('accessToken', data.data.access_token)
          localStorage.setItem('user', JSON.stringify(data.data.user))
          set({ user: data.data.user, token: data.data.access_token, refreshToken: data.data.refresh_token, isAuthenticated: true })
        } catch (err: any) {
          const message = err.response?.data?.message || err.message || 'Login failed'
          throw new Error(message)
        }
      },

      register: async (companyName: string, name: string, email: string, password: string) => {
        try {
          const res = await api.post('/auth/register', { company_name: companyName, name, email, password })
          const data = res.data

          localStorage.setItem('accessToken', data.data.access_token)
          localStorage.setItem('user', JSON.stringify(data.data.user))
          set({ user: data.data.user, token: data.data.access_token, refreshToken: data.data.refresh_token, isAuthenticated: true })
        } catch (err: any) {
          const message = err.response?.data?.message || err.message || 'Registration failed'
          throw new Error(message)
        }
      },

      logout: () => {
        api.post('/auth/logout').catch(() => {})
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        localStorage.removeItem('transitops_impersonator_token')
        localStorage.removeItem('transitops_impersonator_user')
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
      },

      hasRole: (roles: UserRole[]) => {
        const { user } = get()
        return user ? roles.includes(user.role) : false
      },

      setUser: (user: User, token: string, refreshToken?: string) => {
        set((state) => ({
          user,
          token,
          refreshToken: refreshToken !== undefined ? refreshToken : state.refreshToken,
          isAuthenticated: true
        }))
      }
    }),
    { name: 'auth-storage', partialize: (state) => ({ user: state.user, token: state.token, refreshToken: state.refreshToken, isAuthenticated: state.isAuthenticated }) }
  )
)

export const useAuth = useAuthStore

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children)
}