import Link from 'next/link'
import { AuthGate } from '@/components/AuthGate'
import { DashboardClient } from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-[calc(100vh-73px)] max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Saved Agents</h1>
          <p className="mt-2 text-forge-muted">Open, edit, test, and optimize the agents you have saved.</p>
        </div>
        <Link
          href="/agent/new"
          className="rounded-xl bg-gradient-to-r from-forge-purple to-forge-blue px-5 py-3 text-center font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
        >
          Create New Agent
        </Link>
      </div>
      <AuthGate label="Dashboard">
        <DashboardClient />
      </AuthGate>
    </main>
  )
}
