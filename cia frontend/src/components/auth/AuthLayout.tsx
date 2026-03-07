import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AUTH_BRAND } from '../../data/authContent'

type AuthLayoutProps = {
  children: ReactNode
}

const pageTransition = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
} as const

const floatingBlobTransition = {
  duration: 16,
  repeat: Infinity,
  ease: 'easeInOut',
} as const

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <motion.main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-12 text-slate-100"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      <div className="auth-grid-pattern pointer-events-none absolute inset-0" />

      <motion.div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0], scale: [1, 1.12, 0.94, 1] }}
        transition={floatingBlobTransition}
      />
      <motion.div
        className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl"
        animate={{ x: [0, -35, 10, 0], y: [0, 20, -15, 0], scale: [1, 0.9, 1.08, 1] }}
        transition={{ ...floatingBlobTransition, duration: 18 }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="font-title text-sm font-semibold uppercase tracking-[0.28em] text-sky-300/90">
            {AUTH_BRAND.productName}
          </p>
          <p className="mt-2 text-sm text-slate-400">{AUTH_BRAND.tagline}</p>
        </div>
        {children}
      </div>
    </motion.main>
  )
}
