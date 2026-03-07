import type { DifficultyLevel } from '../../types/interview'
import { cn } from '../../utils/cn'

type DifficultyBadgeProps = {
  difficulty: DifficultyLevel
}

const badgeStyles: Record<DifficultyLevel, string> = {
  Easy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  Hard: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        badgeStyles[difficulty],
      )}
    >
      {difficulty}
    </span>
  )
}
