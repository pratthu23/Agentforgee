'use client'

import { useState } from 'react'
import { EvalDashboard } from '@/components/EvalDashboard'
import { RunAgentForm } from '@/components/RunAgentForm'
import type { Agent, AgentRun, Evaluation, RunWithEvaluation } from '@/lib/types'

export function AgentWorkspace({
  agent,
  runs,
  onPromptImproved
}: {
  agent: Agent
  runs: RunWithEvaluation[]
  onPromptImproved: (prompt: string) => void
}) {
  const [latestRun, setLatestRun] = useState<AgentRun | null>(null)
  const [latestEvaluation, setLatestEvaluation] = useState<Evaluation | null>(null)

  return (
    <div className="space-y-6">
      <RunAgentForm
        agent={agent}
        onRunComplete={(run) => {
          setLatestRun(run)
          setLatestEvaluation(null)
        }}
      />
      <EvalDashboard
        agentId={agent.id}
        initialRuns={runs}
        latestRun={latestRun}
        onEvaluated={(evaluation) => setLatestEvaluation(evaluation)}
        onPromptImproved={onPromptImproved}
      />
      {latestEvaluation ? <span className="sr-only">Latest score {latestEvaluation.overall_score}</span> : null}
    </div>
  )
}
