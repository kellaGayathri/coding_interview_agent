import { MOCK_QUESTIONS } from '../data/mockQuestions'
import type {
  DashboardOverview,
  DifficultyLevel,
  InterviewQuestion,
  InterviewSummary,
  ResumableInterviewSnapshot,
  RunCodePayload,
  RunCodeResponse,
  SubmitCodePayload,
  SubmitCodeResponse,
} from '../types/interview'

const HISTORY_STORAGE_KEY = 'cia.interview.history.v2'
const RESUME_STORAGE_KEY = 'cia.interview.resume.v1'
const QUESTION_SET_DELAY_MS = 450
const RUN_DELAY_MS = 800
const SUBMIT_DELAY_MS = 950

const SCORE_BY_DIFFICULTY: Record<DifficultyLevel, number> = {
  Easy: 20,
  Medium: 35,
  Hard: 55,
}
const DEFAULT_INTERVIEW_DURATION_IN_SECONDS = 45 * 60
const SUPPORTED_LANGUAGES = new Set(['typescript', 'javascript', 'python', 'java'])

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const containsKeyword = (code: string, keyword: string) =>
  code.toLowerCase().includes(keyword.toLowerCase())

const transpileTypeScriptLite = (source: string): string =>
  source
    .replace(/\bexport\s+default\b/g, '')
    .replace(/\bexport\s+/g, '')
    .replace(/:\s*[^=;,){}]+(?=\s*[=;,){}])/g, '')

const executeJavaScriptLikeCode = (source: string): { status: RunCodeResponse['status']; output: string } => {
  const logs: string[] = []
  const sandboxConsole = {
    log: (...items: unknown[]) => {
      logs.push(items.map((item) => String(item)).join(' '))
    },
  }

  try {
    const runner = new Function('console', `${source}\nreturn undefined;`)
    runner(sandboxConsole)

    return {
      status: 'success',
      output: logs.length ? logs.join('\n') : 'Execution complete. No console output.',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown execution error.'
    return {
      status: 'error',
      output: `Execution Error: ${message}`,
    }
  }
}

const cloneQuestion = (question: InterviewQuestion): InterviewQuestion => ({
  ...question,
  tags: [...question.tags],
  constraints: [...question.constraints],
  examples: question.examples.map((example) => ({ ...example })),
  starterCode: { ...question.starterCode },
})

const shuffle = <T,>(items: T[]): T[] => {
  const clone = [...items]
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = clone[index]
    clone[index] = clone[swapIndex]
    clone[swapIndex] = temp
  }
  return clone
}

const readHistory = (): InterviewSummary[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as InterviewSummary[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map((item) => ({
      ...item,
      status: item.status === 'completed' ? 'completed' : 'attempted',
    }))
  } catch {
    return []
  }
}

const writeHistory = (history: InterviewSummary[]) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 60)))
}

const readResumeStore = (): Record<string, ResumableInterviewSnapshot> => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(RESUME_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Record<string, ResumableInterviewSnapshot>
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return parsed
  } catch {
    return {}
  }
}

const writeResumeStore = (store: Record<string, ResumableInterviewSnapshot>) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(store))
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const buildCodeMap = (
  questions: InterviewQuestion[],
  language: 'typescript' | 'javascript' | 'python' | 'java',
) =>
  questions.reduce<Record<string, string>>((accumulator, question) => {
    accumulator[question.id] = question.starterCode[language]
    return accumulator
  }, {})

const normalizeLanguage = (language: InterviewSummary['setupLanguage']) =>
  language && SUPPORTED_LANGUAGES.has(language) ? language : 'typescript'

export async function fetchInterviewQuestions(): Promise<InterviewQuestion[]> {
  await delay(QUESTION_SET_DELAY_MS)

  const easy = MOCK_QUESTIONS.filter((question) => question.difficulty === 'Easy').slice(0, 2)
  const medium = MOCK_QUESTIONS.filter((question) => question.difficulty === 'Medium').slice(0, 2)
  const hard = MOCK_QUESTIONS.filter((question) => question.difficulty === 'Hard').slice(0, 1)

  const questionSet = [...easy, ...medium, ...hard].map(cloneQuestion)
  return shuffle(questionSet)
}

export async function runCode(payload: RunCodePayload): Promise<RunCodeResponse> {
  await delay(RUN_DELAY_MS)

  const trimmedCode = payload.code.trim()
  if (!trimmedCode) {
    return {
      status: 'error',
      output: 'No code to execute. Write logic before running.',
      executionTimeMs: 0,
    }
  }

  if (payload.language === 'javascript' || payload.language === 'typescript') {
    const executableSource =
      payload.language === 'typescript' ? transpileTypeScriptLite(trimmedCode) : trimmedCode
    const executionResult = executeJavaScriptLikeCode(executableSource)
    return {
      status: executionResult.status,
      output: executionResult.output,
      executionTimeMs: executionResult.status === 'success' ? randomInt(12, 88) : 0,
    }
  }

  if (containsKeyword(trimmedCode, 'error')) {
    return {
      status: 'error',
      output: 'Runtime Error: simulated crash triggered by `error` keyword.',
      executionTimeMs: 0,
    }
  }

  if (containsKeyword(trimmedCode, 'correct')) {
    return {
      status: 'success',
      output: 'Dry run completed: sample tests passed successfully.',
      executionTimeMs: randomInt(18, 96),
    }
  }

  return {
    status: 'error',
    output: 'Dry run failed: sample testcases did not pass.',
    executionTimeMs: randomInt(20, 110),
  }
}

export async function submitCode(payload: SubmitCodePayload): Promise<SubmitCodeResponse> {
  await delay(SUBMIT_DELAY_MS)

  const passed = containsKeyword(payload.code, 'correct')
  const awardedScore = passed ? SCORE_BY_DIFFICULTY[payload.difficulty] : 0

  return {
    status: passed ? 'passed' : 'failed',
    output: passed
      ? 'Submission passed all mocked hidden testcases.'
      : 'Submission failed mocked hidden testcases.',
    awardedScore,
    feedback: passed
      ? `Great work. ${payload.difficulty} question solved and scored.`
      : 'Try another approach and rerun tests. Hint unlocks after 2 failed attempts.',
    executionTimeMs: randomInt(22, 128),
  }
}

export async function saveInterviewSummary(summary: InterviewSummary): Promise<void> {
  await delay(180)
  const history = readHistory()
  writeHistory([summary, ...history])
}

export async function saveResumableInterview(snapshot: ResumableInterviewSnapshot): Promise<void> {
  await delay(120)
  const store = readResumeStore()
  writeResumeStore({
    ...store,
    [snapshot.userId]: snapshot,
  })
}

export async function getResumableInterview(userId: string): Promise<ResumableInterviewSnapshot | null> {
  await delay(140)
  const store = readResumeStore()
  return store[userId] ?? null
}

export async function clearResumableInterview(userId: string): Promise<void> {
  await delay(80)
  const store = readResumeStore()
  if (!store[userId]) {
    return
  }
  const nextStore = { ...store }
  delete nextStore[userId]
  writeResumeStore(nextStore)
}

export function createResumableInterviewFromSummary(
  summary: InterviewSummary,
): ResumableInterviewSnapshot | null {
  if (summary.status !== 'attempted') {
    return null
  }

  const questionIds = summary.questionResults.map((result) => result.questionId).filter(Boolean)
  if (!questionIds.length) {
    return null
  }

  const questionMap = MOCK_QUESTIONS.reduce<Record<string, InterviewQuestion>>((accumulator, question) => {
    accumulator[question.id] = question
    return accumulator
  }, {})
  const orderedQuestions = questionIds.map((questionId) => questionMap[questionId]).filter(Boolean)
  if (orderedQuestions.length !== questionIds.length) {
    return null
  }

  const questions = orderedQuestions.map(cloneQuestion)
  const progressByQuestionId = summary.questionResults.reduce<Record<string, ResumableInterviewSnapshot['progressByQuestionId'][string]>>(
    (accumulator, result) => {
      accumulator[result.questionId] = {
        questionId: result.questionId,
        attempts: result.attempts,
        score: result.score,
        isSolved: result.isSolved,
      }
      return accumulator
    },
    {},
  )

  const language = normalizeLanguage(summary.setupLanguage)
  const durationInSeconds = summary.durationInSeconds ?? DEFAULT_INTERVIEW_DURATION_IN_SECONDS
  const firstUnsolvedIndex = questions.findIndex((question) => !progressByQuestionId[question.id]?.isSolved)
  const fallbackIndex = firstUnsolvedIndex === -1 ? Math.max(0, questions.length - 1) : firstUnsolvedIndex
  const currentQuestionIndex = clamp(
    summary.currentQuestionIndex ?? fallbackIndex,
    0,
    Math.max(0, questions.length - 1),
  )

  return {
    summaryId: summary.id,
    userId: summary.userId,
    setup: {
      language,
      durationInSeconds,
    },
    questions,
    currentQuestionIndex,
    codeByQuestionId: buildCodeMap(questions, language),
    progressByQuestionId,
    totalScore: summary.totalScore,
    elapsedInSeconds: summary.elapsedInSeconds ?? 0,
    startedAt: summary.startedAt ?? summary.completedAt,
    savedAt: new Date().toISOString(),
  }
}

export async function getInterviewHistory(userId: string): Promise<InterviewSummary[]> {
  await delay(220)
  const history = readHistory()
  return history.filter((item) => item.userId === userId)
}

export async function getDashboardOverview(userId: string): Promise<DashboardOverview> {
  await delay(260)
  const history = readHistory().filter((item) => item.userId === userId)

  if (!history.length) {
    return {
      totalInterviews: 0,
      totalScore: 0,
      averageScore: 0,
      feedbackSummary: 'Complete your first interview to unlock analytics.',
      completionRate: 0,
      recentInterviews: [],
    }
  }

  const totalInterviews = history.length
  const totalScore = history.reduce((sum, item) => sum + item.totalScore, 0)
  const totalSolved = history.reduce((sum, item) => sum + item.solvedQuestions, 0)
  const totalQuestions = history.reduce((sum, item) => sum + item.totalQuestions, 0)
  const averageScore = Math.round(totalScore / totalInterviews)
  const completionRate = totalQuestions ? Math.round((totalSolved / totalQuestions) * 100) : 0

  return {
    totalInterviews,
    totalScore,
    averageScore,
    completionRate,
    feedbackSummary: history[0].feedbackSummary,
    recentInterviews: history.slice(0, 5),
  }
}

export function getScoreForDifficulty(difficulty: DifficultyLevel): number {
  return SCORE_BY_DIFFICULTY[difficulty]
}
