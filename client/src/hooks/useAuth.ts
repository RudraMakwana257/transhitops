import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { user, token, refreshToken, isAuthenticated, login, logout, hasRole, setUser } = useAuthStore()
  
  return {
    user,
    token,
    refreshToken,
    isAuthenticated,
    login,
    logout,
    hasRole,
    setUser
  }
}