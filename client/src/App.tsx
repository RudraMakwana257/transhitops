import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout as Layout } from './components/layout/AppLayout'
import { Login } from './pages/Login'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Vehicles } from './pages/Vehicles'
import { VehicleCreate } from './pages/VehicleCreate'
import { VehicleDetail } from './pages/VehicleDetail'
import { Drivers } from './pages/Drivers'
import { DriverCreate } from './pages/DriverCreate'
import { DriverDetail } from './pages/DriverDetail'
import { Trips } from './pages/Trips'
import { TripCreate } from './pages/TripCreate'
import { TripDetail } from './pages/TripDetail'
import { Maintenance } from './pages/Maintenance'
import { Fuel } from './pages/Fuel'
import { Expenses } from './pages/Expenses'
import { Analytics } from './pages/Analytics'
import { Settings } from './pages/Settings'
import { Unauthorized } from './pages/Unauthorized'
import { Suspended } from './pages/Suspended'
import { AdminLayout } from './components/layout/AdminLayout'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminCompanies } from './pages/admin/AdminCompanies'
import { AdminCompanyCreate } from './pages/admin/AdminCompanyCreate'
import { AdminCompanyDetail } from './pages/admin/AdminCompanyDetail'
import { AdminPlans } from './pages/admin/AdminPlans'
import { ToastContainer } from './components/ui/Toast'
import './styles/globals.css'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { DriverEdit } from './pages/DriverEdit'
import { TripEdit } from './pages/TripEdit'
import { MaintenanceDetail } from './pages/MaintenanceDetail'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/suspended" element={<Suspended />} />
      
      {/* Super Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['super_admin']}>
          <Navigate to="/admin/dashboard" replace />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute roles={['super_admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="companies" element={<AdminCompanies />} />
        <Route path="companies/new" element={<AdminCompanyCreate />} />
        <Route path="companies/:id" element={<AdminCompanyDetail />} />
        <Route path="plans" element={<AdminPlans />} />
      </Route>
      
      {/* Tenant Routes */}
      <Route element={
        <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vehicles" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst']}>
            <Vehicles />
          </ProtectedRoute>
        } />
        <Route path="/vehicles/new" element={
          <ProtectedRoute roles={['fleet_manager']}>
            <VehicleCreate />
          </ProtectedRoute>
        } />
        <Route path="/vehicles/:id/edit" element={
          <ProtectedRoute roles={['fleet_manager']}>
            <VehicleCreate />
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
        <Route path="/drivers/new" element={
          <ProtectedRoute roles={['fleet_manager']}>
            <DriverCreate />
          </ProtectedRoute>
        } />
        <Route path="/drivers/:id/edit" element={
          <ProtectedRoute roles={['fleet_manager']}>
            <DriverEdit />
          </ProtectedRoute>
        } />
        <Route path="/drivers/:id" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer']}>
            <DriverDetail />
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
        <Route path="/trips/:id/edit" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher']}>
            <TripEdit />
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
        <Route path="/maintenance/:id" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst']}>
            <MaintenanceDetail />
          </ProtectedRoute>
        } />
        
        <Route path="/fuel" element={
          <ProtectedRoute roles={['fleet_manager', 'dispatcher']}>
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