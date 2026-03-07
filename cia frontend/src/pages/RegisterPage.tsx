import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/auth/AuthCard'
import { AuthLayout } from '../components/auth/AuthLayout'
import { Button } from '../components/auth/Button'
import { Input } from '../components/auth/Input'
import { useAuth } from '../context/authContext'
import { LOGIN_PAGE_COPY, REGISTER_PAGE_COPY } from '../data/authContent'
import { validateRegisterForm } from '../utils/authValidation'
import { getPasswordStrength } from '../utils/passwordStrength'
import type { RegisterFormErrors, RegisterFormValues } from '../types/auth'

const INITIAL_FORM_VALUES: RegisterFormValues = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const hasValidationErrors = (errors: RegisterFormErrors) => Object.values(errors).some(Boolean)
const getStrengthWidth = (score: number, password: string) =>
  password ? `${((score + 1) / 5) * 100}%` : '0%'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [values, setValues] = useState<RegisterFormValues>(INITIAL_FORM_VALUES)
  const [errors, setErrors] = useState<RegisterFormErrors>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const passwordStrength = getPasswordStrength(values.password)

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const fieldName = name as keyof RegisterFormValues

    setValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }))
    setErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: undefined,
    }))
    if (errorMessage) {
      setErrorMessage(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateRegisterForm(values)
    setErrors(nextErrors)

    if (hasValidationErrors(nextErrors)) {
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await register({
        full_name: values.fullName,
        email: values.email,
        password: values.password,
      })
      navigate('/login', {
        replace: true,
        state: {
          notice: LOGIN_PAGE_COPY.registerSuccessNotice,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : REGISTER_PAGE_COPY.genericError
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard
        eyebrow={REGISTER_PAGE_COPY.eyebrow}
        title={REGISTER_PAGE_COPY.title}
        subtitle={REGISTER_PAGE_COPY.subtitle}
        footer={
          <p className="text-center">
            {REGISTER_PAGE_COPY.switchPrompt}{' '}
            <Link to="/login" className="font-semibold text-cyan-300 transition hover:text-cyan-200">
              {REGISTER_PAGE_COPY.switchLinkLabel}
            </Link>
          </p>
        }
      >
        <div className="mb-5 flex justify-end">
          <Link to="/" className="text-xs font-semibold text-slate-400 transition hover:text-slate-200">
            {REGISTER_PAGE_COPY.homeLinkLabel}
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {errorMessage ? (
            <motion.p
              key={`register-error-${errorMessage}`}
              className="mb-4 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {errorMessage}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
            <Input
              name="fullName"
              type="text"
              autoComplete="name"
              label={REGISTER_PAGE_COPY.fullNameLabel}
              placeholder={REGISTER_PAGE_COPY.fullNamePlaceholder}
              value={values.fullName}
              onChange={handleInputChange}
              error={errors.fullName}
              disabled={isSubmitting}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              label={REGISTER_PAGE_COPY.emailLabel}
              placeholder={REGISTER_PAGE_COPY.emailPlaceholder}
              value={values.email}
              onChange={handleInputChange}
              error={errors.email}
              disabled={isSubmitting}
            />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              label={REGISTER_PAGE_COPY.passwordLabel}
              placeholder={REGISTER_PAGE_COPY.passwordPlaceholder}
              value={values.password}
              onChange={handleInputChange}
              error={errors.password}
              disabled={isSubmitting}
            />
          </motion.div>

          <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-400">Password strength</span>
              <span className="font-semibold text-slate-200">{passwordStrength.label}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-800">
              <motion.div
                className={`h-full rounded-full ${passwordStrength.colorClass}`}
                initial={{ width: 0 }}
                animate={{ width: getStrengthWidth(passwordStrength.score, values.password) }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">{passwordStrength.hint}</p>
          </div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              label={REGISTER_PAGE_COPY.confirmPasswordLabel}
              placeholder={REGISTER_PAGE_COPY.confirmPasswordPlaceholder}
              value={values.confirmPassword}
              onChange={handleInputChange}
              error={errors.confirmPassword}
              disabled={isSubmitting}
            />
          </motion.div>

          <Button
            type="submit"
            className="mt-2"
            isLoading={isSubmitting}
            loadingText={REGISTER_PAGE_COPY.submitLoadingLabel}
          >
            {REGISTER_PAGE_COPY.submitLabel}
          </Button>
        </form>
      </AuthCard>
    </AuthLayout>
  )
}
