import Link from 'next/link'
import type { AgentWithStats } from '@/lib/types'

const badgeColors = [
  'border-forge-purple/40 bg-forge-purple/15 text-purple-200',
  'border-forge-blue/40 bg-forge-blue/15 text-blue-200',
  'border-forge-green/40 bg-forge-green/15 text-green-200',
  'border-forge-orange/40 bg-forge-orange/15 text-orange-200'
]

export function AgentCard({ agent }: { agent: AgentWithStats }) {
  const badgeColor = badgeColors[Math.abs(hashText(agent.domain)) % badgeColors.length]

  return (
    <Link
      href={`/agent/${agent.id}`}
      className="block rounded-xl border border-forge-border bg-forge-card p-5 transition-all duration-200 hover:-translate-y-1 hover:border-forge-purple/70 hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-bold text-white">{agent.name}</h2>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${badgeColor}`}>{agent.domain}</span>
      </div>
      <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-forge-muted">{agent.description}</p>
      <div className="mt-5 flex items-center justify-between gap-3 text-xs text-forge-muted">
        <span>{agent.last_run_at ? `Last run ${formatDate(agent.last_run_at)}` : 'No runs yet'}</span>
        {agent.average_score !== null ? (
          <span className="rounded-full bg-white/5 px-2.5 py-1 font-semibold text-forge-text">{agent.average_score}% avg</span>
        ) : null}
      </div>
    </Link>
  )
}

function hashText(text: string): number {
  return text.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(date))
}
