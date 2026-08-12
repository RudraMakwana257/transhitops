import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout as Layout } from './components/layout/AppLayout'
import { AdminLayout } from './components/layout/AdminLayout'
import { ToastContainer } from './components/ui/Toast'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import './styles/globals.css'

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })))
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Vehicles = lazy(() => import('./pages/Vehicles').then(m => ({ default: m.Vehicles })))
const VehicleCreate = lazy(() => import('./pages/VehicleCreate').then(m => ({ default: m.VehicleCreate })))
const VehicleDetail = lazy(() => import('./pages/VehicleDetail').then(m => ({ default: m.VehicleDetail })))
const Drivers = lazy(() => import('./pages/Drivers').then(m => ({ default: m.Drivers })))
const DriverCreate = lazy(() => import('./pages/DriverCreate').then(m => ({ default: m.DriverCreate })))
const DriverDetail = lazy(() => import('./pages/DriverDetail').then(m => ({ default: m.DriverDetail })))
const DriverEdit = lazy(() => import('./pages/DriverEdit').then(m => ({ default: m.DriverEdit })))
const Trips = lazy(() => import('./pages/Trips').then(m => ({ default: m.Trips })))
const TripCreate = lazy(() => import('./pages/TripCreate').then(m => ({ default: m.TripCreate })))
const TripDetail = lazy(() => import('./pages/TripDetail').then(m => ({ default: m.TripDetail })))
const TripEdit = lazy(() => import('./pages/TripEdit').then(m => ({ default: m.TripEdit })))
const Maintenance = lazy(() => import('./pages/Maintenance').then(m => ({ default: m.Maintenance })))
const MaintenanceDetail = lazy(() => import('./pages/MaintenanceDetail').then(m => ({ default: m.MaintenanceDetail })))
const Fuel = lazy(() => import('./pages/Fuel').then(m => ({ default: m.Fuel })))
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })))
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const Unauthorized = lazy(() => import('./pages/Unauthorized').then(m => ({ default: m.Unauthorized })))
const Suspended = lazy(() => import('./pages/Suspended').then(m => ({ default: m.Suspended })))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const AdminCompanies = lazy(() => import('./pages/admin/AdminCompanies').then(m => ({ default: m.AdminCompanies })))
const AdminCompanyCreate = lazy(() => import('./pages/admin/AdminCompanyCreate').then(m => ({ default: m.AdminCompanyCreate })))
const AdminCompanyDetail = lazy(() => import('./pages/admin/AdminCompanyDetail').then(m => ({ default: m.AdminCompanyDetail })))
const AdminPlans = lazy(() => import('./pages/admin/AdminPlans').then(m => ({ default: m.AdminPlans })))

import { ErrorBoundary } from './components/common/ErrorBoundary'
import { NotFound } from './pages/NotFound'

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px] text-slate-500 font-medium animate-pulse">
    Loading page...
  </div>
)

function AppRoutes() {
  return (
    <ErrorBoundary fallbackMessage="An error occurred while loading this section. Please try again.">
      <Suspense fallback={<PageLoader />}>
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

          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <ErrorBoundary fallbackMessage="A critical application error occurred. Please reload.">
      <AppRoutes />
      <ToastContainer />
    </ErrorBoundary>
  )
}

export default App