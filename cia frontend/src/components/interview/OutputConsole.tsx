import { useEffect, useState } from 'react'
import type { CodeExecutionStatus, RunCodeResponse } from '../../types/interview'

type OutputConsoleProps = {
  output: RunCodeResponse | null
  status: CodeExecutionStatus
}

const idleMessage = 'Run your solution to view sample execution output.'
const runningMessageBase = 'Running code against sample test cases'
const runningMessageFrames = ['.', '..', '...'] as const

const statusLabelMap: Record<CodeExecutionStatus, string> = {
  idle: 'Idle',
  running: 'Running...',
  success: 'Success',
  error: 'Error',
}

const statusStyleMap: Record<CodeExecutionStatus, string> = {
  idle: 'text-slate-400',
  running: 'text-sky-300',
  success: 'text-emerald-300',
  error: 'text-rose-300',
}

const outputStyleMap: Record<CodeExecutionStatus, string> = {
  idle: 'border-slate-800 bg-slate-900 text-slate-300',
  running: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
}

export function OutputConsole({ output, status }: OutputConsoleProps) {
  const [loadingFrameIndex, setLoadingFrameIndex] = useState(0)
  const [showDiff, setShowDiff] = useState(false)
  const isRunning = status === 'running'

  useEffect(() => {
    if (!isRunning) {
      return
    }

    const intervalId = window.setInterval(() => {
      setLoadingFrameIndex((currentIndex) => (currentIndex + 1) % runningMessageFrames.length)
    }, 320)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isRunning])

  const statusClass = statusStyleMap[status]
  const codeBlockClass = outputStyleMap[status]
  const runtimeColorClass =
    output?.status === 'success'
      ? 'text-emerald-300'
      : output?.status === 'error'
        ? 'text-rose-300'
        : 'text-slate-300'

  const runningMessage = `${runningMessageBase}${runningMessageFrames[loadingFrameIndex]}`
  const renderedOutput = isRunning ? runningMessage : output ? output.output : idleMessage
  const comparisons = output?.comparisons ?? []
  const hasComparisons = comparisons.length > 0

  const visualizeWhitespace = (value: string) =>
    value.replace(/ /g, '[space]').replace(/\t/g, '[tab]').replace(/\n/g, '[nl]\n')

  const buildDiffSummary = (expected: string, actual: string) => {
    if (expected === actual) {
      return 'No difference. Outputs are exactly equal.'
    }

    const expectedCollapsed = expected.replace(/\s+/g, ' ').trim()
    const actualCollapsed = actual.replace(/\s+/g, ' ').trim()

    let index = 0
    const limit = Math.min(expected.length, actual.length)
    while (index < limit && expected[index] === actual[index]) {
      index += 1
    }

    const start = Math.max(0, index - 24)
    const expectedEnd = Math.min(expected.length, index + 24)
    const actualEnd = Math.min(actual.length, index + 24)

    const expectedSnippet = visualizeWhitespace(expected.slice(start, expectedEnd))
    const actualSnippet = visualizeWhitespace(actual.slice(start, actualEnd))
    const whitespaceOnlyDiff = expectedCollapsed === actualCollapsed

    return [
      whitespaceOnlyDiff ? 'Difference type: whitespace/formatting' : 'Difference type: content mismatch',
      `First mismatch at char: ${Math.min(index + 1, Math.max(expected.length, actual.length))}`,
      `Expected len: ${expected.length}`,
      `Actual len: ${actual.length}`,
      `Expected snippet: ${expectedSnippet || '(empty)'}`,
      `Actual snippet:   ${actualSnippet || '(empty)'}`,
    ].join('\n')
  }

  return (
    <section className="glass-panel rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Output Console</h3>
        <div className="flex items-center gap-2">
          {hasComparisons && !isRunning ? (
            <button
              type="button"
              onClick={() => setShowDiff((current) => !current)}
              className="rounded-md border border-slate-700 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-sky-400 hover:text-sky-200"
            >
              {showDiff ? 'Hide Diff' : 'Show Diff'}
            </button>
          ) : null}
          <span className={`text-xs font-semibold ${statusClass}`}>{statusLabelMap[status]}</span>
        </div>
      </div>

      {hasComparisons && !isRunning ? (
        <div className={`mt-3 overflow-x-auto rounded-md border transition ${codeBlockClass}`}>
          <div className="grid grid-cols-4 border-b border-slate-700/60 bg-slate-900/70">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Input</p>
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Expected Output</p>
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Actual Output</p>
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Judge0 Status</p>
          </div>

          {comparisons.map((item, index) => (
            <div key={item.testcaseId} className={index < comparisons.length - 1 ? 'border-b border-slate-800/70' : ''}>
              <div className="grid grid-cols-4">
                <div className="px-3 py-2">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Testcase {index + 1}</p>
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-100">
                    {item.testcaseInput || '(empty)'}
                  </pre>
                </div>
                <div className="px-3 py-2">
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-100">
                    {item.expectedOutput || '(empty)'}
                  </pre>
                </div>
                <div className="px-3 py-2">
                  <p
                    className={`mb-1 text-[10px] uppercase tracking-wide ${
                      item.passed ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {item.passed ? 'Passed' : 'Failed'}
                  </p>
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-100">
                    {item.actualOutput || item.error || '(empty)'}
                  </pre>
                </div>
                <div className="px-3 py-2">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Platform Status</p>
                  <p className="text-xs text-slate-100">{item.judge0Status || 'Unknown'}</p>
                </div>
              </div>

              {showDiff ? (
                <div className="border-t border-slate-800/70 bg-slate-950/60 px-3 py-2">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Diff</p>
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-100">
                    {buildDiffSummary(item.expectedOutput || '', item.actualOutput || '')}
                  </pre>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <pre
          className={`mt-3 min-h-[72px] rounded-md border p-3 font-mono text-xs transition ${codeBlockClass} ${
            isRunning ? 'animate-pulse' : ''
          }`}
        >
          {renderedOutput}
        </pre>
      )}

      {status !== 'running' && output ? (
        <p className="mt-2 text-xs text-slate-500">
          Simulated Runtime:{' '}
          <span className={`font-semibold ${runtimeColorClass}`}>{output.executionTimeMs}ms</span>
        </p>
      ) : null}
    </section>
  )
}
