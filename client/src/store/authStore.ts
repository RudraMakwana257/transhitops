import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (roles: UserRole[]) => boolean
  setUser: (user: User, token: string) => void
}

export const useAuthStore = create<AuthState>()(

  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.message || 'Login failed')
        }

        set({ user: data.data.user, token: data.data.access_token, refreshToken: data.data.refresh_token, isAuthenticated: true })
      },

      logout: () => {
        fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        })
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
      },
      
      hasRole: (roles: UserRole[]) => {
        const { user } = get()
        return user ? roles.includes(user.role) : false
      },
      
      setUser: (user: User, token: string) => {
        set({ user, token, isAuthenticated: true })
      }
    }),
    { name: 'auth-storage', partialize: (state) => ({ user: state.user, token: state.token, refreshToken: state.refreshToken, isAuthenticated: state.isAuthenticated }) }
  )
)

export const useAuth = useAuthStore

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children)
}