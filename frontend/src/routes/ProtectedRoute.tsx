import { Navigate } from "react-router-dom"
import type { ReactElement } from "react"

import { useAuth } from "../context/AuthContext"
import { RouteLoader } from "./RouteLoader"

type ProtectedRouteProps = {
  children: ReactElement
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <RouteLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
