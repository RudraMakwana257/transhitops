import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      theme: 'light',
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: newTheme })
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
      },
      
      setTheme: (theme: 'light' | 'dark') => {
        set({ theme })
        document.documentElement.classList.toggle('dark', theme === 'dark')
      }
    }),
    { name: 'ui-storage' }
  )
)

export function UIProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children)
}