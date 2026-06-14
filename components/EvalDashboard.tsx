'use client'

import { useMemo, useState } from 'react'
import { ScoreCard } from '@/components/ScoreCard'
import { getAuthHeaders } from '@/lib/auth-client'
import { rubricPresets } from '@/lib/rubrics'
import type { AgentRun, ApiError, Evaluation, RunWithEvaluation } from '@/lib/types'

type EvalResponse = { evaluation: Evaluation } | ApiError
type ImproveResponse = { improved_prompt: string } | ApiError

export function EvalDashboard({
  agentId,
  initialRuns,
  latestRun,
  onEvaluated,
  onPromptImproved
}: {
  agentId: string
  initialRuns: RunWithEvaluation[]
  latestRun: AgentRun | null
  onEvaluated: (evaluation: Evaluation) => void
  onPromptImproved: (prompt: string) => void
}) {
  const [runs, setRuns] = useState<RunWithEvaluation[]>(initialRuns)
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'passed' | 'failed' | 'pending'>('all')
  const [rubricId, setRubricId] = useState('balanced')
  const [reviewNotes, setReviewNotes] = useState('')
  const [improvedPrompt, setImprovedPrompt] = useState<string | null>(null)

  const visibleRuns = useMemo(() => {
    if (!latestRun || runs.some((run) => run.id === latestRun.id)) {
      return runs
    }

    return [{ ...latestRun, evaluation: null }, ...runs]
  }, [latestRun, runs])

  const filteredRuns = useMemo(() => {
    return visibleRuns.filter((run) => {
      const matchesQuery = run.task.toLowerCase().includes(query.toLowerCase())
      const matchesStatus =
        status === 'all' ||
        (status === 'pending' && !run.evaluation) ||
        (status === 'passed' && run.evaluation?.passed) ||
        (status === 'failed' && run.evaluation && !run.evaluation.passed)

      return matchesQuery && matchesStatus
    })
  }, [query, status, visibleRuns])

  async function evaluateLatestRun() {
    if (!latestRun) {
      return
    }

    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/evaluate-agent', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ runId: latestRun.id, rubricId })
      })
      const result = (await response.json()) as EvalResponse

      if (!response.ok || 'error' in result) {
        setError('error' in result ? result.error : 'Unable to evaluate run.')
        return
      }

      setSelectedEvaluation(result.evaluation)
      setRuns((current) =>
        upsertRunEvaluation(current, {
          ...latestRun,
          evaluation: result.evaluation
        })
      )
      onEvaluated(result.evaluation)
      setReviewNotes(result.evaluation.human_review_notes ?? '')
    } catch {
      setError('Something went wrong while scoring this run.')
    } finally {
      setLoading(false)
    }
  }

  async function saveReviewNotes() {
    if (!selectedEvaluation) {
      return
    }

    const response = await fetch(`/api/evaluation/${selectedEvaluation.id}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ human_review_notes: reviewNotes })
    })
    const result = (await response.json()) as EvalResponse

    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to save review notes.')
      return
    }

    setSelectedEvaluation(result.evaluation)
    setRuns((current) =>
      current.map((run) => (run.evaluation?.id === result.evaluation.id ? { ...run, evaluation: result.evaluation } : run))
    )
  }

  async function improvePrompt(apply: boolean) {
    if (!selectedEvaluation) {
      return
    }

    const response = await fetch('/api/improve-agent', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ agentId, evaluationId: selectedEvaluation.id, apply })
    })
    const result = (await response.json()) as ImproveResponse

    if (!response.ok || 'error' in result) {
      setError('error' in result ? result.error : 'Unable to improve prompt.')
      return
    }

    setImprovedPrompt(result.improved_prompt)

    if (apply) {
      onPromptImproved(result.improved_prompt)
    }
  }

  return (
    <section className="rounded-xl border border-forge-border bg-forge-card p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Eval Dashboard</h2>
          <p className="mt-1 text-sm text-forge-muted">Review scored run history for this agent.</p>
        </div>
        {latestRun ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={rubricId}
              onChange={(event) => setRubricId(event.target.value)}
              className="rounded-xl border border-forge-border bg-black/30 px-3 py-3 text-sm text-forge-text"
            >
              {rubricPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
            <button
              onClick={evaluateLatestRun}
              disabled={loading}
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-forge-blue px-5 py-3 font-semibold text-white transition-all duration-200 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : null}
              {loading ? 'Scoring agent performance...' : 'Evaluate This Run'}
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-4 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-red-100">{error}</p> : null}
      {selectedEvaluation ? <div className="mt-5"><ScoreCard evaluation={selectedEvaluation} /></div> : null}
      {selectedEvaluation ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-forge-border bg-black/25 p-4">
            <h3 className="font-bold text-white">Failure analysis</h3>
            <p className="mt-2 text-sm leading-6 text-forge-muted">{selectedEvaluation.failure_analysis}</p>
            <h3 className="mt-4 font-bold text-white">Prompt improvement</h3>
            <p className="mt-2 text-sm leading-6 text-forge-muted">{selectedEvaluation.improvement_suggestion}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => improvePrompt(false)} className="rounded-lg border border-forge-border px-3 py-2 text-sm text-forge-text transition-all duration-200 hover:bg-white/5">
                Preview improved prompt
              </button>
              <button onClick={() => improvePrompt(true)} className="rounded-lg bg-forge-purple px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-purple-500">
                Apply improvement
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-forge-border bg-black/25 p-4">
            <h3 className="font-bold text-white">Human review notes</h3>
            <textarea
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              rows={6}
              className="mt-3 w-full resize-y rounded-xl border border-forge-border bg-black/30 p-3 text-sm text-forge-text"
              placeholder="Add reviewer observations, acceptance notes, or follow-up tasks..."
            />
            <button onClick={saveReviewNotes} className="mt-3 rounded-lg bg-forge-green px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-500">
              Save review notes
            </button>
          </div>
        </div>
      ) : null}
      {improvedPrompt ? (
        <details className="mt-5 rounded-xl border border-forge-border bg-black/25 p-4">
          <summary className="cursor-pointer font-bold text-white">Improved prompt preview</summary>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-black/40 p-4 text-sm leading-6 text-forge-muted">{improvedPrompt}</pre>
        </details>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_180px]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search run history..."
          className="rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-sm text-forge-text placeholder:text-forge-muted transition-all duration-200 focus:border-forge-purple"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as 'all' | 'passed' | 'failed' | 'pending')}
          className="rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-sm text-forge-text transition-all duration-200 focus:border-forge-purple"
        >
          <option value="all">All runs</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-forge-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Task</th>
              <th className="px-3 py-2 font-medium">Rubric</th>
              <th className="px-3 py-2 font-medium">Overall Score</th>
              <th className="px-3 py-2 font-medium">Passed</th>
              <th className="px-3 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map((run) => (
              <tr key={run.id} className={run.evaluation?.passed ? 'bg-forge-green/10' : run.evaluation ? 'bg-forge-red/10' : 'bg-white/[0.03]'}>
                <td className="max-w-md truncate rounded-l-xl px-3 py-3 text-forge-text">{run.task}</td>
                <td className="px-3 py-3 text-forge-muted">{run.evaluation?.rubric_name ?? 'Pending'}</td>
                <td className="px-3 py-3 text-forge-text">{run.evaluation ? `${run.evaluation.overall_score}%` : 'Pending'}</td>
                <td className="px-3 py-3 text-forge-text">{run.evaluation ? (run.evaluation.passed ? 'Passed' : 'Failed') : 'Not scored'}</td>
                <td className="rounded-r-xl px-3 py-3 text-forge-muted">{formatDate(run.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleRuns.length === 0 ? <p className="rounded-xl border border-dashed border-forge-border p-6 text-center text-forge-muted">Run this agent to start building an evaluation history.</p> : null}
        {visibleRuns.length > 0 && filteredRuns.length === 0 ? <p className="rounded-xl border border-dashed border-forge-border p-6 text-center text-forge-muted">No runs match this filter.</p> : null}
      </div>
    </section>
  )
}

function upsertRunEvaluation(runs: RunWithEvaluation[], run: RunWithEvaluation): RunWithEvaluation[] {
  const exists = runs.some((item) => item.id === run.id)
  return exists ? runs.map((item) => (item.id === run.id ? run : item)) : [run, ...runs]
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date))
}
