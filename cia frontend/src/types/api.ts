export interface ApiResponse<T> {
  success?: boolean
  message?: string
  detail?: string
  data?: T | null
}

export interface UserProfile {
  id: string
  name: string
  email: string
  total_interviews: number
  total_score: number
}

export interface BackendAuthUser {
  username: string
  email: string
}

export interface BackendAuthResponse {
  message: string
  user: BackendAuthUser
}

export interface BackendRegisterRequest {
  username: string
  email: string
  password: string
}

export interface BackendLoginRequest {
  email: string
  password: string
}

export interface BackendGeneratedQuestion {
  title: string
  difficulty: string
  problem_statement: string
  input_format: string
  output_format: string
  sample_input: string
  sample_output: string
  constraints: string[]
  tags: string[]
  hint: string
  test_cases: Array<{
    input: string
    expected_output: string
  }>
}

export interface BackendQuestionsResponse {
  questions: BackendGeneratedQuestion[]
}

export interface BackendRunCodeRequest {
  source_code: string
  language_id: number
  stdin: string
}

export interface BackendRunCodeResponse {
  status: string
  status_id: number | null
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  time: string | null
  memory: number | null
}

export interface BackendScoreCodeRequest {
  source_code: string
  language_id: number
  test_cases: Array<{
    input: string
    expected_output: string
    weight: number
  }>
}

export interface BackendScoreResponse {
  message: string
  total_score: number
  earned_score: number
  max_score: number
  passed_count: number
  total_count: number
  results: Array<{
    test_case_number: number
    passed: boolean
    score: number
    status: string
    expected_output: string
    actual_output: string
    stderr: string | null
    compile_output: string | null
    time: string | null
    memory: number | null
  }>
}

export interface BackendFeedbackResponse {
  feedback: string
}

export interface LoginData {
  access_token: string
  token_type: 'bearer'
  user: UserProfile
}

export interface InterviewQuestionApi {
  question_id: string
  external_id: string
  title: string
  statement: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags: string[]
  constraints: string[]
  examples: Array<{
    input: string
    output: string
    explanation?: string
  }>
  hint: string
  starter_code: Record<'typescript' | 'javascript' | 'python' | 'java', string>
  estimated_minutes: number
  order_index: number
  attempts: number
  is_solved: boolean
  earned_score: number
  max_score: number
}

export interface InterviewApiResponse {
  interview_id: string
  status: 'in_progress' | 'completed'
  score: number
  total_score: number
  started_at: string
  completed_at: string | null
  questions: InterviewQuestionApi[]
}

export interface CodeExecuteRequest {
  question_id: string
  source_code: string
  language: 'typescript' | 'javascript' | 'python' | 'java'
  record_attempt?: boolean
}

export interface CodeExecuteResponse {
  question_id: string
  passed_count: number
  failed_count: number
  total_testcases: number
  attempts: number
  is_solved: boolean
  earned_score: number
  interview_score: number
  total_interview_score: number
  results: Array<{
    testcase_id: string
    testcase_input?: string
    passed: boolean
    judge0_status?: string
    expected_output: string
    output: string
    error: string | null
    execution_time: string
  }>
}

export interface QuestionResult {
  question_id: string
  title?: string
  difficulty?: DifficultyLevel
  attempts: number
  score: number
  is_solved: boolean
  feedback?: string
}

export interface InterviewSessionCreateRequest {
  user_id: string
  status?: 'completed' | 'attempted' | string
  started_at?: string
  completed_at?: string
  total_score: number
  feedback_summary?: string
  question_results: QuestionResult[]
}

export interface InterviewSessionResponse {
  interview_id: string
  user_id: string
  status: 'completed' | 'attempted' | string
  total_score: number
  started_at: string
  completed_at: string | null
  feedback_summary?: string
  question_results: QuestionResult[]
}

export interface InterviewSessionSummary {
  interview_id: string
  status: 'in_progress' | 'completed' | string
  total_score: number
  started_at: string
  completed_at: string | null
}

export interface DashboardResponse {
  total_interviews: number
  total_score: number
  average_score: number
  recent_interviews: InterviewSessionSummary[]
}

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard'

export interface QuestionGeneratorRequest {
  difficulty: DifficultyLevel
  category: string
  company?: string
  additional_requirements?: string
}

export interface GeneratedQuestionResponse {
  title: string
  difficulty_level: DifficultyLevel
  category: string
  problem_description: string
  constraints: string[]
  input_format: string
  output_format: string
  sample_input: string
  sample_output: string
  explanation: string
  function_signature: string
  generation_source: string
  formatted_question: string
  hidden_test_cases: Array<{
    input: string
    output: string
  }>
}
