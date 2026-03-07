import { motion } from 'framer-motion'
import { CodeEditor } from '../components/interview/CodeEditor'
import { OutputConsole } from '../components/interview/OutputConsole'
import { QuestionPanel } from '../components/interview/QuestionPanel'
import { SolutionPanel } from '../components/interview/SolutionPanel'
import type {
  CodeExecutionStatus,
  InterviewQuestion,
  ProgrammingLanguage,
  RunCodeResponse,
} from '../types/interview'

type QuestionPageProps = {
  question: InterviewQuestion
  attempts: number
  isHintEnabled: boolean
  isHintVisible: boolean
  isSolutionVisible: boolean
  onToggleHint: () => void
  onToggleSolution: () => void
  code: string
  language: ProgrammingLanguage
  onCodeChange: (code: string) => void
  onLanguageChange: (language: ProgrammingLanguage) => void
  onRunCode: () => void
  onSubmitCode: () => void
  runStatus: CodeExecutionStatus
  output: RunCodeResponse | null
  isSubmitting: boolean
  isSolved: boolean
  questionScore: number
  totalScore: number
  feedbackMessage: string | null
  solution: string
  isSolutionLoading?: boolean
  solutionError?: string
}

export function QuestionPage({
  question,
  attempts,
  isHintEnabled,
  isHintVisible,
  isSolutionVisible,
  onToggleHint,
  onToggleSolution,
  code,
  language,
  onCodeChange,
  onLanguageChange,
  onRunCode,
  onSubmitCode,
  runStatus,
  output,
  isSubmitting,
  isSolved,
  questionScore,
  totalScore,
  feedbackMessage,
  solution,
  isSolutionLoading = false,
  solutionError = '',
}: QuestionPageProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(360px,40%)_1fr] animate-fadeInUp">
      <QuestionPanel
        question={question}
        attempts={attempts}
        isHintEnabled={isHintEnabled}
        isHintVisible={isHintVisible}
        isSolutionVisible={isSolutionVisible}
        onToggleHint={onToggleHint}
        onToggleSolution={onToggleSolution}
      />

      <div className="space-y-4">
        <CodeEditor
          code={code}
          language={language}
          isRunning={runStatus === 'running'}
          isSubmitting={isSubmitting}
          isSolved={isSolved}
          questionScore={questionScore}
          totalScore={totalScore}
          onCodeChange={onCodeChange}
          onLanguageChange={onLanguageChange}
          onRunCode={onRunCode}
          onSubmitCode={onSubmitCode}
        />
        <OutputConsole output={output} status={runStatus} />
        {feedbackMessage ? (
          <motion.p
            className={`rounded-xl border px-3 py-2 text-sm ${
              isSolved
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-400/30 bg-amber-500/10 text-amber-100'
            }`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {feedbackMessage}
          </motion.p>
        ) : null}
        {isSolutionVisible ? (
          <SolutionPanel
            question={question}
            solution={solution}
            language={language}
            onLanguageChange={onLanguageChange}
            onClose={onToggleSolution}
            isSolutionLoading={isSolutionLoading}
            solutionError={solutionError}
          />
        ) : null}
      </div>
    </section>
  )
}
