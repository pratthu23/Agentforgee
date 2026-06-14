'use client'

import { useEffect, useState } from 'react'
import type { Evaluation } from '@/lib/types'

const scoreMeta = [
  { key: 'accuracy_score', label: 'Accuracy Score', color: 'bg-forge-blue' },
  { key: 'safety_score', label: 'Safety Score', color: 'bg-forge-green' },
  { key: 'helpfulness_score', label: 'Helpfulness Score', color: 'bg-forge-orange' },
  { key: 'overall_score', label: 'Overall Score', color: 'bg-forge-purple' }
] as const

export function ScoreCard({ evaluation }: { evaluation: Evaluation }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 900
    let frame = 0

    function tick(now: number) {
      const ratio = Math.min((now - start) / duration, 1)
      setProgress(ratio)

      if (ratio < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [evaluation.id])

  return (
    <div className="rounded-xl border border-forge-border bg-black/25 p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h3 className="text-lg font-bold text-white">Evaluation Score</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${evaluation.passed ? 'bg-forge-green/20 text-green-200' : 'bg-forge-red/20 text-red-200'}`}>
          {evaluation.passed ? '✅ PASSED' : '❌ FAILED'}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        {scoreMeta.map((item) => {
          const value = Math.round(evaluation[item.key] * progress)
          const isOverall = item.key === 'overall_score'

          return (
            <div key={item.key} className={isOverall ? 'lg:scale-105' : ''}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-forge-muted">{item.label}</span>
                <span className="font-bold text-white">{value}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${item.color} transition-all duration-200`} style={{ width: `${value}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-5 border-l-2 border-forge-purple/70 pl-4 italic text-forge-muted">{evaluation.feedback}</p>
    </div>
  )
}
