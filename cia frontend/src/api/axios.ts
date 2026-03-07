import axios, { AxiosError } from 'axios'
import type { ApiResponse } from '../types/api'

const ACCESS_TOKEN_STORAGE_KEY = 'cia.auth.access_token'

let onUnauthorized: (() => void) | null = null

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler
}

export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}

export const setAccessToken = (token: string) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token)
}

export const clearAccessToken = () => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      clearAccessToken()
      if (onUnauthorized) {
        onUnauthorized()
      }
    }
    return Promise.reject(error)
  },
)

export default api
