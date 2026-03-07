import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Timer } from '../components/interview/Timer'
import { useAuth } from '../context/authContext'
import { useInterviewSession } from '../hooks/useInterviewSession'
import {
  clearActiveInterviewId,
  executeCode,
  generateFeedback,
  getActiveInterviewId,
  getActiveInterviewSetup,
  getInterviewById,
  getSolution,
  markInterviewCompleted,
  runCode,
  setActiveInterviewSetup,
  saveInterviewSession,
} from '../services/interviewApi'
import type { CodeExecutionStatus, RunCodeResponse } from '../types/interview'
import { buildInterviewSnapshot } from '../utils/interviewSessionSnapshot'
import { QuestionPage } from './QuestionPage'

type TestcaseSummary = {
  passed: number
  total: number
}

type FeedbackSection = {
  title: string
  points: string[]
}

const difficultyMaxScore: Record<'Easy' | 'Medium' | 'Hard', number> = {
  Easy: 5,
  Medium: 10,
  Hard: 20,
}

const KNOWN_FEEDBACK_SECTION_TITLES = new Set([
  'overall summary',
  'strengths',
  'weaknesses',
  'improvement plan',
  'final verdict',
  'assessment',
  'recommendation',
  'recommendations',
  'next steps',
  'result',
])

const toTitleCase = (value: string) => value.replace(/\b\w/g, (char) => char.toUpperCase())

const stripMarkdownTokens = (line: string) =>
  line
    .replace(/^>\s?/, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim()

const parseFeedbackHeading = (line: string): { title: string; trailing?: string } | null => {
  const trimmed = line.trim()
  if (!trimmed) {
    return null
  }

  const normalized = stripMarkdownTokens(trimmed).replace(/^[-*•]\s*/, '').trim()
  if (!normalized) {
    return null
  }

  const numberedHeading = normalized.match(/^\d+[.)]\s*([^:]+?)(?:\s*:\s*(.*))?$/)
  if (numberedHeading) {
    const title = numberedHeading[1].trim()
    const trailing = numberedHeading[2]?.trim()
    return {
      title: toTitleCase(title.toLowerCase()),
      trailing: trailing || undefined,
    }
  }

  const knownHeading = normalized.match(
    /^(overall summary|strengths|weaknesses|improvement plan|final verdict|assessment|recommendations?|next steps?|result)\s*:?\s*(.*)$/i,
  )
  if (knownHeading) {
    const title = knownHeading[1].trim()
    const trailing = knownHeading[2]?.trim()
    return {
      title: toTitleCase(title.toLowerCase()),
      trailing: trailing || undefined,
    }
  }

  const headingOnly = normalized.match(/^([A-Za-z][A-Za-z\s/&-]{2,36})\s*:$/)
  if (headingOnly) {
    const title = headingOnly[1].trim()
    if (KNOWN_FEEDBACK_SECTION_TITLES.has(title.toLowerCase())) {
      return { title: toTitleCase(title.toLowerCase()) }
    }
  }

  return null
}

const parseFeedbackSections = (raw: string): FeedbackSection[] => {
  const cleaned = raw.replace(/\r\n/g, '\n').trim()
  if (!cleaned) {
    return []
  }

  const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean)
  const sections: FeedbackSection[] = []
  let current: FeedbackSection = { title: 'Feedback', points: [] }

  const pushCurrent = () => {
    if (current.points.length) {
      sections.push(current)
    }
  }

  for (const line of lines) {
    const headingMatch = parseFeedbackHeading(line)
    if (headingMatch) {
      pushCurrent()
      current = {
        title: headingMatch.title,
        points: [],
      }
      const trailing = headingMatch.trailing?.trim()
      if (trailing) {
        current.points.push(trailing)
      }
      continue
    }

    const bulletPoint = stripMarkdownTokens(line).replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim()
    if (bulletPoint) {
      current.points.push(bulletPoint)
    }
  }

  pushCurrent()

  if (!sections.length) {
    return [{ title: 'Feedback', points: lines }]
  }

  return sections
}

export function InterviewPage() {
  const navigate = useNavigate()
  const { user, isReady } = useAuth()
  const hasCompletedFinalizedRef = useRef(false)

  const {
    setup,
    questions,
    currentQuestionIndex,
    currentQuestion,
    currentCode,
    currentProgress,
    progressByQuestionId,
    totalScore,
    elapsedInSeconds,
    updateCode,
    updateLanguage,
    registerSubmission,
    setCurrentQuestionIndex,
    goToNextQuestion,
    completeInterview,
    setElapsedInSeconds,
    resetInterview,
    restoreInterview,
  } = useInterviewSession()

  const [runStatus, setRunStatus] = useState<CodeExecutionStatus>('idle')
  const [output, setOutput] = useState<RunCodeResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [hintVisibilityByQuestionId, setHintVisibilityByQuestionId] = useState<Record<string, boolean>>({})
  const [solutionVisibilityByQuestionId, setSolutionVisibilityByQuestionId] = useState<Record<string, boolean>>({})
  const [solutionByQuestionId, setSolutionByQuestionId] = useState<Record<string, string>>({})
  const [solutionLoadingByQuestionId, setSolutionLoadingByQuestionId] = useState<Record<string, boolean>>({})
  const [solutionErrorByQuestionId, setSolutionErrorByQuestionId] = useState<Record<string, string>>({})
  const [isExitModalOpen, setIsExitModalOpen] = useState(false)
  const [isHydrating, setIsHydrating] = useState(false)
  const [isQuestionViewOpen, setIsQuestionViewOpen] = useState(false)
  const [testcaseSummaryByQuestionId, setTestcaseSummaryByQuestionId] = useState<Record<string, TestcaseSummary>>({})
  const [interviewFeedback, setInterviewFeedback] = useState<string | null>(null)
  const [interviewFeedbackError, setInterviewFeedbackError] = useState<string | null>(null)
  const [isSubmittingInterview, setIsSubmittingInterview] = useState(false)

  useEffect(() => {
    if (isReady && !user) {
      navigate('/login', { replace: true })
    }
  }, [isReady, navigate, user])

  useEffect(() => {
    let isMounted = true
    const hydrate = async () => {
      if (setup && questions.length && currentQuestion) {
        return
      }

      const interviewId = getActiveInterviewId()
      if (!interviewId) {
        navigate('/setup', { replace: true })
        return
      }

      setIsHydrating(true)
      try {
        const interview = await getInterviewById(interviewId)
        if (interview.status === 'completed') {
          clearActiveInterviewId()
          navigate('/dashboard', { replace: true })
          return
        }

        const storedSetup = getActiveInterviewSetup(interviewId)
        const language = storedSetup?.language ?? 'python'
        const durationInSeconds = storedSetup?.durationInSeconds ?? 45 * 60

        if (!isMounted) {
          return
        }

        const snapshot = buildInterviewSnapshot({
          interview: {
            ...interview,
            status: interview.status === 'completed' ? 'completed' : 'in_progress',
            score: interview.total_score,
            questions: interview.question_results.map((qr) => ({
              question_id: qr.question_id,
              external_id: qr.question_id,
              title: qr.title || '',
              statement: '',
              difficulty: (qr.difficulty as any) || 'Easy',
              tags: [],
              constraints: [],
              examples: [],
              hint: '',
              starter_code: { typescript: '', javascript: '', python: '', java: '' },
              estimated_minutes: 0,
              order_index: 0,
              attempts: qr.attempts,
              is_solved: qr.is_solved,
              earned_score: qr.score,
              max_score: qr.score,
            })),
          },
          userId: user?.id ?? '',
          language,
          durationInSeconds,
        })

        resetInterview()
        restoreInterview(snapshot)
        setActiveInterviewSetup({
          interview_id: interviewId,
          language,
          duration_in_seconds: durationInSeconds,
        })
      } catch {
        if (isMounted) {
          navigate('/setup', { replace: true })
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false)
        }
      }
    }
    void hydrate()
    return () => {
      isMounted = false
    }
  }, [currentQuestion, navigate, questions.length, resetInterview, restoreInterview, setup, user?.id])

  useEffect(() => {
    setRunStatus('idle')
    setOutput(null)
    setFeedbackMessage(null)
  }, [currentQuestion?.id])

  const finalizeInterview = async () => {
    if (hasCompletedFinalizedRef.current) {
      return
    }
    hasCompletedFinalizedRef.current = true

    // persist session to backend (best effort)
    const interviewId = getActiveInterviewId()
    if (interviewId) {
      const session = {
        user_id: user?.id ?? 'anonymous',
        status: 'completed',
        started_at: '', // backend will default if needed
        completed_at: new Date().toISOString(),
        total_score: totalScore,
        feedback_summary: interviewFeedback ?? '',
        question_results: questions.map((q) => {
          const prog = progressByQuestionId[q.id]
          return {
            question_id: q.id,
            title: q.title,
            difficulty: q.difficulty,
            attempts: prog?.attempts ?? 0,
            score: prog?.score ?? 0,
            is_solved: prog?.isSolved ?? false,
            feedback: undefined,
          }
        }),
      }
      try {
        await saveInterviewSession(session)
      } catch {
        // ignore errors
      }
    }

    markInterviewCompleted(interviewId ?? undefined)
    clearActiveInterviewId()
    completeInterview()
    navigate('/result')
  }

  const handleRunCode = async () => {
    if (!setup || !currentQuestion) {
      return
    }

    if (!currentCode.trim()) {
      setRunStatus('error')
      setOutput({
        status: 'error',
        output: 'No code to execute.',
        executionTimeMs: 0,
      })
      return
    }

    const questionId = currentQuestion.id
    setRunStatus('running')
    setFeedbackMessage(null)
    try {
      const response = await runCode({
        question_id: questionId,
        source_code: currentCode,
        language: setup.language,
      })

      const passed = response.failed_count === 0
      setTestcaseSummaryByQuestionId((current) => ({
        ...current,
        [questionId]: {
          passed: response.passed_count,
          total: response.total_testcases,
        },
      }))

      setOutput({
        status: passed ? 'success' : 'error',
        output: passed ? 'Run complete. All testcases passed.' : 'Run complete. Some testcases failed.',
        executionTimeMs: 0,
        comparisons: response.results.map((item) => ({
          testcaseId: item.testcase_id,
          testcaseInput: item.testcase_input ?? '',
          expectedOutput: item.expected_output,
          actualOutput: item.output,
          judge0Status: item.judge0_status ?? '',
          passed: item.passed,
          error: item.error,
        })),
      })
      setRunStatus(passed ? 'success' : 'error')
    } catch (error) {
      setOutput({
        status: 'error',
        output: error instanceof Error ? error.message : 'Run failed. Please retry.',
        executionTimeMs: 0,
      })
      setRunStatus('error')
    }
  }

  const handleSubmitCode = async () => {
    if (!setup || !currentQuestion || !currentProgress) {
      return
    }

    const questionId = currentQuestion.id
    setIsSubmitting(true)
    setRunStatus('running')
    try {
      const response = await executeCode({
        question_id: questionId,
        source_code: currentCode,
        language: setup.language,
        record_attempt: true,
      })

      const passed = response.failed_count === 0
      const awardedScore = Math.max(0, response.earned_score - currentProgress.score)
      registerSubmission({ passed: response.is_solved, awardedScore })

      setTestcaseSummaryByQuestionId((current) => ({
        ...current,
        [questionId]: {
          passed: response.passed_count,
          total: response.total_testcases,
        },
      }))

      setOutput({
        status: passed ? 'success' : 'error',
        output: passed
          ? `Submission complete. Passed ${response.passed_count}/${response.total_testcases}.`
          : `Submission complete. Passed ${response.passed_count}/${response.total_testcases}.`,
        executionTimeMs: 0,
        comparisons: response.results.map((item) => ({
          testcaseId: item.testcase_id,
          testcaseInput: item.testcase_input ?? '',
          expectedOutput: item.expected_output,
          actualOutput: item.output,
          judge0Status: item.judge0_status ?? '',
          passed: item.passed,
          error: item.error,
        })),
      })
      setRunStatus(passed ? 'success' : 'error')

      if (response.is_solved) {
        setFeedbackMessage('Question solved. Great work.')
      } else {
        setFeedbackMessage('Not solved yet. Review failing output and retry.')
      }
    } catch (error) {
      setOutput({
        status: 'error',
        output: error instanceof Error ? error.message : 'Submission failed. Please retry.',
        executionTimeMs: 0,
      })
      setRunStatus('error')
      setFeedbackMessage('Submission failed unexpectedly. Please retry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTimerExpiry = () => {
    setFeedbackMessage('Timer ended. Submit remaining solutions or exit interview.')
  }

  const handleSubmitInterview = async () => {
    setIsSubmittingInterview(true)
    setInterviewFeedbackError(null)
    try {
      const generated = await generateFeedback(totalScore)
      setInterviewFeedback(generated)
      markInterviewCompleted(getActiveInterviewId() ?? undefined)

      // persist session immediately so feedback is available later
      const interviewId = getActiveInterviewId()
      if (interviewId) {
        const sessionPayload: import('../types/api').InterviewSessionCreateRequest = {
          user_id: user?.id ?? 'anonymous',
          status: 'completed',
          started_at: '',
          completed_at: new Date().toISOString(),
          total_score: totalScore,
          feedback_summary: generated,
          question_results: questions.map((q) => {
            const prog = progressByQuestionId[q.id]
            return {
              question_id: q.id,
              title: q.title,
              difficulty: q.difficulty,
              attempts: prog?.attempts ?? 0,
              score: prog?.score ?? 0,
              is_solved: prog?.isSolved ?? false,
            }
          }),
        }
        try {
          await saveInterviewSession(sessionPayload)
        } catch {
          // ignore
        }
      }
    } catch (error) {
      setInterviewFeedbackError(error instanceof Error ? error.message : 'Could not generate feedback.')
    } finally {
      setIsSubmittingInterview(false)
    }
  }

  const fetchSolution = async (question: (typeof questions)[number], attempts: number) => {
    const questionId = question.id
    setSolutionLoadingByQuestionId((current) => ({
      ...current,
      [questionId]: true,
    }))
    setSolutionErrorByQuestionId((current) => ({
      ...current,
      [questionId]: '',
    }))

    try {
      const solution = await getSolution({
        questionTitle: question.title,
        questionStatement: question.statement,
        difficulty: question.difficulty,
        attempts,
      })
      setSolutionByQuestionId((current) => ({
        ...current,
        [questionId]: solution,
      }))
    } catch (error) {
      setSolutionErrorByQuestionId((current) => ({
        ...current,
        [questionId]: error instanceof Error ? error.message : 'Failed to fetch solution',
      }))
    } finally {
      setSolutionLoadingByQuestionId((current) => ({
        ...current,
        [questionId]: false,
      }))
    }
  }

  if (isHydrating || !setup || !currentQuestion || !currentProgress) {
    return null
  }

  const isHintEnabled = currentProgress.attempts >= 2 && !currentProgress.isSolved
  const isHintVisible = Boolean(hintVisibilityByQuestionId[currentQuestion.id])
  const solvedCount = Object.values(progressByQuestionId).filter((progress) => progress.isSolved).length
  const canExitInterview = solvedCount === questions.length
  const currentTestcaseSummary = testcaseSummaryByQuestionId[currentQuestion.id]
  const allCurrentTestcasesPassed = Boolean(
    currentTestcaseSummary &&
      currentTestcaseSummary.total > 0 &&
      currentTestcaseSummary.passed === currentTestcaseSummary.total,
  )
  const canGoToNextQuestion =
    (currentProgress.isSolved || allCurrentTestcasesPassed) && currentQuestionIndex < questions.length - 1
  const feedbackSections = interviewFeedback ? parseFeedbackSections(interviewFeedback) : []
  const feedbackGridClass =
    feedbackSections.length <= 1
      ? 'grid-cols-1'
      : feedbackSections.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'

  return (
    <main className="page-shell">
      <div className="page-aurora" />
      <div className="page-grid" />

      <div className="relative mx-auto flex w-full max-w-[1700px] flex-col gap-4 px-4 py-4 lg:px-6">
        <header className="glass-panel-strong rounded-2xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Interview In Progress</p>
              <h1 className="font-title mt-1 text-lg font-semibold">
                {isQuestionViewOpen ? currentQuestion.title : 'Questions'}
              </h1>
              <p className="mt-1 text-xs text-slate-400">Solved {solvedCount} / {questions.length}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Timer
                totalSeconds={setup.durationInSeconds}
                elapsedSeconds={elapsedInSeconds}
                isPaused={isSubmitting}
                onTick={setElapsedInSeconds}
                onExpire={handleTimerExpiry}
              />
              <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
                Total Score: <span className="font-semibold text-sky-300">{totalScore}</span>
              </div>
              {isQuestionViewOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsQuestionViewOpen(false)
                  }}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                >
                  Back To Questions
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void handleSubmitInterview()
                }}
                disabled={isSubmittingInterview}
                className="rounded-lg border border-cyan-500/60 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingInterview ? 'Submitting...' : interviewFeedback ? 'Regenerate Feedback' : 'Submit Interview'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExitModalOpen(true)
                }}
                className="text-sm font-semibold text-slate-300 transition hover:text-slate-100"
              >
                Exit
              </button>
            </div>
          </div>
        </header>

        {(isSubmittingInterview || interviewFeedbackError || interviewFeedback) && (
          <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-cyan-950/20 p-5 shadow-[0_14px_28px_rgba(2,6,23,0.35)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Interview Feedback</h2>
              <span className="rounded-full border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                Score {totalScore}
              </span>
            </div>

            {isSubmittingInterview ? (
              <div className="mt-4 space-y-2">
                <div className="h-3 w-44 animate-pulse rounded bg-slate-700/70" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-800/70" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-slate-800/70" />
              </div>
            ) : null}

            {interviewFeedbackError ? (
              <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {interviewFeedbackError}
              </p>
            ) : null}

            {feedbackSections.length ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <article className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-cyan-200/90">Final Score</p>
                    <p className="mt-1 text-base font-semibold text-cyan-100">{totalScore}</p>
                  </article>
                  <article className="rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Solved</p>
                    <p className="mt-1 text-base font-semibold text-slate-100">
                      {solvedCount} / {questions.length}
                    </p>
                  </article>
                  <article className="rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Feedback Sections</p>
                    <p className="mt-1 text-base font-semibold text-slate-100">{feedbackSections.length}</p>
                  </article>
                  <article className="rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Interview Status</p>
                    <p className="mt-1 text-base font-semibold text-slate-100">
                      {solvedCount === questions.length ? 'Completed' : 'Submitted'}
                    </p>
                  </article>
                </div>

                <div className={`mt-4 grid gap-3 ${feedbackGridClass}`}>
                  {feedbackSections.map((section, sectionIndex) => (
                    <article
                      key={`${section.title}-${sectionIndex}`}
                      className="rounded-xl border border-slate-700/70 bg-slate-950/70 p-4 shadow-[inset_0_1px_0_rgba(148,163,184,0.08)]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                          Section {sectionIndex + 1}
                        </span>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-200">{section.title}</h3>
                      </div>

                      <ul className="mt-3 space-y-2">
                        {section.points.map((point, index) => (
                          <li key={`${section.title}-${index}`} className="flex items-start gap-2 text-sm text-slate-100">
                            <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/90" />
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </>
            ) : null}

            {interviewFeedback && !feedbackSections.length ? (
              <pre className="mt-3 whitespace-pre-wrap rounded-md border border-slate-700/70 bg-slate-950/65 p-3 text-sm text-slate-100">
                {interviewFeedback}
              </pre>
            ) : null}
          </section>
        )}

        {!isQuestionViewOpen ? (
          <section className="glass-panel overflow-hidden rounded-2xl">
            <div className="hidden grid-cols-[2.4fr_0.8fr_1fr_0.9fr_1fr_auto] border-b border-slate-700/70 bg-slate-900/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:grid">
              <p>Question</p>
              <p>Difficulty</p>
              <p>Testcases Passed</p>
              <p>Score</p>
              <p>Status</p>
              <p className="text-right">Open</p>
            </div>

            <div className="divide-y divide-slate-800/70">
              {questions.map((question, index) => {
                const progress = progressByQuestionId[question.id]
                const testcaseSummary = testcaseSummaryByQuestionId[question.id]
                const scoreCap = question.maxScore ?? difficultyMaxScore[question.difficulty]
                const score = progress?.score ?? 0
                const statusLabel = progress?.isSolved
                  ? 'Solved'
                  : (progress?.attempts ?? 0) > 0
                    ? 'In Progress'
                    : 'Not Attempted'
                const statusClass = progress?.isSolved
                  ? 'text-emerald-300'
                  : (progress?.attempts ?? 0) > 0
                    ? 'text-amber-300'
                    : 'text-slate-300'
                const isActive = index === currentQuestionIndex

                return (
                  <div
                    key={question.id}
                    className={`grid gap-3 px-4 py-3 md:grid-cols-[2.4fr_0.8fr_1fr_0.9fr_1fr_auto] md:items-center ${
                      isActive ? 'bg-slate-800/45' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{question.title}</p>
                    </div>

                    <p className="text-xs text-slate-300">{question.difficulty}</p>

                    <p className="text-xs text-slate-200">
                      {testcaseSummary ? `${testcaseSummary.passed}/${testcaseSummary.total}` : '-/-'}
                    </p>

                    <p className="text-xs text-slate-200">
                      {score}/{scoreCap}
                    </p>

                    <p className={`text-xs font-semibold uppercase tracking-wide ${statusClass}`}>{statusLabel}</p>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentQuestionIndex(index)
                          setIsQuestionViewOpen(true)
                        }}
                        disabled={isSubmitting || runStatus === 'running'}
                        className="rounded-md border border-slate-600 px-2 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : (
          <>
            <QuestionPage
              question={currentQuestion}
              attempts={currentProgress.attempts}
              isHintEnabled={isHintEnabled}
              isHintVisible={isHintVisible}
              isSolutionVisible={Boolean(solutionVisibilityByQuestionId[currentQuestion.id])}
              onToggleHint={() => {
                if (!isHintEnabled) {
                  return
                }
                setHintVisibilityByQuestionId((current) => ({
                  ...current,
                  [currentQuestion.id]: !current[currentQuestion.id],
                }))
              }}
              onToggleSolution={() => {
                if (currentProgress.attempts < 3) {
                  return
                }
                const questionId = currentQuestion.id
                const isVisible = Boolean(solutionVisibilityByQuestionId[questionId])
                
                if (!isVisible) {
                  // Fetch solution if not already fetched
                  if (!solutionByQuestionId[questionId]) {
                    void fetchSolution(currentQuestion, currentProgress.attempts)
                  }
                }
                
                setSolutionVisibilityByQuestionId((current) => ({
                  ...current,
                  [questionId]: !current[questionId],
                }))
              }}
              code={currentCode}
              language={setup.language}
              onCodeChange={updateCode}
              onLanguageChange={(nextLanguage) => {
                updateLanguage(nextLanguage)
                const interviewId = getActiveInterviewId()
                if (!interviewId) {
                  return
                }
                setActiveInterviewSetup({
                  interview_id: interviewId,
                  language: nextLanguage,
                  duration_in_seconds: setup.durationInSeconds,
                })
              }}
              onRunCode={() => {
                void handleRunCode()
              }}
              onSubmitCode={() => {
                void handleSubmitCode()
              }}
              runStatus={runStatus}
              output={output}
              isSubmitting={isSubmitting}
              isSolved={currentProgress.isSolved}
              questionScore={currentProgress.score}
              totalScore={totalScore}
              feedbackMessage={feedbackMessage}
              solution={solutionByQuestionId[currentQuestion.id] || ''}
              isSolutionLoading={Boolean(solutionLoadingByQuestionId[currentQuestion.id])}
              solutionError={solutionErrorByQuestionId[currentQuestion.id]}
            />

            {canGoToNextQuestion ? (
              <div className="flex justify-end">
                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={goToNextQuestion}
                  className="rounded-xl border border-cyan-300/45 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25"
                >
                  Next Question
                </motion.button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {isExitModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <motion.section
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.7)]"
          >
            <h2 className="text-lg font-semibold text-slate-100">Exit Interview?</h2>
            <p className="mt-2 text-sm text-slate-300">
              {canExitInterview
                ? `Your current total score is ${totalScore}. Exit and view final summary?`
                : `You still have unsolved questions. You can exit now and return to dashboard.`}
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsExitModalOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
              >
                Stay
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExitModalOpen(false)
                  if (canExitInterview) {
                    finalizeInterview()
                    return
                  }
                  clearActiveInterviewId()
                  resetInterview()
                  navigate('/dashboard')
                }}
                className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Exit
              </button>
            </div>
          </motion.section>
        </div>
      ) : null}
    </main>
  )
}
