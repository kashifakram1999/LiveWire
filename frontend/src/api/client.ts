import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("lw_access_token")
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    }
  }
  return config
})

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refresh = localStorage.getItem("lw_refresh_token")
        if (!refresh) throw error
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/token/refresh/`,
          { refresh },
          { headers: { "Content-Type": "application/json" } },
        )
        const { access } = refreshResponse.data
        localStorage.setItem("lw_access_token", access)
        originalRequest.headers.Authorization = `Bearer ${access}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem("lw_access_token")
        localStorage.removeItem("lw_refresh_token")
        window.location.href = "/login"
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  },
)
