'use client'

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

export function getFirebaseBrowserApp(): FirebaseApp | null {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  }

  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    return null
  }

  return getApps().length ? getApp() : initializeApp(config)
}

export function getFirebaseBrowserAuth(): Auth | null {
  const app = getFirebaseBrowserApp()
  return app ? getAuth(app) : null
}
