import type { InputHTMLAttributes } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../utils/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

const errorTransition = {
  initial: { opacity: 0, height: 0, y: -4 },
  animate: { opacity: 1, height: 'auto', y: 0 },
  exit: { opacity: 0, height: 0, y: -4 },
  transition: { duration: 0.2, ease: 'easeOut' },
} as const

export function Input({
  label,
  error,
  id,
  name,
  value,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? name
  const hasValue = value !== undefined && String(value).trim().length > 0
  const errorId = inputId ? `${inputId}-error` : undefined

  return (
    <div>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          value={value}
          placeholder=" "
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'peer h-14 w-full rounded-xl border bg-slate-950/70 px-4 pb-3 pt-6 text-sm text-slate-100 outline-none transition-all duration-300 placeholder:text-transparent',
            error
              ? 'border-rose-400/80 shadow-[0_0_0_1px_rgba(251,113,133,0.2)]'
              : 'border-slate-700/80 hover:border-slate-500 focus:border-cyan-300/80 focus:shadow-[0_0_0_1px_rgba(103,232,249,0.35),0_0_30px_rgba(6,182,212,0.18)]',
            className,
          )}
          {...props}
        />

        <label
          htmlFor={inputId}
          className={cn(
            'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 transition-all duration-200',
            'peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm',
            'peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-cyan-300',
            hasValue && 'top-3 translate-y-0 text-xs text-slate-300',
          )}
        >
          {label}
        </label>
      </div>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            id={errorId}
            className="mt-2 text-xs font-medium text-rose-300"
            initial={errorTransition.initial}
            animate={errorTransition.animate}
            exit={errorTransition.exit}
            transition={errorTransition.transition}
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
