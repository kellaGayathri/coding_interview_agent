import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { useInterviewSession } from '../hooks/useInterviewSession'
import { generateFeedback, getInterviewById } from '../services/interviewApi'

export function ResultPage() {
  const navigate = useNavigate()
  const {
    questions,
    progressByQuestionId,
    totalScore,
    elapsedInSeconds,
    resetInterview,
  } = useInterviewSession()

  const params = useParams<{ interviewId: string }>()
  const [loadedSession, setLoadedSession] = useState<import('../types/api').InterviewSessionResponse | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const [feedback, setFeedback] = useState<string | null>(null)
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackExpanded, setFeedbackExpanded] = useState(false)

  useEffect(() => {
    const fetchSession = async () => {
      if (!params.interviewId) return
      setIsLoadingSession(true)
      setSessionError(null)
      try {
        const session = await getInterviewById(params.interviewId)
        setLoadedSession(session)
        // always replicate whatever is stored (could be empty string)
        if (session.feedback_summary != null) {
          setFeedback(session.feedback_summary)
        }
      } catch (err) {
        console.warn('Failed to load interview session', err)
        setSessionError('Interview not found or could not be loaded.')
      } finally {
        setIsLoadingSession(false)
      }
    }

    void fetchSession()
  }, [params.interviewId])

  useEffect(() => {
    // if we loaded a previous session and it already has feedback (even empty), skip regeneration
    if (loadedSession && loadedSession.feedback_summary != null) {
      return
    }

    const fetchFeedback = async () => {
      // always attempt to generate feedback when none is stored; backend can handle zero scores
      setIsLoadingFeedback(true)
      setFeedbackError(null)
      try {
        const generatedFeedback = await generateFeedback(totalScore)
        setFeedback(generatedFeedback)
      } catch (error) {
        setFeedbackError(error instanceof Error ? error.message : 'Could not load feedback.')
      } finally {
        setIsLoadingFeedback(false)
      }
    }
    void fetchFeedback()
  }, [totalScore, loadedSession])

  // when viewing a saved session we rely on the interviewId param
  // avoid bouncing to setup until we've had a chance to load it
  if (!params.interviewId && !loadedSession && !questions.length) {
    return <Navigate to="/setup" replace />
  }

  if (params.interviewId && isLoadingSession) {
    return <p className="text-center mt-20 text-slate-100">Loading session...</p>
  }

  if (params.interviewId && sessionError) {
    return <p className="text-center mt-20 text-rose-400">{sessionError}</p>
  }

  const displayScore = loadedSession ? loadedSession.total_score : totalScore
  const durationMinutes = loadedSession ? 0 : Math.max(1, Math.ceil(elapsedInSeconds / 60))
  const solvedQuestions = loadedSession
    ? loadedSession.question_results.filter((q) => q.is_solved).length
    : questions.filter((question) => progressByQuestionId[question.id]?.isSolved).length
  const totalQuestions = loadedSession ? loadedSession.question_results.length : questions.length

  return (
    <main className="page-shell animate-fadeIn">\r\n      <div className="page-aurora" />\r\n      <div className="page-grid" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12">
        <header className="flex items-center justify-between mb-2 animate-fadeInDown">
          <div>
            <h1 className="font-title text-4xl font-bold headline-gradient">
              Interview Summary
            </h1>
            <p className="text-slate-400 text-sm mt-1">View your performance and personalized feedback</p>
          </div>
          <Link to="/dashboard" className="text-sm font-semibold text-slate-300 hover:text-sky-300 transition-colors px-3 py-2 rounded-lg border border-slate-700 hover:border-sky-500/50 hover-lift">
            Dashboard
          </Link>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-slate-900/80 to-slate-950 p-5 hover:border-sky-500/40 transition-all hover:shadow-lg hover:shadow-sky-500/10 card-stagger hover-lift active-scale">
            <p className="text-xs uppercase tracking-widest text-sky-400 font-semibold">Total Score</p>
            <p className="mt-3 text-5xl font-bold text-sky-300">{displayScore}</p>
            <p className="mt-2 text-xs text-sky-300/60">Out of 100</p>
          </article>
          <article className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-slate-900/80 to-slate-950 p-5 hover:border-emerald-500/40 transition-all hover:shadow-lg hover:shadow-emerald-500/10 card-stagger hover-lift active-scale">
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Solved Questions</p>
            <p className="mt-3 text-5xl font-bold text-emerald-300">
              {solvedQuestions}/{totalQuestions}
            </p>
            <p className="mt-2 text-xs text-emerald-300/60">
              {totalQuestions > 0 ? `${Math.round((solvedQuestions / totalQuestions) * 100)}% success rate` : 'N/A'}
            </p>
          </article>
          {!loadedSession ? (
            <article className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-slate-900/80 to-slate-950 p-5 hover:border-indigo-500/40 transition-all hover:shadow-lg hover:shadow-indigo-500/10 card-stagger hover-lift active-scale">
              <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Duration</p>
              <p className="mt-3 text-5xl font-bold text-indigo-300">{durationMinutes}m</p>
              <p className="mt-2 text-xs text-indigo-300/60">{elapsedInSeconds} seconds</p>
            </article>
          ) : null}
        </section>

        <section className="glass-panel mt-8 rounded-2xl p-6 animate-fadeInUp">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1.5 h-6 bg-gradient-to-b from-purple-400 to-purple-600 rounded"></div>
            <h2 className="text-lg font-bold tracking-wide text-slate-100">Question Breakdown</h2>
          </div>
          <div className="mt-4 space-y-3">
            {(loadedSession ? loadedSession.question_results : questions).map((question, index) => {
              const isResult = !!(question as any).question_id
              const qid = isResult ? (question as any).question_id : (question as any).id
              const qtitle = (question as any).title ?? ''
              const qdiff = (question as any).difficulty ?? ''
              const progress = loadedSession
                ? { attempts: (question as any).attempts, score: (question as any).score, isSolved: (question as any).is_solved }
                : progressByQuestionId[(question as any).id]
              return (
                <article
                  key={qid}
                  className="rounded-xl border border-slate-700/50 bg-slate-950/60 hover:bg-slate-950/80 px-4 py-4 transition-colors card-stagger hover-lift active-scale"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 bg-slate-800 rounded-full w-6 h-6 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold text-slate-100">
                        {qtitle}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      qdiff === 'Easy'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : qdiff === 'Medium'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                    }`}>
                      {qdiff}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      Attempts: <span className="font-semibold text-slate-100">{progress?.attempts ?? 0}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      Score: <span className="font-semibold text-slate-100">{progress?.score ?? 0}</span>
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 font-medium flex items-center gap-1 ${
                        progress?.isSolved
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                      }`}
                    >
                      {progress?.isSolved ? 'Passed' : 'Not Solved'}
                    </span>
                  </div>
                  {loadedSession && (question as any).feedback ? (
                    <p className="mt-3 text-xs text-slate-300 border-l-2 border-slate-700 pl-3">
                      <span className="text-slate-400 font-medium">Feedback:</span> {(question as any).feedback}
                    </p>
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>

        <section className="glass-panel-strong mt-8 rounded-2xl p-6 animate-fadeInUp">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-gradient-to-b from-sky-400 to-blue-500 rounded animate-float"></div>
              <h2 className="text-lg font-bold tracking-wide text-slate-100">Performance Feedback</h2>
            </div>
            {feedback && !isLoadingFeedback && !feedbackError && (
              <button
                onClick={() => setFeedbackExpanded(!feedbackExpanded)}
                className="text-xs font-semibold text-sky-300 hover:text-sky-200 transition-colors px-3 py-1.5 rounded-lg border border-sky-500/30 hover:border-sky-500/50 bg-sky-500/5 hover-scale active-scale"
              >
                {feedbackExpanded ? 'Collapse' : 'Expand'}
              </button>
            )}
          </div>
          
          {isLoadingFeedback ? (
            <div className="flex items-center justify-center py-8 animate-fadeIn">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-slate-600 border-t-sky-400 rounded-full animate-spin"></div>
                <p className="text-slate-400 text-sm">Generating AI feedback...</p>
              </div>
            </div>
          ) : feedbackError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 animate-scaleIn">
              <p className="text-rose-300 text-sm font-medium">Could not load feedback</p>
              <p className="text-rose-200/80 text-xs mt-1">{feedbackError}</p>
            </div>
          ) : feedback ? (
            <div className="space-y-4 animate-fadeIn">
              {/* Collapsed State - Preview */}
              {!feedbackExpanded && (
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 max-h-32 overflow-hidden animate-slideDown">
                  <div className="text-slate-300 text-sm leading-relaxed">
                    <p className="line-clamp-3">{feedback.replace(/\*\*/g, '').substring(0, 300)}...</p>
                  </div>
                  <div className="mt-3 text-center">
                    <span className="text-xs text-slate-400 italic">Click "Expand" to see full feedback</span>
                  </div>
                </div>
              )}

              {/* Expanded State - Full Content with better formatting */}
              {feedbackExpanded && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/20 p-5 max-h-96 overflow-y-auto custom-scrollbar animate-slideDown">
                  <style>{`
                    .feedback-formatted {
                      color: #cbd5e1;
                      line-height: 1.8;
                      font-size: 0.95rem;
                    }
                    .feedback-formatted p {
                      margin: 1rem 0;
                      color: #cbd5e1;
                    }
                    .feedback-formatted strong {
                      color: #f1f5f9;
                      font-weight: 700;
                    }
                    .feedback-formatted .section-title {
                      color: #38bdf8;
                      font-weight: 700;
                      font-size: 1rem;
                      margin: 1.5rem 0 0.75rem 0;
                      padding-bottom: 0.5rem;
                      border-bottom: 2px solid rgba(56, 189, 248, 0.2);
                    }
                    .feedback-formatted ul {
                      list-style: disc;
                      margin-left: 1.5rem;
                      margin-top: 0.75rem;
                      margin-bottom: 0.75rem;
                    }
                    .feedback-formatted li {
                      margin: 0.5rem 0;
                      color: #cbd5e1;
                    }
                  `}</style>
                  <div className="feedback-formatted">
                    {feedback.split(/(?=\*\*\d+\.|### |## )/).map((section, idx) => {
                      const cleaned = section.replace(/\*\*/g, '').trim();
                      
                      if (!cleaned) return null;
                      
                      const isNumberedSection = /^\d+\./.test(cleaned);
                      
                      if (isNumberedSection) {
                        const [title, ...rest] = cleaned.split('-');
                        return (
                          <div key={idx} className="mb-4">
                            <div className="section-title">{title.trim()}</div>
                            <p>{rest.join('-').trim()}</p>
                          </div>
                        );
                      }
                      
                      return (
                        <p key={idx} className="mb-3">
                          {cleaned}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Summary Cards */}
              <div className="mt-5 pt-4 border-t border-slate-700/50 animate-fadeInUp">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-3">Quick Summary</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 hover:bg-emerald-500/10 transition-colors card-stagger hover-lift active-scale cursor-pointer">
                    <p className="text-emerald-300 text-xs font-semibold">Strengths</p>
                    <p className="text-emerald-100/70 text-xs mt-1">Review the feedback above for what you did well.</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 hover:bg-amber-500/10 transition-colors card-stagger hover-lift active-scale cursor-pointer">
                    <p className="text-amber-300 text-xs font-semibold">Growth Areas</p>
                    <p className="text-amber-100/70 text-xs mt-1">Focus on improving these areas for next time.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-center animate-scaleIn">
              <p className="text-slate-400 text-sm italic">No feedback available for this session.</p>
            </div>
          )}

          <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(15, 23, 42, 0.5);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(148, 163, 184, 0.3);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(148, 163, 184, 0.5);
            }
          `}</style>
        </section>

        <div className="mt-10 flex flex-wrap justify-end gap-3 animate-fadeInUp">
          <button
            onClick={() => {
              resetInterview()
              navigate('/setup')
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-600 bg-slate-800/30 text-slate-200 font-semibold hover:bg-slate-800/50 hover:border-slate-500 transition-all hover-lift active-scale btn-animate"
          >
            Start New Interview
          </button>
          <button
            onClick={() => {
              resetInterview()
              navigate('/dashboard')
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-semibold hover:brightness-110 transition-all hover-lift active-scale btn-animate"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </main>
  )
}



