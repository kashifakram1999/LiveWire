import { Navigate } from "react-router-dom"
import type { ReactElement } from "react"

import { useAuth } from "../context/AuthContext"
import { RouteLoader } from "./RouteLoader"

type GuestRouteProps = {
  children: ReactElement
}

export const GuestRoute = ({ children }: GuestRouteProps) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <RouteLoader />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}
