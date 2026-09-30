import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore'
import { getIdToken, sendPasswordResetEmail } from 'firebase/auth'
import { db, auth } from '@/firebase/config'
import type { Role, Specialization, UserProfile } from '@/types'

/**
 * Creates a Firebase Auth user + Firestore /users profile document.
 *
 * During local development, this calls the local Express API server at
 * /api/createUser (proxied by Vite from port 5174). The server uses the
 * Firebase Admin SDK with serviceAccountKey.json.
 *
 * In production, swap the fetch call back to the `createStaffUser`
 * Cloud Function via `httpsCallable(functions, 'createStaffUser')`.
 */
export async function createStaffUser(params: {
  email: string
  password: string
  displayName: string
  role: Role
  createdBy: string
}): Promise<{ uid: string }> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('You must be signed in to create accounts.')

  // Get the caller's ID token to authenticate against the server
  const idToken = await getIdToken(currentUser, true)

  let res: Response
  try {
    res = await fetch('/api/createUser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(params)
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    throw new Error(`Cannot connect to server (${errorMsg}). Please verify the application server is running.`)
  }

  const data = (await res.json().catch(() => ({}))) as { uid?: string; error?: string }

  if (!res.ok) {
    throw new Error(data.error ?? `Server error ${res.status}`)
  }

  if (!data.uid) {
    throw new Error('Failed to retrieve user ID from server.')
  }

  return { uid: data.uid }
}

export async function updateStaffUser(params: {
  uid: string
  displayName?: string
  email?: string
  password?: string
  role?: Role
  active?: boolean
}): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('You must be signed in to edit accounts.')

  const idToken = await getIdToken(currentUser, true)

  let res: Response
  try {
    res = await fetch('/api/updateUser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(params)
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    throw new Error(`Cannot connect to server (${errorMsg}). Please verify the application server is running.`)
  }

  const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }

  if (!res.ok) {
    throw new Error(data.error ?? `Server error ${res.status}`)
  }
}

/**
 * Generates an official Firebase Auth password reset URL via the admin API.
 * The admin can copy and send this URL directly to the user.
 */
export async function generatePasswordResetLink(email: string): Promise<string> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('You must be signed in to generate reset links.')

  const idToken = await getIdToken(currentUser, true)

  let res: Response
  try {
    res = await fetch('/api/generateResetLink', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ email })
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    throw new Error(`Cannot connect to server (${errorMsg}).`)
  }

  const data = (await res.json().catch(() => ({}))) as { resetLink?: string; error?: string }
  if (!res.ok || !data.resetLink) {
    throw new Error(data.error ?? `Failed to generate reset link (${res.status})`)
  }

  return data.resetLink
}

/**
 * Triggers standard Firebase password reset email to the user's email address.
 */
export async function sendStaffPasswordResetEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

/**
 * Permanently deletes a user from Firebase Auth and Firestore /users document.
 */
export async function deleteStaffUser(uid: string): Promise<void> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('You must be signed in to delete accounts.')

  const idToken = await getIdToken(currentUser, true)

  let res: Response
  try {
    res = await fetch('/api/deleteUser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({ uid })
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    throw new Error(`Cannot connect to server (${errorMsg}). Please verify the server is running.`)
  }

  const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }

  if (!res.ok) {
    throw new Error(data.error ?? `Server error ${res.status}`)
  }
}

export async function listUsers(): Promise<UserProfile[]> {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => d.data() as UserProfile)
  } catch (err) {
    console.warn('[userService] orderBy query error, falling back to all docs:', err)
    const snap = await getDocs(collection(db, 'users'))
    const users = snap.docs.map((d) => d.data() as UserProfile)
    return users.sort((a, b) => {
      const tA = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0
      const tB = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0
      return tB - tA
    })
  }
}

export async function setUserActive(uid: string, active: boolean) {
  await updateDoc(doc(db, 'users', uid), { active })
}

export async function linkDoctorAccount(uid: string, doctorId: string) {
  try {
    const token = await auth.currentUser?.getIdToken()
    if (token) {
      const res = await fetch('/api/linkDoctor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: uid, doctorId })
      })
      if (res.ok) return
    }
  } catch (err) {
    console.warn('[linkDoctorAccount] Backend linkDoctor failed, falling back to direct updateDoc:', err)
  }
  await updateDoc(doc(db, 'users', uid), { doctorId })
}

// ---------- Specializations ----------

export async function listSpecializations(activeOnly = true): Promise<Specialization[]> {
  const snap = await getDocs(collection(db, 'specializations'))
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Specialization)
  return activeOnly ? all.filter((s) => s.active) : all
}

export async function createSpecialization(name: string) {
  const ref = doc(collection(db, 'specializations'))
  await setDoc(ref, { name, active: true, createdAt: serverTimestamp() })
  return ref.id
}

export async function setSpecializationActive(id: string, active: boolean) {
  await updateDoc(doc(db, 'specializations', id), { active })
}
