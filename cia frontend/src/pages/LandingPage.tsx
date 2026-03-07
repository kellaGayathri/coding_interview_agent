import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FeatureCard } from '../components/landing/FeatureCard'
import { Navbar } from '../components/landing/Navbar'
import {
  LANDING_ABOUT,
  LANDING_FEATURES,
  LANDING_FEATURES_HEADER,
  LANDING_HERO,
} from '../data/landingContent'

const ctaClassMap = {
  primary:
    'bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 text-slate-950 shadow-[0_12px_30px_rgba(56,189,248,0.35)] hover:brightness-105',
  secondary: 'border border-slate-700 text-slate-200 hover:border-slate-500',
} as const

export function LandingPage() {
  return (
    <main className="page-shell overflow-x-hidden">
      <div className="page-aurora" />
      <div className="page-grid" />

      <Navbar />

      <section id="home" className="relative mx-auto w-full max-w-6xl px-6 pb-10 pt-16 md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="glass-panel relative overflow-hidden rounded-[28px] border border-cyan-400/15 bg-slate-950/70 p-8 md:p-12"
        >
          <div className="pointer-events-none absolute -right-12 -top-16 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-8 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_120deg_at_50%_50%,rgba(34,211,238,0.18),rgba(99,102,241,0.18),rgba(16,185,129,0.18),rgba(34,211,238,0.18))] blur-3xl" />
          <div className="pointer-events-none absolute left-6 top-6 flex items-center gap-2 rounded-full border border-cyan-300/20 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
            Arcane Mode
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">{LANDING_HERO.badge}</p>
          <h1 className="font-title mt-4 max-w-3xl text-4xl font-extrabold tracking-tight headline-gradient md:text-6xl">
            {LANDING_HERO.heading}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300">{LANDING_HERO.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {LANDING_HERO.ctas.map((cta) => (
              <Link
                key={cta.label}
                to={cta.href}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${ctaClassMap[cta.variant]}`}
              >
                {cta.label}
              </Link>
            ))}
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {[
              { title: 'Spellbound Coaching', detail: 'Hints that feel like whispers from a master.' },
              { title: 'Crystal Scoring', detail: 'Transparent, instant feedback on every run.' },
              { title: 'Ritual Focus', detail: 'Curated pacing to keep you in flow.' },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4 text-left shadow-[0_10px_30px_rgba(15,23,42,0.35)]"
              >
                <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="about" className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="glass-panel rounded-3xl p-8"
        >
          <h2 className="font-title text-2xl font-bold text-slate-100">{LANDING_ABOUT.title}</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">{LANDING_ABOUT.description}</p>
        </motion.div>
      </section>

      <section id="features" className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-10">
        <header>
          <h2 className="font-title text-2xl font-bold text-slate-100">{LANDING_FEATURES_HEADER.title}</h2>
          <p className="mt-2 text-sm text-slate-300">{LANDING_FEATURES_HEADER.description}</p>
        </header>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {LANDING_FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </section>

      <footer className="relative border-t border-slate-800/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>(c) {new Date().getFullYear()} Coding Interview Agent</p>
        </div>
      </footer>
    </main>
  )
}
