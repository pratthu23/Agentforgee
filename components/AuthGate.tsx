'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadStatePanel } from '@/components/LoadStatePanel'
import { getSessionOrRedirect } from '@/lib/auth-client'

export function AuthGate({ children, label }: { children: React.ReactNode; label: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'allowed' | 'blocked'>('checking')

  useEffect(() => {
    async function checkSession() {
      const session = await getSessionOrRedirect()

      if (!session) {
        setStatus('blocked')
        router.push('/login')
        return
      }

      setStatus('allowed')
    }

    void checkSession()
  }, [router])

  if (status === 'checking') {
    return <div className="rounded-xl border border-forge-border bg-forge-card p-6 text-forge-muted">Checking session...</div>
  }

  if (status === 'blocked') {
    return <LoadStatePanel title="Sign in to continue" message={`${label} is private to your account.`} showSignIn />
  }

  return <>{children}</>
}
