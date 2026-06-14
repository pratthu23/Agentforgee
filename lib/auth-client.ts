'use client'

import { onAuthStateChanged, type User } from 'firebase/auth'
import { getFirebaseBrowserAuth } from '@/lib/firebase-client'

export type AppSession = {
  user: User
  accessToken: string
}

export async function getSessionOrRedirect(): Promise<AppSession | null> {
  const auth = getFirebaseBrowserAuth()

  if (!auth) {
    return null
  }

  const user = await Promise.race([
    waitForFirebaseUser(auth),
    new Promise<User | null>((resolve) => {
      window.setTimeout(() => resolve(null), 5000)
    })
  ])

  if (!user) {
    return null
  }

  return {
    user,
    accessToken: await getIdTokenWithTimeout(user)
  }
}

export async function getAuthHeaders(session?: AppSession | null): Promise<HeadersInit> {
  const activeSession = session ?? await getSessionOrRedirect()

  if (!activeSession) {
    return { 'Content-Type': 'application/json' }
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${activeSession.accessToken}`
  }
}

function waitForFirebaseUser(auth: NonNullable<ReturnType<typeof getFirebaseBrowserAuth>>): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

function getIdTokenWithTimeout(user: User): Promise<string> {
  return Promise.race([
    user.getIdToken(),
    new Promise<string>((_resolve, reject) => {
      window.setTimeout(() => reject(new Error('Firebase session timed out. Please refresh and sign in again.')), 5000)
    })
  ])
}
