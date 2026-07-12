import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/authStore'
import type { UserRole } from './types'
import { AppLayout as Layout } from './components/layout/AppLayout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Vehicles } from './pages/Vehicles'
import { VehicleDetail } from './pages/VehicleDetail'
import { Drivers } from './pages/Drivers'
import { Trips } from './pages/Trips'
import { TripCreate } from './pages/TripCreate'
import { TripDetail } from './pages/TripDetail'
import { Maintenance } from './pages/Maintenance'
import { Fuel } from './pages/Fuel'
import { Expenses } from './pages/Expenses'
import { Analytics } from './pages/Analytics'
import { Settings } from './pages/Settings'
import { Unauthorized } from './pages/Unauthorized'
import { ToastContainer } from './components/ui/Toast'
import './styles/globals.css'

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) => {
  const { isAuthenticated, hasRole } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (roles && !hasRole(roles)) {
    return <Navigate to="/unauthorized" replace />
  }
  
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      <Route element={
        <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vehicles" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst']}>
            <Vehicles />
          </ProtectedRoute>
        } />
        <Route path="/vehicles/:id" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst']}>
            <VehicleDetail />
          </ProtectedRoute>
        } />
        
        <Route path="/drivers" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer']}>
            <Drivers />
          </ProtectedRoute>
        } />
        <Route path="/drivers/:id" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer']}>
            <Drivers />
          </ProtectedRoute>
        } />
        
        <Route path="/trips" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst']}>
            <Trips />
          </ProtectedRoute>
        } />
        <Route path="/trips/new" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher']}>
            <TripCreate />
          </ProtectedRoute>
        } />
        <Route path="/trips/:id" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst']}>
            <TripDetail />
          </ProtectedRoute>
        } />
        
        <Route path="/maintenance" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst']}>
            <Maintenance />
          </ProtectedRoute>
        } />
        
        <Route path="/fuel" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'financial_analyst']}>
            <Fuel />
          </ProtectedRoute>
        } />
        
        <Route path="/expenses" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'financial_analyst']}>
            <Expenses />
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst']}>
            <Analytics />
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute roles={['fleet_manager']}>
            <Settings />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <>
      <AppRoutes />
      <ToastContainer />
    </>
  )
}

export default App