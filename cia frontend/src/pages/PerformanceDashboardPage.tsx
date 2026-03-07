import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { useAuth } from '../context/authContext'
import { useInterviewSession } from '../hooks/useInterviewSession'
import {
  clearActiveInterviewId,
  deleteInterview,
  fetchDashboard,
  getActiveInterviewSetup,
  getInterviewById,
  getStoredInterviewApi,
  setActiveInterviewId,
  setActiveInterviewSetup,
} from '../services/interviewApi'
import type { DashboardResponse } from '../types/api'
import { buildInterviewSnapshot } from '../utils/interviewSessionSnapshot'

const statCardAnimation = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' },
} as const

export function PerformanceDashboardPage() {
  const navigate = useNavigate()
  const { user, logout, isReady } = useAuth()
  const { resetInterview, restoreInterview } = useInterviewSession()
  const [overview, setOverview] = useState<DashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadOverview = async () => {
      if (!user) {
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const overviewResponse = await fetchDashboard()
        if (isMounted) {
          setOverview(overviewResponse)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to load dashboard analytics.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadOverview()

    return () => {
      isMounted = false
    }
  }, [user])

  if (isReady && !user) {
    return <Navigate to="/login" replace />
  }

  const handleLogout = () => {
    clearActiveInterviewId()
    logout()
    navigate('/login', { replace: true })
  }

  const handleContinue = async (interviewId: string) => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    try {
      // use local copy; continuing only makes sense for in-progress interviews
      const interview = getStoredInterviewApi(interviewId)
      if (!interview) {
        throw new Error('Interview state not found. Please start a new interview.')
      }
      const storedSetup = getActiveInterviewSetup(interviewId)
      const language = storedSetup?.language ?? 'python'
      const durationInSeconds = storedSetup?.durationInSeconds ?? 45 * 60

      const snapshot = buildInterviewSnapshot({
        interview,
        userId: user.id,
        language,
        durationInSeconds,
      })

      resetInterview()
      restoreInterview(snapshot)
      setActiveInterviewId(interviewId)
      setActiveInterviewSetup({
        interview_id: interviewId,
        language,
        duration_in_seconds: durationInSeconds,
      })
      navigate('/interview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open interview.')
    }
  }

  const handleOpen = (interviewId: string) => {
    navigate(`/result/${interviewId}`)
  }

  const handleDelete = async (interviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this interview session?')) {
      return
    }

    try {
      await deleteInterview(interviewId)
      setOverview((prev) => {
        if (!prev) return null
        return {
          ...prev,
          recent_interviews: prev.recent_interviews.filter((item) => item.interview_id !== interviewId),
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete interview.')
    }
  }

  return (
    <main className="page-shell">
      <div className="page-aurora" />
      <div className="page-grid" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12 animate-fadeIn">
        <header className="flex flex-wrap items-center justify-between gap-3 animate-fadeInDown">
          <div>
            <p className="chip">Dashboard</p>
            <h1 className="font-title mt-3 text-3xl font-bold headline-gradient">
              Welcome back, {user?.name ?? 'Candidate'}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Track interview progress and launch your next coding session.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="secondary" size="sm" className="hover-lift active-scale">
                Home
              </Button>
            </Link>
            <Link to="/setup">
              <Button size="sm" className="hover-lift active-scale">Start Interview</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hover-lift active-scale">
              Logout
            </Button>
          </div>
        </header>

        {isLoading ? (
          <section className="glass-panel mt-8 rounded-2xl p-6 text-sm text-slate-300 animate-pulse">
            Loading dashboard analytics...
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="glass-panel mt-8 rounded-2xl border border-rose-500/35 bg-rose-500/10 p-6 text-sm text-rose-200 animate-scaleIn">
            {error}
          </section>
        ) : null}

        {!isLoading && !error && overview ? (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-3">
              <motion.article
                {...statCardAnimation}
                className="glass-panel rounded-2xl p-5 hover-lift cursor-default"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Interviews</p>
                <p className="mt-2 text-4xl font-bold text-slate-100">{overview.total_interviews}</p>
              </motion.article>

              <motion.article
                {...statCardAnimation}
                transition={{ ...statCardAnimation.transition, delay: 0.06 }}
                className="glass-panel rounded-2xl p-5 hover-lift cursor-default"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Score</p>
                <p className="mt-2 text-4xl font-bold text-sky-300">{overview.total_score}</p>
              </motion.article>

              <motion.article
                {...statCardAnimation}
                transition={{ ...statCardAnimation.transition, delay: 0.1 }}
                className="glass-panel rounded-2xl p-5 hover-lift cursor-default"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">Average Score</p>
                <p className="mt-2 text-4xl font-bold text-indigo-300">{overview.average_score}</p>
              </motion.article>
            </section>

            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/55 p-5 animate-fadeInUp">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Recent Interviews</h2>
              <div className="mt-3 space-y-2">
                {overview.recent_interviews.length ? (
                  overview.recent_interviews.map((item, idx) => (
                    <motion.div 
                      key={item.interview_id} 
                      className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 hover:bg-slate-950/90 hover:border-slate-700 transition-all hover-lift active-scale cursor-default"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">
                            Score: {item.total_score}
                          </p>
                          <p className="text-xs text-slate-400">{new Date(item.started_at).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === 'in_progress' ? (
                            <button
                              type="button"
                              onClick={() => {
                                void handleContinue(item.interview_id)
                              }}
                              className="rounded-md border border-cyan-400/50 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-500/20 hover-scale active-scale"
                            >
                              Continue
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpen(item.interview_id)}
                              className="rounded-md border border-sky-400/50 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-200 transition hover:bg-sky-500/20 hover-scale active-scale"
                            >
                              Open
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.interview_id)}
                            className="rounded-md border border-rose-400/50 bg-rose-500/10 px-2.5 py-1 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 hover:scale-110 active:scale-95"
                            title="Delete this interview"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.p 
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-400 animate-fadeIn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    No interviews yet. Start your first round now.
                  </motion.p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
