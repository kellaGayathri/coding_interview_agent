import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

type AuthCardProps = {
  eyebrow: string
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
  isSuccess?: boolean
}

const cardTransition = {
  type: 'spring',
  stiffness: 150,
  damping: 20,
  mass: 0.8,
} as const

export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  isSuccess = false,
}: AuthCardProps) {
  return (
    <motion.section
      className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-900/45 p-6 shadow-[0_24px_64px_rgba(2,6,23,0.7)] backdrop-blur-xl sm:p-8"
      initial={{ opacity: 0, scale: 0.96, y: 18 }}
      animate={
        isSuccess
          ? { opacity: 0.85, scale: 0.98, y: -10, filter: 'blur(2px)' }
          : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
      }
      transition={cardTransition}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <div className="pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
      <div className="pointer-events-none absolute -left-8 bottom-10 h-20 w-20 rounded-full bg-indigo-400/20 blur-2xl" />

      <header className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</p>
        <h1 className="font-title mt-3 text-2xl font-bold text-slate-100">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{subtitle}</p>
      </header>

      <div className="relative z-10 mt-6">{children}</div>
      <footer className="relative z-10 mt-6 text-sm text-slate-400">{footer}</footer>
    </motion.section>
  )
}
