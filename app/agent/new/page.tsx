import { CreateAgentForm } from '@/components/CreateAgentForm'

export default function NewAgentPage() {
  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto w-full">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h1 className="text-3xl font-black text-white sm:text-5xl">Forge a new agent</h1>
          <p className="mt-4 text-forge-muted">Start with a plain-language brief. AgentForge will create the name, domain, constraints, and system prompt.</p>
        </div>
        <CreateAgentForm />
      </section>
    </main>
  )
}
