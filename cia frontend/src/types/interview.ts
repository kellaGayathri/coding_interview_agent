export const PROGRAMMING_LANGUAGES = ['typescript', 'javascript', 'python', 'java'] as const
export type ProgrammingLanguage = (typeof PROGRAMMING_LANGUAGES)[number]

export const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'] as const
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number]

export interface QuestionExample {
  input: string
  output: string
  explanation?: string
}

export interface InterviewQuestion {
  id: string
  title: string
  statement: string
  difficulty: DifficultyLevel
  maxScore?: number
  tags: string[]
  constraints: string[]
  examples: QuestionExample[]
  hint: string
  starterCode: Record<ProgrammingLanguage, string>
  estimatedMinutes: number
}

export interface InterviewSetup {
  language: ProgrammingLanguage
  durationInSeconds: number
}

export interface RunCodePayload {
  questionId: string
  language: ProgrammingLanguage
  code: string
}

export type RunCodeStatus = 'success' | 'error'
export type CodeExecutionStatus = RunCodeStatus | 'idle' | 'running'

export interface RunCodeResponse {
  status: RunCodeStatus
  output: string
  executionTimeMs: number
  comparisons?: Array<{
    testcaseId: string
    testcaseInput?: string
    expectedOutput: string
    actualOutput: string
    judge0Status?: string
    passed: boolean
    error: string | null
  }>
}

export interface SubmitCodePayload extends RunCodePayload {
  difficulty: DifficultyLevel
}

export interface SubmitCodeResponse {
  status: 'passed' | 'failed'
  output: string
  awardedScore: number
  feedback: string
  executionTimeMs: number
}

export interface QuestionProgress {
  questionId: string
  attempts: number
  score: number
  isSolved: boolean
}

export interface InterviewQuestionResult extends QuestionProgress {
  title: string
  difficulty: DifficultyLevel
  feedback?: string
}

export interface InterviewSummary {
  id: string
  userId: string
  userName: string
  status: 'completed' | 'attempted'
  setupLanguage?: ProgrammingLanguage
  durationInSeconds?: number
  currentQuestionIndex?: number
  elapsedInSeconds?: number
  startedAt?: string
  totalQuestions: number
  solvedQuestions: number
  totalScore: number
  feedbackSummary: string
  completedAt: string
  questionResults: InterviewQuestionResult[]
}

export interface ResumableInterviewSnapshot {
  summaryId: string
  userId: string
  setup: InterviewSetup
  questions: InterviewQuestion[]
  currentQuestionIndex: number
  codeByQuestionId: Record<string, string>
  progressByQuestionId: Record<string, QuestionProgress>
  totalScore: number
  elapsedInSeconds: number
  startedAt: string
  savedAt: string
}

export interface DashboardOverview {
  totalInterviews: number
  totalScore: number
  averageScore: number
  feedbackSummary: string
  completionRate: number
  recentInterviews: InterviewSummary[]
}
