import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const env = (import.meta as any)?.env ?? {}

const firebaseConfig = {
  // Prefer env vars if present, otherwise fall back to hardcoded web app config.
  // Note: Firebase web apiKey is not treated as a secret, but env vars are still recommended for deployments.
  apiKey: (env.VITE_FIREBASE_API_KEY as string | undefined) ?? "AIzaSyBEHvOTR4iCcXLTTMT5AtTkO7FFgD3RRaQ",
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? "cook-and-craft-d0c89.firebaseapp.com",
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? "cook-and-craft-d0c89",
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) ?? "cook-and-craft-d0c89.firebasestorage.app",
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) ?? "28060882756",
  appId: (env.VITE_FIREBASE_APP_ID as string | undefined) ?? "1:28060882756:web:334dafd1e70d8139d82911",
  measurementId: (env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined) ?? "G-MZ2V9KC38C",
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

export const firebaseApp = (() => {
  if (!isFirebaseConfigured) return null
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
})()

export const firestore = firebaseApp ? getFirestore(firebaseApp) : null
