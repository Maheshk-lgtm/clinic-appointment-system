import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/types'
import { LoadingSpinner } from './Primitives'

export function ProtectedRoute({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { profile, loading, firebaseUser } = useAuth()

  if (loading) return <LoadingSpinner label="Checking your account…" />
  if (!firebaseUser) return <Navigate to="/login" replace />
  if (!profile || !profile.active) return <Navigate to="/login" replace />
  if (!allow.includes(profile.role)) return <Navigate to={`/${profile.role}`} replace />

  return <>{children}</>
}
