'use client'

import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getFirebaseBrowserAuth } from '@/lib/firebase-client'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Saved Agents' },
  { href: '/agent/new', label: 'Create Agent' }
]

export function Navbar() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseBrowserAuth()

    if (!auth) {
      return
    }

    return onAuthStateChanged(auth, (user) => setEmail(user?.email ?? null))
  }, [])

  async function signOut() {
    const auth = getFirebaseBrowserAuth()
    if (auth) await firebaseSignOut(auth)
    setEmail(null)
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-forge-border bg-forge-bg/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight transition-all duration-200 hover:text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-forge-purple/20 text-base">AF</span>
          AgentForge
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-forge-muted">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 transition-all duration-200 hover:bg-white/5 hover:text-forge-text"
            >
              {item.label}
            </Link>
          ))}
          {email ? (
            <button onClick={signOut} className="rounded-lg border border-forge-border px-3 py-2 text-forge-text transition-all duration-200 hover:bg-white/5">
              Sign out
            </button>
          ) : (
            <Link href="/login" className="rounded-lg border border-forge-border px-3 py-2 text-forge-text transition-all duration-200 hover:bg-white/5">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
