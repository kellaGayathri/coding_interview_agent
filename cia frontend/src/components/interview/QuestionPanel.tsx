import { motion } from 'framer-motion'
import { DifficultyBadge } from '../common/DifficultyBadge'
import { Button } from '../common/Button'
import type { InterviewQuestion } from '../../types/interview'

type QuestionPanelProps = {
  question: InterviewQuestion
  attempts: number
  isHintEnabled: boolean
  isHintVisible: boolean
  isSolutionVisible: boolean
  onToggleHint: () => void
  onToggleSolution: () => void
}

export function QuestionPanel({
  question,
  attempts,
  isHintEnabled,
  isHintVisible,
  isSolutionVisible,
  onToggleHint,
  onToggleSolution,
}: QuestionPanelProps) {
  return (
    <aside className="glass-panel-strong h-full rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">{question.title}</h2>
          <p className="mt-1 text-xs text-slate-500">Attempts: {attempts}</p>
        </div>
        <DifficultyBadge difficulty={question.difficulty} />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-300">{question.statement}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {question.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Constraints</h3>
        <ul className="mt-3 space-y-2">
          {question.constraints.map((constraint) => (
            <li
              key={constraint}
              className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 font-mono text-xs text-slate-300"
            >
              {constraint}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Example Testcases</h3>
        <div className="mt-3 space-y-3">
          {question.examples.map((example, index) => (
            <article key={`${question.id}-example-${index}`} className="rounded-lg bg-slate-900 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Input</p>
              <pre className="mt-1 overflow-auto font-mono text-sm text-slate-100">{example.input}</pre>
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Output</p>
              <pre className="mt-1 overflow-auto font-mono text-sm text-slate-100">{example.output}</pre>
              {example.explanation ? (
                <p className="mt-2 text-sm text-slate-300">{example.explanation}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <button
          type="button"
          onClick={onToggleHint}
          disabled={!isHintEnabled}
          className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            isHintEnabled
              ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
              : 'cursor-not-allowed border-slate-700 text-slate-500'
          }`}
        >
          {isHintEnabled ? (isHintVisible ? 'Hide Hint' : 'Show Hint') : 'Hint Locked (2 failed attempts needed)'}
        </button>

        <button
          type="button"
          onClick={onToggleSolution}
          className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition ${
            attempts >= 3
              ? 'border-red-400/60 bg-red-500/10 text-red-200 hover:bg-red-500/20'
              : 'cursor-not-allowed border-slate-700 text-slate-500'
          }`}
        >
          {attempts >= 3 ? 'Get Help' : 'Solution Locked (3 failed attempts needed)'}
        </button>

        {isHintVisible ? (
          <motion.div
            className="mt-3 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {question.hint}
          </motion.div>
        ) : null}
      </section>
    </aside>
  )
}
