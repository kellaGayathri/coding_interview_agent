import { createContext } from 'react'
import type {
  InterviewQuestion,
  InterviewSetup,
  ProgrammingLanguage,
  QuestionProgress,
  ResumableInterviewSnapshot,
} from '../types/interview'

export type InterviewSessionState = {
  setup: InterviewSetup | null
  questions: InterviewQuestion[]
  currentQuestionIndex: number
  codeByQuestionId: Record<string, string>
  progressByQuestionId: Record<string, QuestionProgress>
  totalScore: number
  elapsedInSeconds: number
  isCompleted: boolean
  startedAt: string | null
  completedAt: string | null
}

export type InterviewSessionContextValue = InterviewSessionState & {
  currentQuestion: InterviewQuestion | null
  currentCode: string
  currentProgress: QuestionProgress | null
  startInterview: (setup: InterviewSetup, questions: InterviewQuestion[]) => void
  updateLanguage: (language: ProgrammingLanguage) => void
  updateCode: (code: string) => void
  registerSubmission: (payload: { passed: boolean; awardedScore: number }) => void
  setCurrentQuestionIndex: (index: number) => void
  goToNextQuestion: () => void
  completeInterview: () => void
  setElapsedInSeconds: (seconds: number) => void
  restoreInterview: (snapshot: ResumableInterviewSnapshot) => void
  resetInterview: () => void
}

export const InterviewSessionContext = createContext<InterviewSessionContextValue | undefined>(
  undefined,
)
