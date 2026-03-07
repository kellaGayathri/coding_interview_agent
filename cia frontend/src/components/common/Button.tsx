import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  loadingText?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:bg-sky-800 disabled:text-slate-400',
  secondary:
    'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 disabled:text-slate-500',
  ghost:
    'bg-transparent text-slate-300 hover:bg-slate-800 disabled:text-slate-600',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  isLoading = false,
  loadingText,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading)

  return (
    <button
      type={type}
      className={cn(
        'btn-animate hover-glow active-scale inline-flex items-center justify-center rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <span>{loadingText ?? children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
