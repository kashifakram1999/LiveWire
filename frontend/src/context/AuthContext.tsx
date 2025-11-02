import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { PropsWithChildren } from "react"

import { getCurrentUser, login, register } from "../api/auth"
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "../types"

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  loginUser: (payload: LoginPayload) => Promise<void>
  registerUser: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const persistTokens = ({ access, refresh }: AuthResponse) => {
  localStorage.setItem("lw_access_token", access)
  localStorage.setItem("lw_refresh_token", refresh)
}

const removeTokens = () => {
  localStorage.removeItem("lw_access_token")
  localStorage.removeItem("lw_refresh_token")
}

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const access = localStorage.getItem("lw_access_token")
        if (!access) {
          setIsLoading(false)
          return
        }
        const data = await getCurrentUser()
        setUser(data)
      } catch (error) {
        removeTokens()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    bootstrap()
  }, [])

  const loginUser = useCallback(async (payload: LoginPayload) => {
    const authResponse = await login(payload)
    persistTokens(authResponse)
    setUser(authResponse.user)
  }, [])

  const registerUser = useCallback(async (payload: RegisterPayload) => {
    await register(payload)
    await loginUser({ email: payload.email, password: payload.password })
  }, [loginUser])

  const logout = useCallback(() => {
    removeTokens()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      loginUser,
      registerUser,
      logout,
    }),
    [user, isLoading, loginUser, registerUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
