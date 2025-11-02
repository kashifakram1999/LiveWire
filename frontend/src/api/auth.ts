import { apiClient } from "./client"
import type { AuthResponse, LoginPayload, RegisterPayload } from "../types"

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>("/auth/token/", payload)
  return data
}

export const register = async (payload: RegisterPayload) => {
  const { data } = await apiClient.post("/auth/register/", payload)
  return data
}

export const getCurrentUser = async () => {
  const { data } = await apiClient.get("/auth/me/")
  return data
}
