import { fetchInterviewQuestions } from './backendApi'
import type { BackendGeneratedQuestion, GeneratedQuestionResponse, QuestionGeneratorRequest } from '../types/api'

const clean = (value: string) => String(value || '').replace(/\r\n/g, '\n').trim()

const buildFormattedQuestion = (question: BackendGeneratedQuestion) => {
  const constraints = (question.constraints ?? []).map((item) => `- ${clean(item)}`).join('\n')
  const tags = (question.tags ?? []).map((item) => `- ${clean(item)}`).join('\n')

  return [
    `Title: ${clean(question.title)}`,
    `Difficulty: ${clean(question.difficulty)}`,
    '',
    'Problem Statement:',
    clean(question.problem_statement),
    '',
    'Input Format:',
    clean(question.input_format),
    '',
    'Output Format:',
    clean(question.output_format),
    '',
    'Sample Input:',
    clean(question.sample_input),
    '',
    'Sample Output:',
    clean(question.sample_output),
    '',
    'Constraints:',
    constraints || '-',
    '',
    'Tags:',
    tags || '-',
    '',
    'Hint:',
    clean(question.hint),
  ].join('\n')
}

export const generateQuestion = async (payload: QuestionGeneratorRequest) => {
  const questions = await fetchInterviewQuestions()

  const selected =
    questions.find((question) => clean(question.difficulty).toLowerCase() === payload.difficulty.toLowerCase()) ??
    questions[0]

  const mapped: GeneratedQuestionResponse = {
    title: clean(selected.title) || `${payload.difficulty} ${payload.category} Interview Question`,
    difficulty_level: payload.difficulty,
    category: payload.category,
    problem_description: clean(selected.problem_statement),
    constraints: (selected.constraints ?? []).map((item) => clean(item)).filter(Boolean),
    input_format: clean(selected.input_format),
    output_format: clean(selected.output_format),
    sample_input: clean(selected.sample_input),
    sample_output: clean(selected.sample_output),
    explanation: clean(selected.hint),
    function_signature: '',
    generation_source: 'huggingface',
    formatted_question: buildFormattedQuestion(selected),
    hidden_test_cases: (selected.test_cases ?? []).map((item) => ({
      input: clean(item.input),
      output: clean(item.expected_output),
    })),
  }

  return mapped
}
