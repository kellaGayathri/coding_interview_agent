import { useEffect, useMemo, useRef } from 'react'

type TimerProps = {
  totalSeconds: number
  elapsedSeconds: number
  isPaused?: boolean
  onTick: (nextElapsedSeconds: number) => void
  onExpire: () => void
}

const formatTimer = (remainingSeconds: number) => {
  const safeRemaining = Math.max(0, remainingSeconds)
  const minutes = Math.floor(safeRemaining / 60)
  const seconds = safeRemaining % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function Timer({
  totalSeconds,
  elapsedSeconds,
  isPaused = false,
  onTick,
  onExpire,
}: TimerProps) {
  const didExpireRef = useRef(false)

  useEffect(() => {
    if (elapsedSeconds >= totalSeconds && !didExpireRef.current) {
      didExpireRef.current = true
      onExpire()
    }

    if (elapsedSeconds < totalSeconds) {
      didExpireRef.current = false
    }
  }, [elapsedSeconds, onExpire, totalSeconds])

  useEffect(() => {
    if (isPaused || elapsedSeconds >= totalSeconds) {
      return
    }

    const intervalId = window.setInterval(() => {
      onTick(Math.min(totalSeconds, elapsedSeconds + 1))
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [elapsedSeconds, isPaused, onTick, totalSeconds])

  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds)
  const danger = remainingSeconds <= 300
  const timerLabel = useMemo(() => formatTimer(remainingSeconds), [remainingSeconds])

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
        danger
          ? 'border-rose-500/60 bg-rose-500/10 text-rose-300'
          : 'border-slate-700 bg-slate-900 text-slate-200'
      }`}
      role="timer"
      aria-live="polite"
    >
      <span className="text-xs uppercase tracking-wide text-slate-400">Time Left</span>
      <span className="font-mono text-base">{timerLabel}</span>
    </div>
  )
}
