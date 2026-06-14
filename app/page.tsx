import Link from 'next/link'

const steps = [
  {
    icon: '🔧',
    title: 'Generate',
    copy: 'Describe your agent in plain English'
  },
  {
    icon: '🤖',
    title: 'Run',
    copy: 'Test it on real-world tasks'
  },
  {
    icon: '📊',
    title: 'Evaluate',
    copy: 'Get instant performance scores'
  }
]

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-73px)] bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.24),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(37,99,235,0.18),transparent_30%),#0a0a0f]">
      <section className="mx-auto flex max-w-7xl flex-col px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-4xl">
          <p className="mb-5 inline-flex rounded-full border border-forge-border bg-white/5 px-4 py-2 text-sm text-forge-muted">
            Domain agents, measurable outcomes.
          </p>
          <h1 className="text-5xl font-black leading-tight text-white sm:text-7xl lg:text-8xl">Create. Optimize. Evaluate.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-forge-muted sm:text-xl">
            AgentForge is a focused workspace for saving agents, improving prompts, running test cases, and scoring output quality.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/agent/new"
              className="rounded-xl bg-gradient-to-r from-forge-purple to-forge-blue px-6 py-3 text-center font-semibold text-white shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              Create Your First Agent
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-forge-border px-6 py-3 text-center font-semibold text-forge-text transition-all duration-200 hover:border-forge-blue hover:bg-white/5"
            >
              View Saved Agents
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.title} className="rounded-xl border border-forge-border bg-forge-card p-6 transition-all duration-200 hover:-translate-y-1 hover:border-forge-purple/60">
              <div className="mb-5 text-3xl">{step.icon}</div>
              <h2 className="text-xl font-bold text-white">{step.title}</h2>
              <p className="mt-2 text-forge-muted">{step.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
