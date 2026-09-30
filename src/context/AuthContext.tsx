import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { auth, db } from '@/firebase/config'
import type { UserProfile } from '@/types'

interface AuthContextValue {
  firebaseUser: User | null
  profile: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function autoResolveDoctorProfile(uid: string, email: string | null, prof: UserProfile): Promise<UserProfile> {
  if (prof.role !== 'doctor' || prof.doctorId) return prof
  try {
    // 1. Try backend sync endpoint (uses Admin SDK with root permissions)
    const token = await auth.currentUser?.getIdToken()
    if (token) {
      try {
        const res = await fetch('/api/syncDoctorProfile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.doctorId) {
            return { ...prof, doctorId: data.doctorId }
          }
        }
      } catch (fetchErr) {
        console.warn('[AuthContext] syncDoctorProfile fetch error:', fetchErr)
      }
    }

    // 2. Client-side Firestore lookup fallback
    const q1 = query(collection(db, 'doctors'), where('userId', '==', uid))
    const s1 = await getDocs(q1)
    if (!s1.empty) {
      const docId = s1.docs[0].id
      return { ...prof, doctorId: docId }
    }
    if (email) {
      const cleanEmail = email.trim().toLowerCase()
      const q2 = query(collection(db, 'doctors'), where('email', '==', cleanEmail))
      const s2 = await getDocs(q2)
      if (!s2.empty) {
        const docId = s2.docs[0].id
        return { ...prof, doctorId: docId }
      }
      const q3 = query(collection(db, 'doctors'), where('email', '==', email.trim()))
      const s3 = await getDocs(q3)
      if (!s3.empty) {
        const docId = s3.docs[0].id
        return { ...prof, doctorId: docId }
      }
    }
  } catch (err) {
    console.warn('[AuthContext] Doctor profile auto-resolve error:', err)
  }
  return prof
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)
      if (!user) {
        setProfile(null)
        setLoading(false)
      }
    })
    return unsubAuth
  }, [])

  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    let isMounted = true

    // Safety timeout: if snapshot takes more than 1.5 seconds, force-fetch with getDoc
    const safetyTimer = setTimeout(async () => {
      if (!isMounted) return
      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (isMounted) {
          if (snap.exists()) {
            const rawProf = snap.data() as UserProfile
            setProfile(rawProf)
            setLoading(false)
            if (rawProf.role === 'doctor' && !rawProf.doctorId) {
              autoResolveDoctorProfile(firebaseUser.uid, firebaseUser.email, rawProf).then((resolved) => {
                if (isMounted && resolved.doctorId) setProfile(resolved)
              })
            }
          } else {
            setProfile(null)
            setLoading(false)
          }
        }
      } catch (e) {
        console.error('[AuthContext] getDoc fallback error:', e)
        if (isMounted) setLoading(false)
      }
    }, 1500)

    // Live subscription
    const unsub = onSnapshot(
      doc(db, 'users', firebaseUser.uid),
      (snap) => {
        clearTimeout(safetyTimer)
        if (isMounted) {
          if (snap.exists()) {
            const rawProf = snap.data() as UserProfile
            // Immediately unblock the UI so protected route never buffers!
            setProfile(rawProf)
            setLoading(false)

            // Resolve doctorId in the background if missing
            if (rawProf.role === 'doctor' && !rawProf.doctorId) {
              autoResolveDoctorProfile(firebaseUser.uid, firebaseUser.email, rawProf).then((resolved) => {
                if (isMounted && resolved.doctorId) {
                  setProfile(resolved)
                }
              })
            }
          } else {
            setProfile(null)
            setLoading(false)
          }
        }
      },
      (error) => {
        console.error('[AuthContext] Snapshot listener error:', error)
        clearTimeout(safetyTimer)
        if (isMounted) {
          getDoc(doc(db, 'users', firebaseUser.uid))
            .then((snap) => {
              if (isMounted) {
                setProfile(snap.exists() ? (snap.data() as UserProfile) : null)
                setLoading(false)
              }
            })
            .catch(() => {
              if (isMounted) setLoading(false)
            })
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(safetyTimer)
      unsub()
    }
  }, [firebaseUser])

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
