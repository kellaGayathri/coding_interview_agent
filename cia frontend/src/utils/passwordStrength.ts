export interface PasswordStrengthResult {
  score: number
  label: string
  hint: string
}

const strengthSteps = [
  { label: 'Very Weak', hint: 'Use at least 8 characters.', colorClass: 'bg-rose-500' },
  { label: 'Weak', hint: 'Add uppercase letters and numbers.', colorClass: 'bg-orange-500' },
  { label: 'Fair', hint: 'Add symbols to improve security.', colorClass: 'bg-amber-400' },
  { label: 'Strong', hint: 'Great balance of complexity and length.', colorClass: 'bg-emerald-400' },
  { label: 'Excellent', hint: 'Excellent password quality.', colorClass: 'bg-cyan-400' },
] as const

const hasUpperAndLowerCase = (password: string) =>
  /[a-z]/.test(password) && /[A-Z]/.test(password)

const hasNumber = (password: string) => /\d/.test(password)
const hasSymbol = (password: string) => /[^A-Za-z0-9]/.test(password)

export function getPasswordStrength(password: string): PasswordStrengthResult & { colorClass: string } {
  if (!password) {
    return { score: 0, ...strengthSteps[0] }
  }

  let score = 0
  if (password.length >= 8) score += 1
  if (hasUpperAndLowerCase(password)) score += 1
  if (hasNumber(password)) score += 1
  if (hasSymbol(password)) score += 1

  const level = Math.min(score, 4)
  return {
    score: level,
    ...strengthSteps[level],
  }
}
