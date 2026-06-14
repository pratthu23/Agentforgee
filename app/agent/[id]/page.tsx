import { AgentDetailClient } from '@/components/AgentDetailClient'

export const dynamic = 'force-dynamic'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <main className="mx-auto min-h-[calc(100vh-73px)] max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AgentDetailClient id={id} />
    </main>
  )
}
