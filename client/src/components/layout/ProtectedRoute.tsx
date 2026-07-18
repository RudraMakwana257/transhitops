import type { ReactNode } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface ProtectedRouteProps {
  roles?: string[]
  children?: ReactNode
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuth()
  const location = useLocation()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  if (roles && !hasRole(roles as any)) {
    return <Navigate to="/unauthorized" replace />
  }
  
  return children ? <>{children}</> : <Outlet />
}