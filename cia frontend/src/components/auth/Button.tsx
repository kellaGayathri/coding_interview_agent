import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd'
>

type ButtonProps = NativeButtonProps & {
  isLoading?: boolean
  loadingText?: string
  children: ReactNode
}

const MotionButton = motion.button

export function Button({
  isLoading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading)
  const content = isLoading ? loadingText ?? children : children

  return (
    <MotionButton
      type="button"
      whileHover={isDisabled ? undefined : { scale: 1.01, y: -1 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-xl border border-cyan-200/30',
        'bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 px-4 text-sm font-semibold text-slate-950',
        'shadow-[0_12px_30px_rgba(56,189,248,0.35)] transition disabled:cursor-not-allowed disabled:opacity-70',
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.45),transparent_50%)] opacity-70 transition group-hover:opacity-100" />

      <span className="relative inline-flex items-center gap-2">
        {isLoading ? (
          <motion.span
            className="h-4 w-4 rounded-full border-2 border-slate-900/70 border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            aria-hidden="true"
          />
        ) : null}
        <span>{content}</span>
      </span>
    </MotionButton>
  )
}
