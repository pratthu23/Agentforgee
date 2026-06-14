'use client'

import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getFirebaseBrowserAuth } from '@/lib/firebase-client'

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const auth = getFirebaseBrowserAuth()

    if (!auth) {
      setError('Firebase is not configured.')
      setLoading(false)
      return
    }

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
        setMessage('Account created. Opening your dashboard...')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    setMessage(null)
    setGoogleLoading(true)

    const auth = getFirebaseBrowserAuth()

    if (!auth) {
      setError('Firebase is not configured.')
      setGoogleLoading(false)
      return
    }

    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Google sign-in failed.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md rounded-xl border border-forge-border bg-forge-card p-6 shadow-glow">
      <h1 className="text-3xl font-black text-white">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      <p className="mt-2 text-sm text-forge-muted">Your agents, runs, and evaluations stay private to your account.</p>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className="mt-6 w-full rounded-xl border border-forge-border bg-white px-5 py-3 font-semibold text-slate-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-60"
      >
        {googleLoading ? 'Connecting Google...' : 'Continue with Google'}
      </button>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-forge-muted">
        <span className="h-px flex-1 bg-forge-border" />
        Email
        <span className="h-px flex-1 bg-forge-border" />
      </div>
      <label className="block text-sm font-semibold text-forge-text" htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-2 w-full rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-forge-text transition-all duration-200 focus:border-forge-purple"
        required
      />
      <label className="mt-4 block text-sm font-semibold text-forge-text" htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-2 w-full rounded-xl border border-forge-border bg-black/30 px-4 py-3 text-forge-text transition-all duration-200 focus:border-forge-purple"
        required
        minLength={6}
      />
      {error ? <p className="mt-4 rounded-lg border border-forge-red/40 bg-forge-red/10 p-3 text-sm text-red-100">{error}</p> : null}
      {message ? <p className="mt-4 rounded-lg border border-forge-green/40 bg-forge-green/10 p-3 text-sm text-green-100">{message}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-forge-purple to-forge-blue px-5 py-3 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
      >
        {loading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Sign up'}
      </button>
    </form>
  )
}
