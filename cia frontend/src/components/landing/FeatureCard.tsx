import { motion } from 'framer-motion'

type FeatureCardProps = {
  title: string
  description: string
  index?: number
}

export function FeatureCard({ title, description, index = 0 }: FeatureCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className="glass-panel rounded-xl p-5 transition hover-lift hover:border-slate-500 hover:bg-slate-900/80"
    >
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{description}</p>
    </motion.article>
  )
}
