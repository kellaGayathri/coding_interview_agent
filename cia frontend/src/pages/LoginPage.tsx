import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/auth/AuthCard'
import { AuthLayout } from '../components/auth/AuthLayout'
import { Button } from '../components/auth/Button'
import { Input } from '../components/auth/Input'
import { useAuth } from '../context/authContext'
import { LOGIN_PAGE_COPY } from '../data/authContent'
import { validateLoginForm } from '../utils/authValidation'
import type { LoginFormErrors, LoginFormValues } from '../types/auth'

type LoginLocationState = {
  notice?: string
}

const INITIAL_FORM_VALUES: LoginFormValues = {
  email: '',
  password: '',
}

const hasValidationErrors = (errors: LoginFormErrors) => Object.values(errors).some(Boolean)
const SUCCESS_REDIRECT_DELAY_MS = 420

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user } = useAuth()
  const loginNotice = (location.state as LoginLocationState | null)?.notice ?? null

  const [values, setValues] = useState<LoginFormValues>(INITIAL_FORM_VALUES)
  const [errors, setErrors] = useState<LoginFormErrors>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate, user])

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const fieldName = name as keyof LoginFormValues

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
    const nextErrors = validateLoginForm(values)
    setErrors(nextErrors)

    if (hasValidationErrors(nextErrors)) {
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await login({ email: values.email, password: values.password })
      setIsSuccess(true)
      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), SUCCESS_REDIRECT_DELAY_MS)
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : LOGIN_PAGE_COPY.genericError
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard
        eyebrow={LOGIN_PAGE_COPY.eyebrow}
        title={LOGIN_PAGE_COPY.title}
        subtitle={LOGIN_PAGE_COPY.subtitle}
        isSuccess={isSuccess}
        footer={
          <p className="text-center">
            {LOGIN_PAGE_COPY.switchPrompt}{' '}
            <Link to="/register" className="font-semibold text-cyan-300 transition hover:text-cyan-200">
              {LOGIN_PAGE_COPY.switchLinkLabel}
            </Link>
          </p>
        }
      >
        <div className="mb-5 flex justify-end">
          <Link to="/" className="text-xs font-semibold text-slate-400 transition hover:text-slate-200">
            {LOGIN_PAGE_COPY.homeLinkLabel}
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {loginNotice ? (
            <motion.p
              key={`notice-${loginNotice}`}
              className="mb-4 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {loginNotice}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {errorMessage ? (
            <motion.p
              key={`error-${errorMessage}`}
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
          <Input
            name="email"
            type="email"
            autoComplete="email"
            label={LOGIN_PAGE_COPY.emailLabel}
            placeholder={LOGIN_PAGE_COPY.emailPlaceholder}
            value={values.email}
            onChange={handleInputChange}
            error={errors.email}
            disabled={isSubmitting || isSuccess}
          />
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            label={LOGIN_PAGE_COPY.passwordLabel}
            placeholder={LOGIN_PAGE_COPY.passwordPlaceholder}
            value={values.password}
            onChange={handleInputChange}
            error={errors.password}
            disabled={isSubmitting || isSuccess}
          />

          <Button
            type="submit"
            className="mt-2"
            isLoading={isSubmitting}
            loadingText={LOGIN_PAGE_COPY.submitLoadingLabel}
            disabled={isSuccess}
          >
            {isSuccess ? LOGIN_PAGE_COPY.submitSuccessLabel : LOGIN_PAGE_COPY.submitLabel}
          </Button>
        </form>
      </AuthCard>
    </AuthLayout>
  )
}
