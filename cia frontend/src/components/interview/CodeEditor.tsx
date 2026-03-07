import Editor from '@monaco-editor/react'
import { motion } from 'framer-motion'
import { Button } from '../common/Button'
import { PROGRAMMING_LANGUAGES } from '../../types/interview'
import type { ProgrammingLanguage } from '../../types/interview'

type CodeEditorProps = {
  code: string
  language: ProgrammingLanguage
  isRunning: boolean
  isSubmitting: boolean
  isSolved: boolean
  questionScore: number
  totalScore: number
  onCodeChange: (code: string) => void
  onLanguageChange: (language: ProgrammingLanguage) => void
  onRunCode: () => void
  onSubmitCode: () => void
}

const languageLabel: Record<ProgrammingLanguage, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
}

const monacoLanguageMap: Record<ProgrammingLanguage, string> = {
  typescript: 'typescript',
  javascript: 'javascript',
  python: 'python',
  java: 'java',
}

export function CodeEditor({
  code,
  language,
  isRunning,
  isSubmitting,
  isSolved,
  questionScore,
  totalScore,
  onCodeChange,
  onLanguageChange,
  onRunCode,
  onSubmitCode,
}: CodeEditorProps) {
  return (
    <section className="glass-panel-strong overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/75 px-4 py-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            Language
            <select
              className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
              value={language}
              onChange={(event) => onLanguageChange(event.target.value as ProgrammingLanguage)}
              aria-label="Select programming language"
            >
              {PROGRAMMING_LANGUAGES.map((languageOption) => (
                <option key={languageOption} value={languageOption}>
                  {languageLabel[languageOption]}
                </option>
              ))}
            </select>
          </label>

          <div className="hidden items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 md:flex">
            <span>Question Score</span>
            <span className="font-semibold text-emerald-300">{questionScore}</span>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 md:flex">
            <span>Total Score</span>
            <span className="font-semibold text-sky-300">{totalScore}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onRunCode} disabled={isRunning || isSubmitting}>
            {isRunning ? 'Running...' : 'Run'}
          </Button>
          <Button onClick={onSubmitCode} disabled={isSubmitting || isSolved}>
            {isSolved ? 'Solved' : isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>

      <div className="relative h-[55vh] min-h-[320px]">
        <Editor
          height="100%"
          theme="vs-dark"
          language={monacoLanguageMap[language]}
          value={code}
          onChange={(nextValue) => onCodeChange(nextValue ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            padding: {
              top: 14,
            },
          }}
        />

        {isSolved ? (
          <motion.div
            className="pointer-events-none absolute right-3 top-3 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            Solved
          </motion.div>
        ) : null}
      </div>
    </section>
  )
}
