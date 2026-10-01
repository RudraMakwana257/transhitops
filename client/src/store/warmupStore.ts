import { create } from 'zustand'

interface WarmupState {
  isWarmingUp: boolean
  isCompleted: boolean
  startTime: number | null
  activeSlowRequests: number
  startWarmup: () => void
  endWarmup: () => void
  registerSlowRequest: () => void
  unregisterSlowRequest: () => void
}

export const useWarmupStore = create<WarmupState>((set, get) => ({
  isWarmingUp: false,
  isCompleted: false,
  startTime: null,
  activeSlowRequests: 0,

  startWarmup: () => {
    if (!get().isWarmingUp) {
      set({
        isWarmingUp: true,
        isCompleted: false,
        startTime: Date.now()
      })
    }
  },

  registerSlowRequest: () => {
    const current = get().activeSlowRequests + 1
    set({
      activeSlowRequests: current,
      isWarmingUp: true,
      isCompleted: false,
      startTime: get().startTime || Date.now()
    })
  },

  unregisterSlowRequest: () => {
    const next = Math.max(0, get().activeSlowRequests - 1)
    if (next === 0 && get().isWarmingUp) {
      // Show smooth completed state for 1 second before unmounting
      set({ activeSlowRequests: 0, isCompleted: true })
      setTimeout(() => {
        if (get().activeSlowRequests === 0) {
          set({ isWarmingUp: false, isCompleted: false, startTime: null })
        }
      }, 1200)
    } else {
      set({ activeSlowRequests: next })
    }
  },

  endWarmup: () => {
    set({ isCompleted: true, activeSlowRequests: 0 })
    setTimeout(() => {
      set({ isWarmingUp: false, isCompleted: false, startTime: null })
    }, 1200)
  }
}))
