import type { InterviewApiResponse, InterviewQuestionApi } from '../types/api'
import type {
  InterviewQuestion,
  ProgrammingLanguage,
  QuestionProgress,
  ResumableInterviewSnapshot,
} from '../types/interview'

const DEFAULT_LANGUAGE: ProgrammingLanguage = 'typescript'
const DEFAULT_DURATION_IN_SECONDS = 45 * 60

export const mapInterviewQuestion = (item: InterviewQuestionApi): InterviewQuestion => ({
  id: item.question_id,
  title: item.title,
  statement: item.statement,
  difficulty: item.difficulty,
  maxScore: item.max_score,
  tags: item.tags,
  constraints: item.constraints,
  examples: item.examples,
  hint: item.hint,
  starterCode: item.starter_code,
  estimatedMinutes: item.estimated_minutes,
})

const createCodeMap = (
  questions: InterviewQuestion[],
  language: ProgrammingLanguage,
): Record<string, string> =>
  questions.reduce<Record<string, string>>((accumulator, question) => {
    accumulator[question.id] = ''
    return accumulator
  }, {})

const createProgressMap = (interview: InterviewApiResponse): Record<string, QuestionProgress> =>
  interview.questions.reduce<Record<string, QuestionProgress>>((accumulator, question) => {
    accumulator[question.question_id] = {
      questionId: question.question_id,
      attempts: question.attempts,
      score: question.earned_score,
      isSolved: question.is_solved,
    }
    return accumulator
  }, {})

const getCurrentQuestionIndex = (interview: InterviewApiResponse): number => {
  const firstUnsolvedIndex = interview.questions.findIndex((question) => !question.is_solved)
  return firstUnsolvedIndex >= 0 ? firstUnsolvedIndex : 0
}

export const buildInterviewSnapshot = ({
  interview,
  userId,
  language = DEFAULT_LANGUAGE,
  durationInSeconds = DEFAULT_DURATION_IN_SECONDS,
}: {
  interview: InterviewApiResponse
  userId: string
  language?: ProgrammingLanguage
  durationInSeconds?: number
}): ResumableInterviewSnapshot => {
  const questions = interview.questions.map(mapInterviewQuestion)

  return {
    summaryId: interview.interview_id,
    userId,
    setup: {
      language,
      durationInSeconds,
    },
    questions,
    currentQuestionIndex: getCurrentQuestionIndex(interview),
    codeByQuestionId: createCodeMap(questions, language),
    progressByQuestionId: createProgressMap(interview),
    totalScore: interview.score,
    elapsedInSeconds: 0,
    startedAt: interview.started_at,
    savedAt: new Date().toISOString(),
  }
}
