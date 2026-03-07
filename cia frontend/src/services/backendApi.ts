import api from '../api/axios'
import type {
  BackendAuthResponse,
  BackendFeedbackResponse,
  BackendGeneratedQuestion,
  BackendLoginRequest,
  BackendQuestionsResponse,
  BackendRegisterRequest,
  BackendRunCodeRequest,
  BackendRunCodeResponse,
  BackendScoreCodeRequest,
  BackendScoreResponse,
} from '../types/api'

export const registerUser = async (payload: BackendRegisterRequest): Promise<BackendAuthResponse> => {
  const response = await api.post<BackendAuthResponse>('/register', payload)
  return response.data
}

export const loginUser = async (payload: BackendLoginRequest): Promise<BackendAuthResponse> => {
  const response = await api.post<BackendAuthResponse>('/login', payload)
  return response.data
}

export const fetchInterviewQuestions = async (): Promise<BackendGeneratedQuestion[]> => {
  const response = await api.post<BackendQuestionsResponse>('/interview/questions')
  const questions = response.data?.questions
  if (!Array.isArray(questions) || !questions.length) {
    throw new Error('Interview question generator returned an empty response.')
  }
  return questions
}

export const requestInterviewFeedback = async (score: number): Promise<string> => {
  const response = await api.post<BackendFeedbackResponse>('/interview/feedback', { score })
  return response.data.feedback
}

export const runCodeOnce = async (payload: BackendRunCodeRequest): Promise<BackendRunCodeResponse> => {
  const response = await api.post<BackendRunCodeResponse>('/code/run', payload)
  return response.data
}

export const executeCodeAgainstTestCases = async (
  payload: BackendScoreCodeRequest,
): Promise<BackendScoreResponse> => {
  const response = await api.post<BackendScoreResponse>('/code/execute', payload)
  return response.data
}
