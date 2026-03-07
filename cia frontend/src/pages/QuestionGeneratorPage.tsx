import { motion } from 'framer-motion'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { generateQuestion } from '../services/questionGeneratorApi'
import type { DifficultyLevel, GeneratedQuestionResponse, QuestionGeneratorRequest } from '../types/api'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  source?: string
}

const DIFFICULTY_OPTIONS: DifficultyLevel[] = ['Easy', 'Medium', 'Hard']
const CATEGORY_OPTIONS = ['Arrays', 'Strings', 'Recursion', 'Trees', 'Graphs', 'DP']

const buildUserMessage = (payload: QuestionGeneratorRequest) => {
  const company = payload.company?.trim() ? payload.company.trim() : 'general interview style'
  const extra = payload.additional_requirements?.trim()
  if (!extra) {
    return `Generate a ${payload.difficulty} ${payload.category} question focused on ${company}.`
  }
  return `Generate a ${payload.difficulty} ${payload.category} question focused on ${company}. Extra: ${extra}`
}

const buildAssistantMessage = (payload: GeneratedQuestionResponse) => payload.formatted_question.trim()

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function QuestionGeneratorPage() {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium')
  const [category, setCategory] = useState<string>('Arrays')
  const [company, setCompany] = useState('')
  const [additionalRequirements, setAdditionalRequirements] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const payload: QuestionGeneratorRequest = {
      difficulty,
      category: category.trim(),
      company: company.trim() || undefined,
      additional_requirements: additionalRequirements.trim() || undefined,
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: buildUserMessage(payload),
    }
    setMessages((current) => [...current, userMessage])
    setIsLoading(true)

    try {
      const response = await generateQuestion(payload)
      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: buildAssistantMessage(response),
        source: response.generation_source,
      }
      setMessages((current) => [...current, assistantMessage])
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'Unable to generate question right now.'
      setError(errorText)
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: 'assistant',
          content: `Generation failed: ${errorText}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async (message: ChatMessage) => {
    if (!message.content.trim() || typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }
    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedMessageId(message.id)
      window.setTimeout(() => setCopiedMessageId((current) => (current === message.id ? null : current)), 1600)
    } catch {
      setCopiedMessageId(null)
    }
  }

  return (
    <main className="page-shell">
      <div className="page-aurora" />
      <div className="page-grid" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="chip">AI Question Chatbot</p>
            <h1 className="font-title mt-3 text-3xl font-extrabold headline-gradient">
              Coding Interview Question Generator
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Free setup: tries local Ollama model first, then falls back to deterministic generation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
          <motion.form
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onSubmit={handleSubmit}
            className="glass-panel h-fit space-y-5 rounded-2xl p-5"
          >
            <div className="space-y-2">
              <label htmlFor="difficulty" className="text-sm font-semibold text-slate-200">
                Difficulty
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as DifficultyLevel)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
              >
                {DIFFICULTY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-semibold text-slate-200">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
              >
                {CATEGORY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="company" className="text-sm font-semibold text-slate-200">
                Company Focus (optional)
              </label>
              <input
                id="company"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="e.g. Google"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="requirements" className="text-sm font-semibold text-slate-200">
                Extra Requirements (optional)
              </label>
              <textarea
                id="requirements"
                value={additionalRequirements}
                onChange={(event) => setAdditionalRequirements(event.target.value)}
                placeholder="Add constraints, style, or emphasis..."
                rows={4}
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading} loadingText="Generating question...">
              Generate Question
            </Button>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </motion.form>

          <section className="glass-panel rounded-2xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">Chat Output</h2>
            <div className="mt-4 space-y-4">
              {!messages.length ? (
                <p className="rounded-lg border border-dashed border-slate-700 bg-slate-950/45 px-4 py-4 text-sm text-slate-400">
                  Submit preferences to generate your first question.
                </p>
              ) : null}

              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`card-stagger rounded-xl border px-4 py-3 ${
                    message.role === 'user'
                      ? 'ml-auto max-w-3xl border-cyan-500/30 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-950/60'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {message.role === 'user' ? 'You' : 'Generator'}
                    </p>
                    {message.role === 'assistant' ? (
                      <div className="flex items-center gap-2">
                        {message.source ? (
                          <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-300">
                            {message.source}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleCopy(message)}
                          className="rounded-md border border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-slate-500"
                        >
                          {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {message.role === 'assistant' ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-200">
                      {message.content}
                    </pre>
                  ) : (
                    <p className="text-sm leading-6 text-slate-200">{message.content}</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
