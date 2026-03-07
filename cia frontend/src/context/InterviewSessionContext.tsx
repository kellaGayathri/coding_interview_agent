import { useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import type {
  InterviewQuestion,
  InterviewSetup,
  ProgrammingLanguage,
  QuestionProgress,
  ResumableInterviewSnapshot,
} from '../types/interview'
import { InterviewSessionContext } from './interviewSessionStore'

type InterviewSessionAction =
  | { type: 'START_INTERVIEW'; payload: { setup: InterviewSetup; questions: InterviewQuestion[] } }
  | { type: 'UPDATE_LANGUAGE'; payload: { language: ProgrammingLanguage } }
  | { type: 'UPDATE_CODE'; payload: { questionId: string; code: string } }
  | {
      type: 'REGISTER_SUBMISSION'
      payload: { questionId: string; passed: boolean; awardedScore: number }
    }
  | { type: 'SET_CURRENT_QUESTION'; payload: { index: number } }
  | { type: 'NEXT_QUESTION' }
  | { type: 'SET_ELAPSED'; payload: { seconds: number } }
  | { type: 'RESTORE_INTERVIEW'; payload: { snapshot: ResumableInterviewSnapshot } }
  | { type: 'COMPLETE_INTERVIEW'; payload: { completedAt: string } }
  | { type: 'RESET_INTERVIEW' }

const createInitialState = () => ({
  setup: null as InterviewSetup | null,
  questions: [] as InterviewQuestion[],
  currentQuestionIndex: 0,
  codeByQuestionId: {} as Record<string, string>,
  progressByQuestionId: {} as Record<string, QuestionProgress>,
  totalScore: 0,
  elapsedInSeconds: 0,
  isCompleted: false,
  startedAt: null as string | null,
  completedAt: null as string | null,
})

const createProgressMap = (questions: InterviewQuestion[]): Record<string, QuestionProgress> =>
  questions.reduce<Record<string, QuestionProgress>>((accumulator, question) => {
    accumulator[question.id] = {
      questionId: question.id,
      attempts: 0,
      score: 0,
      isSolved: false,
    }
    return accumulator
  }, {})

const createCodeMap = (
  questions: InterviewQuestion[],
  language?: ProgrammingLanguage,
): Record<string, string> =>
  questions.reduce<Record<string, string>>((accumulator, question) => {
    // Always start with empty code instead of starter code
    accumulator[question.id] = ''
    return accumulator
  }, {})

const interviewSessionReducer = (
  state: ReturnType<typeof createInitialState>,
  action: InterviewSessionAction,
) => {
  switch (action.type) {
    case 'START_INTERVIEW': {
      const { setup, questions } = action.payload
      return {
        ...state,
        setup,
        questions,
        currentQuestionIndex: 0,
        codeByQuestionId: createCodeMap(questions, setup.language),
        progressByQuestionId: createProgressMap(questions),
        totalScore: 0,
        elapsedInSeconds: 0,
        isCompleted: false,
        startedAt: new Date().toISOString(),
        completedAt: null,
      }
    }
    case 'UPDATE_LANGUAGE': {
      if (!state.setup) {
        return state
      }

      return {
        ...state,
        setup: {
          ...state.setup,
          language: action.payload.language,
        },
        codeByQuestionId: createCodeMap(state.questions, action.payload.language),
      }
    }
    case 'UPDATE_CODE': {
      return {
        ...state,
        codeByQuestionId: {
          ...state.codeByQuestionId,
          [action.payload.questionId]: action.payload.code,
        },
      }
    }
    case 'REGISTER_SUBMISSION': {
      const currentProgress = state.progressByQuestionId[action.payload.questionId]
      if (!currentProgress) {
        return state
      }

      const nextAttempts = currentProgress.attempts + 1
      const nextIsSolved = currentProgress.isSolved || action.payload.passed
      const shouldAwardScore = action.payload.passed && !currentProgress.isSolved
      const nextScore = shouldAwardScore ? action.payload.awardedScore : currentProgress.score

      return {
        ...state,
        totalScore: shouldAwardScore ? state.totalScore + action.payload.awardedScore : state.totalScore,
        progressByQuestionId: {
          ...state.progressByQuestionId,
          [action.payload.questionId]: {
            ...currentProgress,
            attempts: nextAttempts,
            isSolved: nextIsSolved,
            score: nextScore,
          },
        },
      }
    }
    case 'SET_CURRENT_QUESTION': {
      const nextIndex = Math.max(0, Math.min(action.payload.index, state.questions.length - 1))
      return {
        ...state,
        currentQuestionIndex: nextIndex,
      }
    }
    case 'NEXT_QUESTION': {
      const nextIndex = Math.min(state.currentQuestionIndex + 1, state.questions.length - 1)
      return {
        ...state,
        currentQuestionIndex: nextIndex,
      }
    }
    case 'SET_ELAPSED': {
      return {
        ...state,
        elapsedInSeconds: action.payload.seconds,
      }
    }
    case 'RESTORE_INTERVIEW': {
      const { snapshot } = action.payload
      const hydratedCodeMap = {
        ...createCodeMap(snapshot.questions, snapshot.setup.language),
        ...snapshot.codeByQuestionId,
      }
      const hydratedProgressMap = {
        ...createProgressMap(snapshot.questions),
        ...snapshot.progressByQuestionId,
      }
      const maxIndex = Math.max(0, snapshot.questions.length - 1)

      return {
        ...state,
        setup: snapshot.setup,
        questions: snapshot.questions,
        currentQuestionIndex: Math.max(0, Math.min(snapshot.currentQuestionIndex, maxIndex)),
        codeByQuestionId: hydratedCodeMap,
        progressByQuestionId: hydratedProgressMap,
        totalScore: snapshot.totalScore,
        elapsedInSeconds: snapshot.elapsedInSeconds,
        isCompleted: false,
        startedAt: snapshot.startedAt,
        completedAt: null,
      }
    }
    case 'COMPLETE_INTERVIEW': {
      return {
        ...state,
        isCompleted: true,
        completedAt: action.payload.completedAt,
      }
    }
    case 'RESET_INTERVIEW': {
      return createInitialState()
    }
    default:
      return state
  }
}

export function InterviewSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(interviewSessionReducer, undefined, createInitialState)
  const currentQuestion = state.questions[state.currentQuestionIndex] ?? null
  const currentCode = currentQuestion ? state.codeByQuestionId[currentQuestion.id] ?? '' : ''
  const currentProgress = currentQuestion ? state.progressByQuestionId[currentQuestion.id] ?? null : null

  const value = useMemo(
    () => ({
      ...state,
      currentQuestion,
      currentCode,
      currentProgress,
      startInterview: (setup: InterviewSetup, questions: InterviewQuestion[]) => {
        dispatch({ type: 'START_INTERVIEW', payload: { setup, questions } })
      },
      updateLanguage: (language: ProgrammingLanguage) => {
        dispatch({ type: 'UPDATE_LANGUAGE', payload: { language } })
      },
      updateCode: (code: string) => {
        if (!currentQuestion) {
          return
        }
        dispatch({ type: 'UPDATE_CODE', payload: { questionId: currentQuestion.id, code } })
      },
      registerSubmission: (payload: { passed: boolean; awardedScore: number }) => {
        if (!currentQuestion) {
          return
        }
        dispatch({
          type: 'REGISTER_SUBMISSION',
          payload: {
            questionId: currentQuestion.id,
            passed: payload.passed,
            awardedScore: payload.awardedScore,
          },
        })
      },
      setCurrentQuestionIndex: (index: number) => {
        dispatch({ type: 'SET_CURRENT_QUESTION', payload: { index } })
      },
      goToNextQuestion: () => {
        dispatch({ type: 'NEXT_QUESTION' })
      },
      completeInterview: () => {
        dispatch({ type: 'COMPLETE_INTERVIEW', payload: { completedAt: new Date().toISOString() } })
      },
      setElapsedInSeconds: (seconds: number) => {
        dispatch({ type: 'SET_ELAPSED', payload: { seconds } })
      },
      restoreInterview: (snapshot: ResumableInterviewSnapshot) => {
        dispatch({ type: 'RESTORE_INTERVIEW', payload: { snapshot } })
      },
      resetInterview: () => {
        dispatch({ type: 'RESET_INTERVIEW' })
      },
    }),
    [currentCode, currentProgress, currentQuestion, state],
  )

  return <InterviewSessionContext.Provider value={value}>{children}</InterviewSessionContext.Provider>
}
