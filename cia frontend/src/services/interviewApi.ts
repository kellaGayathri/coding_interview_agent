import axios from 'axios'
import {
  executeCodeAgainstTestCases,
  fetchInterviewQuestions,
  requestInterviewFeedback,
  runCodeOnce,
} from './backendApi'
import api from '../api/axios'
import type {
  BackendGeneratedQuestion,
  BackendScoreResponse,
  CodeExecuteRequest,
  CodeExecuteResponse,
  DashboardResponse,
  InterviewApiResponse,
  InterviewQuestionApi,
  InterviewSessionCreateRequest,
  InterviewSessionResponse,
} from '../types/api'
import type { ProgrammingLanguage } from '../types/interview'

const ACTIVE_INTERVIEW_ID_KEY = 'cia.active.interview_id'
const ACTIVE_INTERVIEW_SETUP_KEY = 'cia.active.interview.setup'
const INTERVIEW_STORE_KEY = 'cia.backend.interview.store.v2'
const AUTH_USER_STORAGE_KEY = 'cia.auth.user'

type DifficultyLevel = 'Easy' | 'Medium' | 'Hard'

type ActiveInterviewSetupStorage = {
  interview_id: string
  language: ProgrammingLanguage
  duration_in_seconds: number
}

type StoredAuthUser = {
  id: string
  name: string
  email: string
}

type StoredTestCase = {
  id: string
  input: string
  expected_output: string
  weight: number
}

type StoredInterviewQuestion = InterviewQuestionApi & {
  test_cases: StoredTestCase[]
  feedback: string | null
}

type StoredInterview = Omit<InterviewApiResponse, 'questions'> & {
  user_id: string
  questions: StoredInterviewQuestion[]
  feedback_summary: string | null
}

type InterviewStore = Record<string, StoredInterview>

type ParsedQuestionDraft = {
  title: string
  difficulty: DifficultyLevel
  statement: string
  inputFormat: string
  outputFormat: string
  sampleInput: string
  sampleOutput: string
  constraints: string[]
  tags: string[]
  hint: string
  rawTestCases: string
}

type LlmHelpRequest = {
  questionTitle: string
  questionStatement: string
  difficulty: DifficultyLevel
  attempts: number
}

const isProgrammingLanguage = (value: unknown): value is ProgrammingLanguage =>
  value === 'typescript' || value === 'javascript' || value === 'python' || value === 'java'

const DIFFICULTY_FALLBACK_BY_INDEX: DifficultyLevel[] = ['Easy', 'Easy', 'Medium', 'Medium', 'Hard']

const SCORE_BY_DIFFICULTY: Record<DifficultyLevel, number> = {
  Easy: 5,
  Medium: 10,
  Hard: 20,
}

const JUDGE0_LANGUAGE_IDS: Record<ProgrammingLanguage, number> = {
  typescript: 74,
  javascript: 63,
  python: 71,
  java: 62,
}

const DEFAULT_STARTER_CODE: Record<ProgrammingLanguage, string> = {
  typescript:
    "function solve(input: string): string {\n  // Parse stdin text and return output text\n  return ''\n}\n\nconst fs = require('fs')\nconst input = fs.readFileSync(0, 'utf8')\nprocess.stdout.write(solve(input))\n",
  javascript:
    "function solve(input) {\n  // Parse stdin text and return output text\n  return '';\n}\n\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8');\nprocess.stdout.write(String(solve(input)));\n",
  python:
    "def solve(data: str) -> str:\n    # Parse stdin text and return output text\n    return ''\n\nif __name__ == '__main__':\n    import sys\n    data = sys.stdin.read()\n    sys.stdout.write(solve(data))\n",
  java:
    "import java.io.*;\n\npublic class Main {\n    static String solve(String input) {\n        // Parse stdin text and return output text\n        return \"\";\n    }\n\n    public static void main(String[] args) throws Exception {\n        String input = new String(System.in.readAllBytes());\n        System.out.print(solve(input));\n    }\n}\n",
}

const roundToTwo = (value: number) => Math.round(value * 100) / 100

const stripCodeFences = (value: string) =>
  value.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim()

const normalizeBlock = (value: string) =>
  stripCodeFences(value).replace(/\*\*/g, '').replace(/\\n/g, '\n').trim()

const normalizeOutputValue = (value: string) => {
  const normalized = normalizeBlock(value)
  const unwrapped = normalized
    .replace(/^`+|`+$/g, '')
    .replace(/^['"]+|['"]+$/g, '')
    .trim()
  return unwrapped
}

const cleanListLine = (value: string) =>
  value
    .replace(/^\s*[-*>\u2022]+\s*/, '')
    .replace(/^\s*\d+[.)-]\s*/, '')
    .trim()

const getCurrentUserId = (): string => {
  if (typeof window === 'undefined') {
    return 'anonymous'
  }

  try {
    const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY)
    if (!raw) {
      return 'anonymous'
    }
    const parsed = JSON.parse(raw) as Partial<StoredAuthUser>
    if (typeof parsed.id === 'string' && parsed.id.trim()) {
      return parsed.id
    }
    if (typeof parsed.email === 'string' && parsed.email.trim()) {
      return parsed.email.trim().toLowerCase()
    }
    return 'anonymous'
  } catch {
    return 'anonymous'
  }
}

const readInterviewStore = (): InterviewStore => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(INTERVIEW_STORE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as InterviewStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeInterviewStore = (store: InterviewStore) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(INTERVIEW_STORE_KEY, JSON.stringify(store))
}

const toPublicQuestion = (question: StoredInterviewQuestion): InterviewQuestionApi => ({
  question_id: question.question_id,
  external_id: question.external_id,
  title: question.title,
  statement: question.statement,
  difficulty: question.difficulty,
  tags: question.tags,
  constraints: question.constraints,
  examples: question.examples,
  hint: question.hint,
  starter_code: question.starter_code,
  estimated_minutes: question.estimated_minutes,
  order_index: question.order_index,
  attempts: question.attempts,
  is_solved: question.is_solved,
  earned_score: question.earned_score,
  max_score: question.max_score,
})

export const toPublicInterview = (interview: StoredInterview): InterviewApiResponse => ({
  interview_id: interview.interview_id,
  status: interview.status,
  score: interview.score,
  total_score: interview.total_score,
  started_at: interview.started_at,
  completed_at: interview.completed_at,
  questions: interview.questions.map(toPublicQuestion),
})

export const getStoredInterviewApi = (interviewId: string): InterviewApiResponse | null => {
  const userId = getCurrentUserId()
  const store = readInterviewStore()
  const interview = getStoredInterview(store, interviewId, userId)
  return interview ? toPublicInterview(interview) : null
}

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError<{ detail?: string; message?: string }>(error)) {
    return error.response?.data?.detail ?? error.response?.data?.message ?? error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Request failed'
}

const inferTags = (statement: string): string[] => {
  const normalized = statement.toLowerCase()
  const tags: string[] = []

  if (normalized.includes('array')) tags.push('Array')
  if (normalized.includes('string')) tags.push('String')
  if (normalized.includes('tree')) tags.push('Tree')
  if (normalized.includes('graph')) tags.push('Graph')
  if (normalized.includes('dynamic programming') || normalized.includes('dp')) tags.push('DP')
  if (normalized.includes('stack')) tags.push('Stack')
  if (normalized.includes('queue')) tags.push('Queue')
  if (normalized.includes('hash')) tags.push('Hash Map')
  if (normalized.includes('sliding window')) tags.push('Sliding Window')

  return tags.length ? tags : ['DSA']
}

const splitQuestionBlocks = (raw: string): string[] => {
  const normalized = raw.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return []
  }

  const regex = /(?:^|\n)\s*(?:[#>*-]*\s*)?question\s*\d+\s*[:.)-]/gi
  const indexes: number[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(normalized)) !== null) {
    indexes.push(match.index)
  }

  if (!indexes.length) {
    return [normalized]
  }

  return indexes.map((start, index) => normalized.slice(start, indexes[index + 1] ?? normalized.length).trim())
}

type SectionKey =
  | 'title'
  | 'difficulty'
  | 'statement'
  | 'inputFormat'
  | 'outputFormat'
  | 'sampleInput'
  | 'sampleOutput'
  | 'testCases'
  | 'constraints'
  | 'tags'
  | 'hint'

const mapLabelToSection = (label: string): SectionKey | null => {
  const normalized = label.toLowerCase().trim()

  if (normalized === 'title' || normalized === 'question title') return 'title'
  if (normalized === 'difficulty' || normalized === 'difficulty level') return 'difficulty'
  if (normalized === 'problem statement' || normalized === 'problem' || normalized === 'statement')
    return 'statement'
  if (normalized === 'input format' || normalized === 'input') return 'inputFormat'
  if (normalized === 'output format' || normalized === 'output') return 'outputFormat'
  if (normalized === 'sample input' || normalized === 'example input') return 'sampleInput'
  if (normalized === 'sample output' || normalized === 'example output') return 'sampleOutput'
  if (normalized === 'test cases' || normalized === 'test case') return 'testCases'
  if (normalized === 'constraints' || normalized === 'constraint') return 'constraints'
  if (normalized === 'tags' || normalized === 'topics') return 'tags'
  if (normalized === 'hint' || normalized === 'hints') return 'hint'

  return null
}

const parseDifficulty = (value: string, index: number): DifficultyLevel => {
  const normalized = value.toLowerCase()
  if (normalized.includes('easy')) {
    return 'Easy'
  }
  if (normalized.includes('hard')) {
    return 'Hard'
  }
  if (normalized.includes('medium')) {
    return 'Medium'
  }
  return DIFFICULTY_FALLBACK_BY_INDEX[index] ?? 'Easy'
}

const parseQuestionBlock = (block: string, index: number): ParsedQuestionDraft => {
  const sections: Record<SectionKey, string[]> = {
    title: [],
    difficulty: [],
    statement: [],
    inputFormat: [],
    outputFormat: [],
    sampleInput: [],
    sampleOutput: [],
    testCases: [],
    constraints: [],
    tags: [],
    hint: [],
  }

  let currentSection: SectionKey | null = null
  let headerTitle = ''

  for (const rawLine of block.split('\n')) {
    const cleaned = cleanListLine(rawLine.replace(/\*\*/g, '').trim())
    if (!cleaned) {
      continue
    }

    const questionHeaderMatch = cleaned.match(/^question\s*\d+\s*[:.)-]?\s*(.*)$/i)
    if (questionHeaderMatch) {
      const trailingTitle = questionHeaderMatch[1]?.trim()
      if (trailingTitle) {
        headerTitle = trailingTitle
      }
      currentSection = null
      continue
    }

    const fieldMatch = cleaned.match(/^([A-Za-z][A-Za-z -]{1,45})\s*:\s*(.*)$/)
    if (fieldMatch) {
      const sectionKey = mapLabelToSection(fieldMatch[1])
      if (sectionKey) {
        currentSection = sectionKey
        if (fieldMatch[2].trim()) {
          sections[sectionKey].push(fieldMatch[2].trim())
        }
        continue
      }
    }

    const standaloneSection = mapLabelToSection(cleaned)
    if (standaloneSection) {
      currentSection = standaloneSection
      continue
    }

    if (currentSection) {
      sections[currentSection].push(cleaned)
    }
  }

  const joinSection = (key: SectionKey) => normalizeBlock(sections[key].join('\n'))
  const rawDifficulty = joinSection('difficulty')
  const difficulty = parseDifficulty(rawDifficulty, index)
  const title = joinSection('title') || headerTitle || `Generated Question ${index + 1}`
  const statement = joinSection('statement')
  const inputFormat = joinSection('inputFormat')
  const outputFormat = joinSection('outputFormat')
  const sampleInput = joinSection('sampleInput')
  const sampleOutput = joinSection('sampleOutput')
  const rawTestCases = joinSection('testCases')

  const constraintLines = joinSection('constraints')
    .split('\n')
    .map((line) => cleanListLine(line))
    .filter(Boolean)

  const tagsSource = joinSection('tags')
  const tags =
    tagsSource
      .split(/[\n,|]/)
      .map((tag) => cleanListLine(tag))
      .filter(Boolean) || []

  const hint =
    joinSection('hint') ||
    'Focus on edge cases and keep time complexity within interview-friendly limits.'

  const mergedStatement = [statement, inputFormat ? `Input Format:\n${inputFormat}` : '']
    .concat(outputFormat ? `Output Format:\n${outputFormat}` : '')
    .filter(Boolean)
    .join('\n\n')

  return {
    title,
    difficulty,
    statement: mergedStatement || statement || 'Solve this coding problem using stdin and stdout.',
    inputFormat,
    outputFormat,
    sampleInput,
    sampleOutput,
    constraints: constraintLines.length ? constraintLines : ['Read input from stdin and write output to stdout.'],
    tags: tags.length ? tags : inferTags(mergedStatement || statement),
    hint,
    rawTestCases,
  }
}

const parseRawTestCases = (
  rawText: string,
  fallbackInput: string,
  fallbackOutput: string,
): Array<{ input: string; expected_output: string }> => {
  const normalized = normalizeBlock(rawText)
  const collected: Array<{ input: string; expected_output: string }> = []

  if (normalized) {
    const pairRegex =
      /input\s*:\s*([\s\S]*?)\n\s*(?:expected\s*)?output\s*:\s*([\s\S]*?)(?=\n\s*(?:test\s*case\s*\d+\s*:?\s*|input\s*:|$))/gi

    let pairMatch: RegExpExecArray | null
    while ((pairMatch = pairRegex.exec(normalized)) !== null) {
      const input = normalizeBlock(pairMatch[1])
      const expectedOutput = normalizeBlock(pairMatch[2])
      if (input || expectedOutput) {
        collected.push({
          input,
          expected_output: expectedOutput || '0',
        })
      }
    }

    if (!collected.length) {
      let currentInput: string[] = []
      let currentOutput: string[] = []
      let mode: 'input' | 'output' | null = null

      const pushCurrent = () => {
        const input = normalizeBlock(currentInput.join('\n'))
        const expected = normalizeBlock(currentOutput.join('\n'))
        if (!input && !expected) {
          return
        }
        collected.push({
          input,
          expected_output: expected || '0',
        })
      }

      for (const rawLine of normalized.split('\n')) {
        const line = cleanListLine(rawLine)
        if (!line) {
          continue
        }

        const inputMatch = line.match(/^(?:test\s*case\s*\d+\s*[:.-]\s*)?input\s*:\s*(.*)$/i)
        if (inputMatch) {
          if (currentInput.length || currentOutput.length) {
            pushCurrent()
            currentInput = []
            currentOutput = []
          }
          const inline = normalizeBlock(inputMatch[1])
          if (inline) {
            currentInput.push(inline)
          }
          mode = 'input'
          continue
        }

        const outputMatch = line.match(/^(?:expected\s*)?output\s*:\s*(.*)$/i)
        if (outputMatch) {
          const inline = normalizeBlock(outputMatch[1])
          if (inline) {
            currentOutput.push(inline)
          }
          mode = 'output'
          continue
        }

        if (mode === 'input') {
          currentInput.push(line)
        } else if (mode === 'output') {
          currentOutput.push(line)
        }
      }

      if (currentInput.length || currentOutput.length) {
        pushCurrent()
      }
    }
  }

  if (!collected.length && (fallbackInput || fallbackOutput)) {
    collected.push({
      input: normalizeBlock(fallbackInput),
      expected_output: normalizeBlock(fallbackOutput) || '0',
    })
  }

  if (!collected.length) {
    collected.push({
      input: '',
      expected_output: '0',
    })
  }

  const deduplicated = collected.filter(
    (item, index, items) =>
      items.findIndex(
        (candidate) => candidate.input === item.input && candidate.expected_output === item.expected_output,
      ) === index,
  )

  return deduplicated.slice(0, 8)
}

const withWeightedCases = (
  questionId: string,
  cases: Array<{ input: string; expected_output: string }>,
  maxScore: number,
): StoredTestCase[] => {
  const testcaseCount = Math.max(1, cases.length)
  const baseWeight = roundToTwo(maxScore / testcaseCount)
  let usedWeight = 0

  return cases.map((testCase, index) => {
    const isLast = index === cases.length - 1
    let weight = isLast ? roundToTwo(maxScore - usedWeight) : baseWeight
    if (!isLast) {
      usedWeight += baseWeight
    }
    if (weight <= 0) {
      weight = 0.01
    }
    return {
      id: `${questionId}-tc-${index + 1}`,
      input: testCase.input,
      expected_output: testCase.expected_output,
      weight,
    }
  })
}

const buildStoredQuestionsFromStructured = (
  rawQuestions: BackendGeneratedQuestion[],
  interviewId: string,
): StoredInterviewQuestion[] => {
  const slicedQuestions = rawQuestions.slice(0, 5)
  const normalizedQuestions = slicedQuestions.map((question, index) => {
    const difficulty = parseDifficulty(question.difficulty, index)
    const maxScore = SCORE_BY_DIFFICULTY[difficulty]
    const questionId = `${interviewId}-q-${index + 1}`

    const parsedCases = Array.isArray(question.test_cases)
      ? question.test_cases
          .map((item) => ({
            input: normalizeOutputValue(item?.input ?? ''),
            expected_output: normalizeOutputValue(item?.expected_output ?? ''),
          }))
          .filter((item) => item.expected_output)
      : []

    const fallbackSampleCase =
      normalizeOutputValue(question.sample_output ?? '') !== ''
        ? [
            {
              input: normalizeOutputValue(question.sample_input ?? ''),
              expected_output: normalizeOutputValue(question.sample_output ?? ''),
            },
          ]
        : []

    const testCases = withWeightedCases(
      questionId,
      parsedCases.length ? parsedCases : fallbackSampleCase.length ? fallbackSampleCase : [{ input: '', expected_output: '0' }],
      maxScore,
    )

    const constraints = Array.isArray(question.constraints)
      ? question.constraints.map((item) => normalizeOutputValue(item)).filter(Boolean)
      : []
    const tags = Array.isArray(question.tags)
      ? question.tags.map((item) => normalizeOutputValue(item)).filter(Boolean)
      : []

    const statementParts = [
      normalizeOutputValue(question.problem_statement ?? ''),
      normalizeOutputValue(question.input_format ?? '')
        ? `Input Format:\n${normalizeOutputValue(question.input_format ?? '')}`
        : '',
      normalizeOutputValue(question.output_format ?? '')
        ? `Output Format:\n${normalizeOutputValue(question.output_format ?? '')}`
        : '',
    ].filter(Boolean)

    return {
      question_id: questionId,
      external_id: `generated-${index + 1}`,
      title: normalizeOutputValue(question.title ?? '') || `Generated Question ${index + 1}`,
      statement: statementParts.join('\n\n') || 'Solve this coding problem using stdin and stdout.',
      difficulty,
      tags: tags.length ? tags : ['DSA'],
      constraints: constraints.length ? constraints : ['Write a correct solution for all test cases.'],
      examples:
        normalizeOutputValue(question.sample_input ?? '') || normalizeOutputValue(question.sample_output ?? '')
          ? [
              {
                input: normalizeOutputValue(question.sample_input ?? ''),
                output: normalizeOutputValue(question.sample_output ?? ''),
              },
            ]
          : [],
      hint:
        normalizeOutputValue(question.hint ?? '') ||
        'Focus on edge cases and keep time complexity within interview-friendly limits.',
      starter_code: DEFAULT_STARTER_CODE,
      estimated_minutes: difficulty === 'Hard' ? 35 : difficulty === 'Medium' ? 25 : 18,
      order_index: index,
      attempts: 0,
      is_solved: false,
      earned_score: 0,
      max_score: maxScore,
      test_cases: testCases,
      feedback: null,
    }
  })

  if (!normalizedQuestions.length) {
    return buildStoredQuestions('', interviewId)
  }

  while (normalizedQuestions.length < 5) {
    const index = normalizedQuestions.length
    const fallbackDifficulty = DIFFICULTY_FALLBACK_BY_INDEX[index] ?? 'Medium'
    normalizedQuestions.push({
      question_id: `${interviewId}-q-${index + 1}`,
      external_id: `generated-${index + 1}`,
      title: `Generated Question ${index + 1}`,
      statement: 'Solve this coding problem using stdin and stdout.',
      difficulty: fallbackDifficulty,
      tags: ['DSA'],
      constraints: ['Write a correct solution for all test cases.'],
      examples: [],
      hint: 'Start simple, then optimize.',
      starter_code: DEFAULT_STARTER_CODE,
      estimated_minutes: fallbackDifficulty === 'Hard' ? 35 : fallbackDifficulty === 'Medium' ? 25 : 18,
      order_index: index,
      attempts: 0,
      is_solved: false,
      earned_score: 0,
      max_score: SCORE_BY_DIFFICULTY[fallbackDifficulty],
      test_cases: withWeightedCases(
        `${interviewId}-q-${index + 1}`,
        [{ input: '', expected_output: '0' }],
        SCORE_BY_DIFFICULTY[fallbackDifficulty],
      ),
    })
  }

  return normalizedQuestions.slice(0, 5)
}

const buildStoredQuestions = (raw: string, interviewId: string): StoredInterviewQuestion[] => {
  const blocks = splitQuestionBlocks(raw)
  const parsedDrafts = blocks.map((block, index) => parseQuestionBlock(block, index)).slice(0, 5)

  while (parsedDrafts.length < 5) {
    const index = parsedDrafts.length
    const fallbackDifficulty = DIFFICULTY_FALLBACK_BY_INDEX[index] ?? 'Easy'
    parsedDrafts.push({
      title: `Generated Question ${index + 1}`,
      difficulty: fallbackDifficulty,
      statement:
        'Write a program that reads from stdin and prints the correct output for all provided test cases.',
      inputFormat: 'Read input from stdin as text.',
      outputFormat: 'Print the final result to stdout.',
      sampleInput: '',
      sampleOutput: '',
      constraints: ['Handle edge cases and empty input safely.'],
      tags: ['DSA'],
      hint: 'Start with a straightforward solution and then optimize.',
      rawTestCases: '',
    })
  }

  return parsedDrafts.map((draft, index) => {
    const questionId = `${interviewId}-q-${index + 1}`
    const maxScore = SCORE_BY_DIFFICULTY[draft.difficulty]
    const parsedCases = parseRawTestCases(draft.rawTestCases, draft.sampleInput, draft.sampleOutput).map(
      (item) => ({
        input: normalizeOutputValue(item.input),
        expected_output: normalizeOutputValue(item.expected_output),
      }),
    )
    const testCases = withWeightedCases(questionId, parsedCases, maxScore)

    const sampleInput = normalizeOutputValue(draft.sampleInput || testCases[0]?.input || '')
    const sampleOutput = normalizeOutputValue(draft.sampleOutput || testCases[0]?.expected_output || '')
    const examples =
      sampleInput || sampleOutput
        ? [
            {
              input: sampleInput,
              output: sampleOutput,
            },
          ]
        : []

    return {
      interview_id: interview.interview_id,
      user_id: interview.user_id,
      status: interview.status,
      total_score: interview.score,
      started_at: interview.started_at,
      completed_at: interview.completed_at,
      feedback_summary: interview.feedback_summary ?? undefined,
      question_results: interview.questions.map((q) => ({
        question_id: q.question_id,
        title: q.title,
        difficulty: q.difficulty,
        attempts: q.attempts,
        score: q.earned_score,
        is_solved: q.is_solved,
        feedback: q.feedback ?? undefined,
      })),
    }
  })
}

const findInterviewByQuestionId = (
  store: InterviewStore,
  questionId: string,
  userId: string,
): StoredInterview | null => {
  for (const interview of Object.values(store)) {
    if (interview.user_id !== userId) {
      continue
    }
    if (interview.questions.some((question) => question.question_id === questionId)) {
      return interview
    }
  }
  return null
}

const getStoredInterview = (store: InterviewStore, interviewId: string, userId: string): StoredInterview | null => {
  const interview = store[interviewId]
  if (!interview) {
    return null
  }
  if (interview.user_id !== userId) {
    return null
  }
  return interview
}

const recomputeInterviewScore = (interview: StoredInterview) => {
  interview.score = roundToTwo(interview.questions.reduce((sum, item) => sum + item.earned_score, 0))
}

export const setActiveInterviewId = (interviewId: string) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(ACTIVE_INTERVIEW_ID_KEY, interviewId)
}

export const getActiveInterviewId = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(ACTIVE_INTERVIEW_ID_KEY)
}

export const setActiveInterviewSetup = (setup: ActiveInterviewSetupStorage) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(ACTIVE_INTERVIEW_SETUP_KEY, JSON.stringify(setup))
}

export const getActiveInterviewSetup = (
  interviewId?: string,
): { language: ProgrammingLanguage; durationInSeconds: number } | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(ACTIVE_INTERVIEW_SETUP_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<ActiveInterviewSetupStorage>
    if (!parsed || typeof parsed.interview_id !== 'string') {
      return null
    }
    if (interviewId && parsed.interview_id !== interviewId) {
      return null
    }
    if (!isProgrammingLanguage(parsed.language)) {
      return null
    }

    const duration = Number(parsed.duration_in_seconds)
    if (!Number.isFinite(duration) || duration <= 0) {
      return null
    }

    return {
      language: parsed.language,
      durationInSeconds: duration,
    }
  } catch {
    return null
  }
}

export const clearActiveInterviewId = () => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(ACTIVE_INTERVIEW_ID_KEY)
  window.localStorage.removeItem(ACTIVE_INTERVIEW_SETUP_KEY)
}

export const startInterview = async () => {
  try {
    const rawQuestions = await fetchInterviewQuestions()

    const interviewId = `interview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const userId = getCurrentUserId()
    const startedAt = new Date().toISOString()
    const questions = buildStoredQuestionsFromStructured(rawQuestions, interviewId)
    const totalScore = roundToTwo(questions.reduce((sum, question) => sum + question.max_score, 0))

    const interview: StoredInterview = {
      interview_id: interviewId,
      status: 'in_progress',
      score: 0,
      total_score: totalScore,
      started_at: startedAt,
      completed_at: null,
      user_id: userId,
      questions,
      feedback_summary: null,
    }

    const store = readInterviewStore()
    store[interviewId] = interview
    writeInterviewStore(store)

    return toPublicInterview(interview)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}


const mapStoredInterviewToSession = (interview: StoredInterview): InterviewSessionResponse => ({
  interview_id: interview.interview_id,
  user_id: interview.user_id,
  status: interview.status,
  total_score: interview.score,
  started_at: interview.started_at,
  completed_at: interview.completed_at,
  feedback_summary: interview.feedback_summary ?? undefined,
  question_results: interview.questions.map((question) => ({
    question_id: question.question_id,
    title: question.title,
    difficulty: question.difficulty,
    attempts: question.attempts,
    score: question.earned_score,
    is_solved: question.is_solved,
    feedback: question.feedback ?? undefined,
  })),
})

export const getInterviewById = async (
  interviewId: string,
): Promise<InterviewSessionResponse> => {
  const userId = getCurrentUserId()

  try {
    const res = await fetch(`/interview/sessions/${interviewId}`)
    if (!res.ok) {
      // backend didn't have it, fall through to local
      throw new Error('not found')
    }
    const data: InterviewSessionResponse = await res.json()
    return data
  } catch (err) {
    // local store fallback: convert stored interview into the same shape
    const store = readInterviewStore()
    const interview = getStoredInterview(store, interviewId, userId)

    if (!interview) {
      throw new Error('Interview session not found. Start a new interview.')
    }

    return mapStoredInterviewToSession(interview)
  }
}

export const deleteInterview = async (interviewId: string) => {
  const userId = getCurrentUserId()
  const store = readInterviewStore()
  const interview = getStoredInterview(store, interviewId, userId)

  if (!interview) {
    throw new Error('Interview session not found.')
  }

  delete store[interviewId]
  writeInterviewStore(store)

  if (getActiveInterviewId() === interviewId) {
    clearActiveInterviewId()
  }
}

const resolveQuestionContext = (questionId: string) => {
  const userId = getCurrentUserId()
  const store = readInterviewStore()
  const activeInterviewId = getActiveInterviewId()

  const interview =
    (activeInterviewId ? getStoredInterview(store, activeInterviewId, userId) : null) ??
    findInterviewByQuestionId(store, questionId, userId)

  if (!interview) {
    throw new Error('Interview state not found. Please restart the interview.')
  }

  const question = interview.questions.find((item) => item.question_id === questionId)
  if (!question) {
    throw new Error('Question context not found for code execution.')
  }

  return { store, interview, question }
}

const resolveExecutionContext = (payload: CodeExecuteRequest) => resolveQuestionContext(payload.question_id)

const normalizeForComparison = (value: string | null | undefined) => normalizeOutputValue(value ?? '').trim()

export const runCode = async (payload: CodeExecuteRequest): Promise<CodeExecuteResponse> => {
  const { interview, question } = resolveExecutionContext(payload)
  const languageId = JUDGE0_LANGUAGE_IDS[payload.language]

  try {
    const runResults: CodeExecuteResponse['results'] = []

    for (const [index, testCase] of question.test_cases.entries()) {
      const result = await runCodeOnce({
        source_code: payload.source_code,
        language_id: languageId,
        stdin: testCase.input,
      })

      const actualOutput = normalizeOutputValue(result.stdout ?? '')
      const expectedOutput = normalizeOutputValue(testCase.expected_output)
      const passed = result.status_id === 3 && normalizeForComparison(actualOutput) === normalizeForComparison(expectedOutput)

      runResults.push({
        testcase_id: testCase.id ?? `${question.question_id}-tc-${index + 1}`,
        testcase_input: normalizeOutputValue(testCase.input),
        passed,
        judge0_status: result.status,
        expected_output: expectedOutput,
        output: actualOutput,
        error: result.stderr || result.compile_output || null,
        execution_time: result.time ?? '0',
      })
    }

    const passedCount = runResults.filter((item) => item.passed).length
    const totalTestcases = runResults.length

    return {
      question_id: question.question_id,
      passed_count: passedCount,
      failed_count: Math.max(0, totalTestcases - passedCount),
      total_testcases: totalTestcases,
      attempts: question.attempts,
      is_solved: question.is_solved,
      earned_score: question.earned_score,
      interview_score: interview.score,
      total_interview_score: interview.total_score,
      results: runResults,
    }
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export const executeCode = async (payload: CodeExecuteRequest) => {
  const { store, interview, question } = resolveExecutionContext(payload)

  const allCases = question.test_cases
  const selectedCases = allCases

  const judge0Payload = {
    source_code: payload.source_code,
    language_id: JUDGE0_LANGUAGE_IDS[payload.language],
    test_cases: selectedCases.map((testCase) => ({
      input: testCase.input,
      expected_output: testCase.expected_output,
      weight: testCase.weight,
    })),
  }

  try {
    const scoreData: BackendScoreResponse = await executeCodeAgainstTestCases(judge0Payload)

    const solvedNow = scoreData.total_count > 0 && scoreData.passed_count === scoreData.total_count

    if (payload.record_attempt) {
      question.attempts += 1
      question.is_solved = question.is_solved || solvedNow
      question.earned_score = roundToTwo(Math.max(question.earned_score, scoreData.earned_score))
      recomputeInterviewScore(interview)
      store[interview.interview_id] = interview
      writeInterviewStore(store)
    }

    const responsePayload: CodeExecuteResponse = {
      question_id: question.question_id,
      passed_count: scoreData.passed_count,
      failed_count: Math.max(0, scoreData.total_count - scoreData.passed_count),
      total_testcases: scoreData.total_count,
      attempts: question.attempts,
      is_solved: question.is_solved,
      earned_score: question.earned_score,
      interview_score: interview.score,
      total_interview_score: interview.total_score,
      results: scoreData.results.map((result, index) => ({
        testcase_id: selectedCases[index]?.id ?? `${question.question_id}-tc-${result.test_case_number}`,
        testcase_input: normalizeOutputValue(selectedCases[index]?.input ?? ''),
        passed: result.passed,
        judge0_status: result.status,
        expected_output: normalizeOutputValue(result.expected_output),
        output: normalizeOutputValue(result.actual_output),
        error: result.stderr || result.compile_output || null,
        execution_time: result.time ?? '0',
      })),
    }

    return responsePayload
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export const markInterviewCompleted = (interviewId?: string) => {
  const targetInterviewId = interviewId ?? getActiveInterviewId()
  if (!targetInterviewId) {
    return
  }

  const userId = getCurrentUserId()
  const store = readInterviewStore()
  const interview = getStoredInterview(store, targetInterviewId, userId)

  if (!interview) {
    return
  }

  interview.status = 'completed'
  interview.completed_at = new Date().toISOString()
  recomputeInterviewScore(interview)
  store[targetInterviewId] = interview
  writeInterviewStore(store)
}

export const fetchDashboard = async () => {
  const userId = getCurrentUserId()

  try {
    const res = await fetch(`/interview/dashboard?user_id=${encodeURIComponent(userId)}`)
    if (!res.ok) {
      throw new Error('backend unavailable')
    }
    const data: DashboardResponse = await res.json()
    return data
  } catch {
    // fallback to local storage if backend fails
    const store = readInterviewStore()

    const interviews = Object.values(store)
      .filter((interview) => interview.user_id === userId)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())

    const totalInterviews = interviews.length
    const totalScore = roundToTwo(interviews.reduce((sum, interview) => sum + interview.score, 0))
    const averageScore = totalInterviews ? roundToTwo(totalScore / totalInterviews) : 0

    const response: DashboardResponse = {
      total_interviews: totalInterviews,
      total_score: totalScore,
      average_score: averageScore,
      recent_interviews: interviews.slice(0, 8).map((interview) => ({
        interview_id: interview.interview_id,
        status: interview.status,
        total_score: interview.total_score,
        started_at: interview.started_at,
        completed_at: interview.completed_at,
      })),
    }

    return response
  }
}

export const saveInterviewSession = async (session: InterviewSessionCreateRequest) => {
  try {
    const res = await fetch('/interview/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    })
    if (!res.ok) {
      throw new Error('Failed to save session')
    }
    const data: InterviewSessionResponse = await res.json()
    return data
  } catch (err) {
    console.warn('Unable to persist interview session to backend', err)
    // swallow errors; keep local store working
  }
}

export const generateFeedback = async (score: number) => {
  try {
    return await requestInterviewFeedback(score)
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export const generateHint = async (payload: LlmHelpRequest) => {
  try {
    const response = await api.post<{ hint: string }>('/interview/hint', {
      question_title: payload.questionTitle,
      question_statement: payload.questionStatement,
      difficulty: payload.difficulty,
      attempts: payload.attempts,
    })
    return response.data.hint
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export const generateSolution = async (payload: LlmHelpRequest) => {
  try {
    const response = await api.post<{ solution: string }>('/interview/solution', {
      question_title: payload.questionTitle,
      question_statement: payload.questionStatement,
      difficulty: payload.difficulty,
      attempts: payload.attempts,
    })
    return response.data.solution
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}

export const getSolution = async (payload: LlmHelpRequest): Promise<string> => {
  try {
    const response = await api.post<{ solution: string }>('/interview/solution', {
      question_title: payload.questionTitle,
      question_statement: payload.questionStatement,
      difficulty: payload.difficulty,
      attempts: payload.attempts,
    })
    return response.data.solution
  } catch (error) {
    throw new Error(getErrorMessage(error))
  }
}
