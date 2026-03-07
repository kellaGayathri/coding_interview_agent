import type { InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  containerClassName?: string
}

export function Input({
  label,
  error,
  id,
  name,
  className,
  containerClassName,
  ...props
}: InputProps) {
  const inputId = id ?? name
  const errorId = inputId ? `${inputId}-error` : undefined

  return (
    <div className={cn('space-y-2', containerClassName)}>
      <label htmlFor={inputId} className="block text-sm font-semibold text-slate-300">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'w-full rounded-lg border bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus-visible:ring-2',
          error
            ? 'border-rose-500/70 focus-visible:ring-rose-500/50'
            : 'border-slate-700 focus-visible:ring-sky-500/70',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-xs font-medium text-rose-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}
