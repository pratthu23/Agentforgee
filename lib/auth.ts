import { requireFirebaseStore } from '@/lib/firebase'

export type AuthenticatedUser = {
  id: string
  email: string | null
}

export async function getAuthenticatedUser(request: Request): Promise<{
  user: AuthenticatedUser | null
  error: string | null
}> {
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

  if (!apiKey) {
    return { user: null, error: 'Firebase Auth API key is not configured.' }
  }

  if (!token) {
    return { user: null, error: 'Sign in to continue.' }
  }

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    })
    const result = (await response.json()) as FirebaseLookupResponse

    if (!response.ok || !result.users?.[0]) {
      return { user: null, error: getFirebaseAuthError(result) }
    }

    const decoded = result.users[0]
    return {
      user: {
        id: decoded.localId,
        email: decoded.email ?? null
      },
      error: null
    }
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : 'Invalid session.' }
  }
}

export { requireFirebaseStore }

type FirebaseLookupResponse = {
  users?: Array<{
    localId: string
    email?: string
  }>
  error?: {
    message?: string
  }
}

function getFirebaseAuthError(result: FirebaseLookupResponse): string {
  const message = result.error?.message

  if (!message) {
    return 'Invalid Firebase session.'
  }

  return message.replaceAll('_', ' ').toLowerCase()
}
