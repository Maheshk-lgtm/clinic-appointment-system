import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as unknown as Record<string, string | undefined>)
    : (typeof process !== 'undefined' && process.env ? process.env : {})

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyC851kdDa5-k7EiSX9urXvi-WuktmoUTV4',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'bmdv1-bf98b.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'bmdv1-bf98b',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'bmdv1-bf98b.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '993223171758',
  appId: env.VITE_FIREBASE_APP_ID || '1:993223171758:web:2a8bf83b940baa0d38573f'
}

// Guard against re-initialization during HMR.
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)
