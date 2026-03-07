/* eslint-disable react-refresh/only-export-components */
import axios from 'axios'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { clearAccessToken, getAccessToken, setAccessToken, setUnauthorizedHandler } from '../api/axios'
import { loginUser, registerUser } from '../services/backendApi'
import type { ApiResponse, BackendAuthResponse, UserProfile } from '../types/api'

type AuthContextValue = {
  user: UserProfile | null
  isLoading: boolean
  isReady: boolean
  login: (payload: { email: string; password: string }) => Promise<void>
  register: (payload: { full_name: string; email: string; password: string }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_USER_STORAGE_KEY = 'cia.auth.user'

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiResponse<unknown>>(error)) {
    return error.response?.data?.message ?? error.response?.data?.detail ?? error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Request failed'
}

const toUserProfile = (payload: BackendAuthResponse['user']): UserProfile => ({
  id: payload.email.trim().toLowerCase(),
  name: payload.username.trim(),
  email: payload.email.trim().toLowerCase(),
  total_interviews: 0,
  total_score: 0,
})

const readStoredUser = (): UserProfile | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

const persistUser = (user: UserProfile | null) => {
  if (typeof window === 'undefined') {
    return
  }
  if (!user) {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => readStoredUser())
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const logout = useCallback(() => {
    clearAccessToken()
    setUser(null)
    persistUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      logout()
      return
    }
    const storedUser = readStoredUser()
    if (!storedUser) {
      logout()
      return
    }
    setUser(storedUser)
    persistUser(storedUser)
  }, [logout])

  const register = useCallback(
    async (payload: { full_name: string; email: string; password: string }) => {
      setIsLoading(true)
      try {
        const response = await registerUser({
          username: payload.full_name.trim(),
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
        })
        if (!response.user) {
          throw new Error(response.message || 'Registration failed')
        }
      } catch (error) {
        throw new Error(getErrorMessage(error))
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const login = useCallback(
    async (payload: { email: string; password: string }) => {
      setIsLoading(true)
      try {
        const response = await loginUser({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
        })
        if (!response.user) {
          throw new Error(response.message || 'Login failed')
        }

        const profile = toUserProfile(response.user)
        setAccessToken(`local-session-${Date.now()}-${profile.id}`)
        setUser(profile)
        persistUser(profile)
      } catch (error) {
        throw new Error(getErrorMessage(error))
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
    })
    return () => setUnauthorizedHandler(null)
  }, [logout])

  useEffect(() => {
    let isMounted = true
    const bootstrap = async () => {
      try {
        const token = getAccessToken()
        if (!token) {
          logout()
          return
        }
        await refreshUser()
      } catch {
        logout()
      } finally {
        if (isMounted) {
          setIsReady(true)
        }
      }
    }
    void bootstrap()
    return () => {
      isMounted = false
    }
  }, [logout, refreshUser])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isReady,
      login,
      register,
      logout,
      refreshUser,
    }),
    [isLoading, isReady, login, logout, refreshUser, register, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
