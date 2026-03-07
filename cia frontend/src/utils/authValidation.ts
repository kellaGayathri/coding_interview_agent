import type {
  LoginFormErrors,
  LoginFormValues,
  RegisterFormErrors,
  RegisterFormValues,
} from '../types/auth'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MIN_FULL_NAME_LENGTH = 2

const hasValue = (value: string) => value.trim().length > 0

export function validateEmail(email: string): string | null {
  const normalizedEmail = email.trim()
  if (!hasValue(normalizedEmail)) {
    return 'Email is required.'
  }
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return 'Enter a valid email address.'
  }
  return null
}

export function validatePassword(password: string): string | null {
  if (!hasValue(password)) {
    return 'Password is required.'
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return null
}

export function validateFullName(fullName: string): string | null {
  const normalizedName = fullName.trim()
  if (!hasValue(normalizedName)) {
    return 'Full name is required.'
  }
  if (normalizedName.length < MIN_FULL_NAME_LENGTH) {
    return 'Full name is too short.'
  }
  return null
}

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  return {
    email: validateEmail(values.email) ?? undefined,
    password: validatePassword(values.password) ?? undefined,
  }
}

export function validateRegisterForm(values: RegisterFormValues): RegisterFormErrors {
  const confirmPasswordError =
    !hasValue(values.confirmPassword)
      ? 'Confirm password is required.'
      : values.password !== values.confirmPassword
        ? 'Passwords do not match.'
        : null

  return {
    fullName: validateFullName(values.fullName) ?? undefined,
    email: validateEmail(values.email) ?? undefined,
    password: validatePassword(values.password) ?? undefined,
    confirmPassword: confirmPasswordError ?? undefined,
  }
}
