import type {
  AuthResponse,
  AuthSession,
  AuthUser,
} from '../types/auth'

interface StoredAuthUser extends AuthUser {
  password: string
  createdAt: string
}

const AUTH_USERS_STORAGE_KEY = 'cia.auth.users'
const AUTH_SESSION_STORAGE_KEY = 'cia.auth.session'
const MOCK_AUTH_DELAY_MS = 950

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const toPublicUser = (user: StoredAuthUser): AuthUser => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
})

const readStoredUsers = (): StoredAuthUser[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_USERS_STORAGE_KEY)
    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue) as StoredAuthUser[]
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

const writeStoredUsers = (users: StoredAuthUser[]) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(users))
}

const writeAuthSession = (session: AuthSession) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
}

const clearAuthSession = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
}

const createStoredUser = (fullName: string, email: string, password: string): StoredAuthUser => ({
  id: `user-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  fullName: fullName.trim(),
  email: normalizeEmail(email),
  password,
  createdAt: new Date().toISOString(),
})

export async function register(
  fullName: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  await delay(MOCK_AUTH_DELAY_MS)

  const users = readStoredUsers()
  const normalizedEmail = normalizeEmail(email)
  const existingUser = users.find((user) => user.email === normalizedEmail)

  if (existingUser) {
    throw new Error('An account with this email already exists.')
  }

  const newUser = createStoredUser(fullName, normalizedEmail, password)
  writeStoredUsers([newUser, ...users])

  return {
    user: toPublicUser(newUser),
    message: 'Registration successful. Please login to continue.',
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  await delay(MOCK_AUTH_DELAY_MS)

  const users = readStoredUsers()
  const normalizedEmail = normalizeEmail(email)
  const matchedUser = users.find(
    (user) => user.email === normalizedEmail && user.password === password,
  )

  if (!matchedUser) {
    throw new Error('Invalid email or password.')
  }

  const publicUser = toPublicUser(matchedUser)
  writeAuthSession({
    user: publicUser,
    authenticatedAt: new Date().toISOString(),
  })

  return {
    user: publicUser,
    message: 'Login successful.',
  }
}

export function getCurrentSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)
    if (!rawValue) {
      return null
    }

    const parsedValue = JSON.parse(rawValue) as AuthSession
    if (!parsedValue || typeof parsedValue !== 'object' || !parsedValue.user) {
      return null
    }

    return parsedValue
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getCurrentSession())
}

export function logout(): void {
  clearAuthSession()
}
