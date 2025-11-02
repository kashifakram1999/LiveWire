import { apiClient } from "./client"
import type { User } from "../types"

export const listUsers = async (search?: string): Promise<User[]> => {
  const params = search ? { search } : undefined
  const { data } = await apiClient.get<User[]>("/auth/users/", { params })
  return data
}
