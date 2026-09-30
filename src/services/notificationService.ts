import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Transaction
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { AppNotification, Role } from '@/types'

interface NotifyParams {
  recipientRole: Role
  recipientId: string
  title: string
  body: string
  appointmentId?: string
}

/**
 * Queues an in-app notification as part of an existing transaction.
 * Channel is fixed to 'in_app' for the MVP; the shape already carries what an
 * SMS/WhatsApp/email dispatcher (e.g. a Cloud Function trigger on this
 * collection) would need to send the same message on another channel later.
 */
export function queueNotification(tx: Transaction, params: NotifyParams) {
  const ref = doc(collection(db, 'notifications'))
  tx.set(ref, {
    ...params,
    channel: 'in_app',
    read: false,
    createdAt: serverTimestamp()
  })
}

/** Live subscription to a user's unread-first notification feed. */
export function subscribeToNotifications(
  recipientId: string,
  onChange: (items: AppNotification[]) => void,
  userRole?: Role
) {
  const q = userRole === 'receptionist'
    ? query(
        collection(db, 'notifications'),
        where('recipientRole', '==', 'receptionist')
      )
    : query(
        collection(db, 'notifications'),
        where('recipientId', '==', recipientId)
      )

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification)
      list.sort((a, b) => {
        const aT = a.createdAt?.toMillis?.() ?? 0
        const bT = b.createdAt?.toMillis?.() ?? 0
        return bT - aT
      })
      onChange(list.slice(0, 50))
    },
    (err) => {
      console.warn('[notificationService] Notification subscription error:', err)
      onChange([])
    }
  )
}

export async function markNotificationRead(id: string) {
  await updateDoc(doc(db, 'notifications', id), { read: true })
}
