import { InviteAcceptClient } from '@/components/InviteAcceptClient'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  return (
    <main className="mx-auto min-h-[calc(100vh-73px)] max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <InviteAcceptClient token={token} />
    </main>
  )
}
