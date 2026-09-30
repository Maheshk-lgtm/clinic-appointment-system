import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { LoginPage } from '@/pages/LoginPage'
import { LoadingSpinner } from '@/components/Primitives'

import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { DoctorsPage } from '@/pages/admin/DoctorsPage'
import { ReceptionistsPage } from '@/pages/admin/ReceptionistsPage'
import { UsersPage } from '@/pages/admin/UsersPage'
import { AddUserPage } from '@/pages/admin/AddUserPage'
import { AppointmentsPage } from '@/pages/admin/AppointmentsPage'
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { ReportsPage } from '@/pages/admin/ReportsPage'

import { ReceptionistDashboard } from '@/pages/receptionist/ReceptionistDashboard'
import { BookingPage } from '@/pages/receptionist/BookingPage'
import { ReschedulesPage } from '@/pages/receptionist/ReschedulesPage'

import { DoctorDashboard } from '@/pages/doctor/DoctorDashboard'
import { DoctorRequestsPage } from '@/pages/doctor/DoctorRequestsPage'

function RootRedirect() {
  const { profile, loading, firebaseUser } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!firebaseUser || !profile) return <Navigate to="/login" replace />
  return <Navigate to={`/${profile.role}`} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allow={['admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="doctors" element={<DoctorsPage />} />
              <Route path="receptionists" element={<ReceptionistsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/new" element={<AddUserPage />} />
              <Route path="users/add" element={<AddUserPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route
              path="/receptionist"
              element={
                <ProtectedRoute allow={['receptionist', 'admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ReceptionistDashboard />} />
              <Route path="book" element={<BookingPage />} />
              <Route path="reschedules" element={<ReschedulesPage />} />
            </Route>

            <Route
              path="/doctor"
              element={
                <ProtectedRoute allow={['doctor']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DoctorDashboard />} />
              <Route path="requests" element={<DoctorRequestsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
