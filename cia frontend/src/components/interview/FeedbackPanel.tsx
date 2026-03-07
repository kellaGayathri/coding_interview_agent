import { Button } from '../common/Button'

type FeedbackPanelProps = {
  items: string[]
  isOpen: boolean
  onToggle: () => void
}

export function FeedbackPanel({ items, isOpen, onToggle }: FeedbackPanelProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">AI Feedback</h3>
        <Button variant="ghost" size="sm" onClick={onToggle} aria-expanded={isOpen}>
          {isOpen ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      {isOpen ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
