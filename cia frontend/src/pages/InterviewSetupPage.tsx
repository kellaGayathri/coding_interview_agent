import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { useAuth } from '../context/authContext'
import { useInterviewSession } from '../hooks/useInterviewSession'
import { setActiveInterviewId, setActiveInterviewSetup, startInterview } from '../services/interviewApi'
import { PROGRAMMING_LANGUAGES } from '../types/interview'
import type { ProgrammingLanguage } from '../types/interview'
import { buildInterviewSnapshot } from '../utils/interviewSessionSnapshot'

const durationOptions = [
  { label: '30 minutes', value: 30 * 60 },
  { label: '45 minutes', value: 45 * 60 },
  { label: '60 minutes', value: 60 * 60 },
]

const languageLabel: Record<ProgrammingLanguage, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
}

export function InterviewSetupPage() {
  const navigate = useNavigate()
  const { user, isReady } = useAuth()
  const { restoreInterview, resetInterview } = useInterviewSession()

  const [language, setLanguage] = useState<ProgrammingLanguage>('python')
  const [durationInSeconds, setDurationInSeconds] = useState<number>(45 * 60)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isReady && !user) {
      navigate('/login', { replace: true })
    }
  }, [isReady, navigate, user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    setIsStarting(true)

    try {
      const interview = await startInterview()
      const snapshot = buildInterviewSnapshot({
        interview,
        userId: user.id,
        language,
        durationInSeconds,
      })

      setActiveInterviewId(interview.interview_id)
      setActiveInterviewSetup({
        interview_id: interview.interview_id,
        language,
        duration_in_seconds: durationInSeconds,
      })

      resetInterview()
      restoreInterview(snapshot)
      navigate('/interview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start interview. Please retry.')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="page-aurora" />
      <div className="page-grid" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-14">
        <header className="flex flex-wrap items-center justify-between gap-3 animate-fadeInDown">
          <div>
            <p className="chip">Interview Setup</p>
            <h1 className="font-title mt-3 text-3xl font-bold headline-gradient">
              Ready for your next coding simulation{user ? `, ${user.name}` : ''}?
            </h1>
          </div>
          <Link to="/dashboard" className="text-sm font-semibold text-slate-300 hover:text-slate-100">
            Dashboard
          </Link>
        </header>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="glass-panel mt-8 space-y-6 rounded-3xl p-7"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-300">Programming Language</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as ProgrammingLanguage)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
              >
                {PROGRAMMING_LANGUAGES.map((languageOption) => (
                  <option key={languageOption} value={languageOption}>
                    {languageLabel[languageOption]}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-300">Question Mix</span>
              <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-300">
                5 Questions: 2 Easy, 2 Medium, 1 Hard
              </div>
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-300">Interview Duration</legend>
            <div className="flex flex-wrap gap-2">
              {durationOptions.map((option) => (
                <motion.button
                  key={option.value}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setDurationInSeconds(option.value)}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                    durationInSeconds === option.value
                      ? 'border-cyan-400/80 bg-cyan-500/15 text-cyan-200'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </fieldset>

          {error ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <Link
              to="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
            >
              Cancel
            </Link>
            <Button type="submit" className="min-w-44" isLoading={isStarting} loadingText="Building session...">
              Start Interview
            </Button>
          </div>
        </motion.form>
      </div>
    </main>
  )
}
