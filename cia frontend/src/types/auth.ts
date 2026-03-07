export interface AuthUser {
  id: string
  fullName: string
  email: string
}

export interface AuthSession {
  user: AuthUser
  authenticatedAt: string
}

export interface AuthResponse {
  user: AuthUser
  message: string
}

export interface LoginFormValues {
  email: string
  password: string
}

export interface RegisterFormValues {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>
export type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>
