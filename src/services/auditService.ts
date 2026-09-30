import { collection, getDocs, orderBy, query, serverTimestamp, where, type Transaction } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { AuditLogEntry, Role, AppointmentStatus } from '@/types'
import { doc } from 'firebase/firestore'

interface WriteAuditParams {
  appointmentId: string
  actorId: string
  actorName: string
  actorRole: Role
  action: string
  previousStatus?: AppointmentStatus
  newStatus?: AppointmentStatus
  reason?: string
}

/**
 * Writes an audit entry as part of an existing Firestore transaction, so the
 * log entry can never be created without the status change it describes
 * (or vice versa).
 */
export function writeAuditEntry(tx: Transaction, params: WriteAuditParams) {
  const ref = doc(collection(db, 'auditLogs'))
  tx.set(ref, { ...params, timestamp: serverTimestamp() })
}

export async function listAuditLogsForAppointment(appointmentId: string): Promise<AuditLogEntry[]> {
  const q = query(
    collection(db, 'auditLogs'),
    where('appointmentId', '==', appointmentId),
    orderBy('timestamp', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLogEntry)
}

export async function listRecentAuditLogs(max = 100): Promise<AuditLogEntry[]> {
  const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.slice(0, max).map((d) => ({ id: d.id, ...d.data() }) as AuditLogEntry)
}
