
import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { Navigate } from "react-router-dom"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const auth = useAuth()
  const user = auth?.user
  const isLoading = auth?.isLoading ?? false

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" replace />
  }

  if (!requireAuth && user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
