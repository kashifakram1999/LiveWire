import { Navigate } from "react-router-dom"
import type { ReactElement } from "react"

import { useAuth } from "../context/AuthContext"

type ProtectedRouteProps = {
  children: ReactElement
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
