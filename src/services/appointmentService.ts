import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where
} from 'firebase/firestore'
import { db, auth } from '@/firebase/config'
import type { Appointment, AppointmentStatus, Role } from '@/types'
import { VALID_TRANSITIONS } from '@/types'
import { writeAuditEntry } from './auditService'
import { queueNotification } from './notificationService'
import { getSystemSettings } from './settingsService'

/**
 * Domain error carrying a stable code so the UI can show a specific message
 * (e.g. "That slot was just taken") instead of a raw Firestore error string.
 */
export class AppointmentError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

function slotLockId(doctorId: string, date: string, startTime: string) {
  return `${doctorId}_${date}_${startTime}`
}

function assertTransition(current: AppointmentStatus, next: AppointmentStatus) {
  if (!VALID_TRANSITIONS[current]?.includes(next)) {
    throw new AppointmentError(
      'INVALID_TRANSITION',
      `Cannot move an appointment from ${current} to ${next}.`
    )
  }
}

export interface NewBookingInput {
  patientName: string
  patientMobile: string
  patientAge?: number
  patientGender?: 'male' | 'female' | 'other'
  isNewPatient: boolean
  patientUhid?: string
  doctorId: string
  doctorName: string
  doctorUserId: string
  specializationId: string
  specializationName: string
  date: string
  startTime: string
  endTime: string
  createdBy: string
  createdByName: string
}

/**
 * Creates a temporary (pending-doctor-confirmation) booking.
 *
 * Double-booking is prevented with a per-slot lock document at a
 * deterministic ID (`slotLocks/{doctorId}_{date}_{startTime}`). Firestore
 * transactions retry automatically on contention, and the transaction reads
 * the lock before writing it, so if two receptionists race for the same slot
 * only one transaction commits — the other's `tx.get` sees the lock already
 * exists and throws before writing anything.
 */
export async function createTemporaryBooking(input: NewBookingInput): Promise<string> {
  const lockRef = doc(db, 'slotLocks', slotLockId(input.doctorId, input.date, input.startTime))
  const apptRef = doc(collection(db, 'appointments'))
  const settings = await getSystemSettings()

  await runTransaction(db, async (tx) => {
    const lockSnap = await tx.get(lockRef)
    if (lockSnap.exists()) {
      throw new AppointmentError('SLOT_TAKEN', 'That slot was just booked by someone else. Pick another.')
    }

    const expiresAt = Timestamp.fromMillis(Date.now() + settings.temporaryBookingMinutes * 60_000)

    tx.set(lockRef, {
      appointmentId: apptRef.id,
      doctorId: input.doctorId,
      date: input.date,
      startTime: input.startTime,
      status: 'HELD',
      createdAt: serverTimestamp()
    })

    tx.set(apptRef, {
      patientName: input.patientName,
      patientMobile: input.patientMobile,
      patientAge: input.patientAge ?? null,
      patientGender: input.patientGender ?? null,
      isNewPatient: input.isNewPatient,
      patientUhid: input.patientUhid ?? null,
      doctorId: input.doctorId,
      doctorName: input.doctorName,
      specializationId: input.specializationId,
      specializationName: input.specializationName,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      status: 'PENDING_DOCTOR_CONFIRMATION' as AppointmentStatus,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      temporaryBookingExpiresAt: expiresAt
    })

    queueNotification(tx, {
      recipientRole: 'doctor',
      recipientId: input.doctorUserId,
      title: 'New consultation request',
      body: `${input.patientName} · ${input.date} ${input.startTime} · ${input.specializationName}`,
      appointmentId: apptRef.id
    })

    writeAuditEntry(tx, {
      appointmentId: apptRef.id,
      actorId: input.createdBy,
      actorName: input.createdByName,
      actorRole: 'receptionist',
      action: 'Created temporary booking',
      newStatus: 'PENDING_DOCTOR_CONFIRMATION'
    })
  })

  return apptRef.id
}

export async function acceptConsultation(appointmentId: string, actorId: string, actorName: string) {
  const apptRef = doc(db, 'appointments', appointmentId)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(apptRef)
    if (!snap.exists()) throw new AppointmentError('NOT_FOUND', 'Appointment not found.')
    const appt = snap.data() as Appointment
    assertTransition(appt.status, 'CONFIRMED')

    tx.update(apptRef, { status: 'CONFIRMED', updatedAt: serverTimestamp() })

    const lockRef = doc(db, 'slotLocks', slotLockId(appt.doctorId, appt.date, appt.startTime))
    tx.update(lockRef, { status: 'CONFIRMED' })

    queueNotification(tx, {
      recipientRole: 'receptionist',
      recipientId: appt.createdBy || 'receptionist',
      title: 'Appointment confirmed',
      body: `Dr. ${appt.doctorName} confirmed ${appt.patientName} · ${appt.date} ${appt.startTime}`,
      appointmentId
    })

    writeAuditEntry(tx, {
      appointmentId,
      actorId,
      actorName,
      actorRole: 'doctor',
      action: 'Accepted consultation',
      previousStatus: appt.status,
      newStatus: 'CONFIRMED'
    })
  })
}

export interface CancellationRequestInput {
  appointmentId: string
  reason: string
  nextAvailableDate: string
  nextAvailableTime: string
  actorId: string
  actorName: string
  adminUserIds?: string[]
}

export async function requestDoctorCancellation(input: CancellationRequestInput) {
  // 1. Try backend Admin API endpoint (bypasses client Firestore permission limits)
  try {
    const token = await auth.currentUser?.getIdToken()
    if (token) {
      const res = await fetch('/api/requestDoctorCancellation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(input)
      })
      if (res.ok) {
        return
      }
      const data = await res.json().catch(() => ({}))
      throw new AppointmentError('FAILED', data.error || `Server responded with ${res.status}`)
    }
  } catch (apiErr) {
    if (apiErr instanceof AppointmentError) {
      throw apiErr
    }
    console.warn('[appointmentService] Backend requestDoctorCancellation network error, falling back to direct Firestore:', apiErr)
  }

  // 2. Direct Firestore transaction fallback
  const apptRef = doc(db, 'appointments', input.appointmentId)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(apptRef)
    if (!snap.exists()) throw new AppointmentError('NOT_FOUND', 'Appointment not found.')
    const appt = snap.data() as Appointment
    if (appt.status !== 'DOCTOR_CANCELLATION_REQUESTED') {
      assertTransition(appt.status, 'DOCTOR_CANCELLATION_REQUESTED')
    }

    tx.update(apptRef, {
      status: 'DOCTOR_CANCELLATION_REQUESTED',
      cancellationReason: input.reason,
      nextAvailableDate: input.nextAvailableDate || '',
      nextAvailableTime: input.nextAvailableTime || '',
      updatedAt: serverTimestamp()
    })

    const rawDocName = appt.doctorName || 'Doctor'
    const docTitle = rawDocName.startsWith('Dr.') ? rawDocName : `Dr. ${rawDocName}`

    const notifRecipient = appt.createdBy || 'receptionist'
    queueNotification(tx, {
      recipientRole: 'receptionist',
      recipientId: notifRecipient,
      title: 'Doctor requested rescheduling',
      body: `${docTitle} can't see ${appt.patientName} on ${appt.date} ${appt.startTime}. Reason: ${input.reason}${
        input.nextAvailableDate ? ` · Next slot suggested: ${input.nextAvailableDate} ${input.nextAvailableTime || ''}` : ''
      }`,
      appointmentId: input.appointmentId
    })

    if (input.adminUserIds && input.adminUserIds.length > 0) {
      for (const adminId of input.adminUserIds) {
        queueNotification(tx, {
          recipientRole: 'admin',
          recipientId: adminId,
          title: 'Doctor cancellation requested',
          body: `${docTitle} · ${appt.patientName} · ${appt.date} ${appt.startTime}`,
          appointmentId: input.appointmentId
        })
      }
    }

    writeAuditEntry(tx, {
      appointmentId: input.appointmentId,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: 'doctor',
      action: 'Requested cancellation',
      previousStatus: appt.status,
      newStatus: 'DOCTOR_CANCELLATION_REQUESTED',
      reason: input.reason
    })
  })
}

/** Receptionist cancels outright (no reschedule offered / patient declines). */
export async function cancelAppointment(appointmentId: string, actorId: string, actorName: string, actorRole: Role, reason?: string) {
  const apptRef = doc(db, 'appointments', appointmentId)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(apptRef)
    if (!snap.exists()) throw new AppointmentError('NOT_FOUND', 'Appointment not found.')
    const appt = snap.data() as Appointment
    assertTransition(appt.status, 'CANCELLED')

    tx.update(apptRef, { status: 'CANCELLED', cancellationReason: reason ?? appt.cancellationReason ?? null, updatedAt: serverTimestamp() })

    const lockRef = doc(db, 'slotLocks', slotLockId(appt.doctorId, appt.date, appt.startTime))
    tx.delete(lockRef)

    writeAuditEntry(tx, {
      appointmentId,
      actorId,
      actorName,
      actorRole,
      action: 'Cancelled appointment',
      previousStatus: appt.status,
      newStatus: 'CANCELLED',
      reason
    })
  })
}

export interface RescheduleInput {
  oldAppointmentId: string
  doctorId: string
  doctorName: string
  doctorUserId: string
  date: string
  startTime: string
  endTime: string
  actorId: string
  actorName: string
}

/**
 * Receptionist accepts the doctor's suggested (or a different) slot after a
 * DOCTOR_CANCELLATION_REQUESTED. Old appointment becomes RESCHEDULED, a new
 * one is created PENDING_DOCTOR_CONFIRMATION against the new slot, and the
 * two are linked via rescheduledFromId. Uses the same lock pattern as a
 * fresh booking, so the new slot is still race-safe even if it belongs to a
 * different doctor.
 */
export async function rescheduleAppointment(input: RescheduleInput): Promise<string> {
  const oldApptRef = doc(db, 'appointments', input.oldAppointmentId)
  const newApptRef = doc(collection(db, 'appointments'))
  const newLockRef = doc(db, 'slotLocks', slotLockId(input.doctorId, input.date, input.startTime))
  const settings = await getSystemSettings()

  await runTransaction(db, async (tx) => {
    const oldSnap = await tx.get(oldApptRef)
    if (!oldSnap.exists()) throw new AppointmentError('NOT_FOUND', 'Original appointment not found.')
    const oldAppt = oldSnap.data() as Appointment
    assertTransition(oldAppt.status, 'RESCHEDULED')

    const newLockSnap = await tx.get(newLockRef)
    if (newLockSnap.exists()) {
      throw new AppointmentError('SLOT_TAKEN', 'That slot was just booked by someone else. Pick another.')
    }

    const oldLockRef = doc(db, 'slotLocks', slotLockId(oldAppt.doctorId, oldAppt.date, oldAppt.startTime))
    tx.delete(oldLockRef)
    tx.update(oldApptRef, { status: 'RESCHEDULED', updatedAt: serverTimestamp() })

    const expiresAt = Timestamp.fromMillis(Date.now() + settings.temporaryBookingMinutes * 60_000)
    tx.set(newLockRef, {
      appointmentId: newApptRef.id,
      doctorId: input.doctorId,
      date: input.date,
      startTime: input.startTime,
      status: 'HELD',
      createdAt: serverTimestamp()
    })
    tx.set(newApptRef, {
      patientName: oldAppt.patientName,
      patientMobile: oldAppt.patientMobile,
      patientAge: oldAppt.patientAge ?? null,
      patientGender: oldAppt.patientGender ?? null,
      isNewPatient: false,
      patientUhid: oldAppt.patientUhid ?? null,
      doctorId: input.doctorId,
      doctorName: input.doctorName,
      specializationId: oldAppt.specializationId,
      specializationName: oldAppt.specializationName,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      status: 'PENDING_DOCTOR_CONFIRMATION' as AppointmentStatus,
      createdBy: input.actorId,
      createdByName: input.actorName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      temporaryBookingExpiresAt: expiresAt,
      rescheduledFromId: input.oldAppointmentId
    })

    queueNotification(tx, {
      recipientRole: 'doctor',
      recipientId: input.doctorUserId,
      title: 'New consultation request (rescheduled)',
      body: `${oldAppt.patientName} · ${input.date} ${input.startTime}`,
      appointmentId: newApptRef.id
    })

    writeAuditEntry(tx, {
      appointmentId: input.oldAppointmentId,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: 'receptionist',
      action: `Rescheduled to ${input.date} ${input.startTime} with Dr. ${input.doctorName}`,
      previousStatus: oldAppt.status,
      newStatus: 'RESCHEDULED'
    })
  })

  return newApptRef.id
}

export async function markCompleted(appointmentId: string, actorId: string, actorName: string) {
  await transitionSimple(appointmentId, 'COMPLETED', actorId, actorName, 'receptionist', 'Marked completed')
}

export async function markNoShow(appointmentId: string, actorId: string, actorName: string) {
  await transitionSimple(appointmentId, 'NO_SHOW', actorId, actorName, 'receptionist', 'Marked no-show')
}

async function transitionSimple(
  appointmentId: string,
  next: AppointmentStatus,
  actorId: string,
  actorName: string,
  actorRole: Role,
  action: string
) {
  const apptRef = doc(db, 'appointments', appointmentId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(apptRef)
    if (!snap.exists()) throw new AppointmentError('NOT_FOUND', 'Appointment not found.')
    const appt = snap.data() as Appointment
    assertTransition(appt.status, next)
    tx.update(apptRef, { status: next, updatedAt: serverTimestamp() })
    writeAuditEntry(tx, {
      appointmentId,
      actorId,
      actorName,
      actorRole,
      action,
      previousStatus: appt.status,
      newStatus: next
    })
  })
}

/**
 * Expires a single stale pending booking. Called opportunistically from the
 * receptionist/doctor dashboards on load; the authoritative sweep is the
 * scheduled Cloud Function in functions/src/index.ts, which does not depend
 * on anyone having the app open.
 */
export async function expireIfStale(appointmentId: string) {
  const apptRef = doc(db, 'appointments', appointmentId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(apptRef)
    if (!snap.exists()) return
    const appt = snap.data() as Appointment
    if (appt.status !== 'PENDING_DOCTOR_CONFIRMATION') return
    if (!appt.temporaryBookingExpiresAt || appt.temporaryBookingExpiresAt.toMillis() > Date.now()) return

    tx.update(apptRef, { status: 'EXPIRED', updatedAt: serverTimestamp() })
    const lockRef = doc(db, 'slotLocks', slotLockId(appt.doctorId, appt.date, appt.startTime))
    tx.delete(lockRef)
    queueNotification(tx, {
      recipientRole: 'receptionist',
      recipientId: appt.createdBy,
      title: 'Temporary booking expired',
      body: `${appt.patientName} · ${appt.date} ${appt.startTime} — doctor did not respond in time.`,
      appointmentId
    })
    writeAuditEntry(tx, {
      appointmentId,
      actorId: 'system',
      actorName: 'System',
      actorRole: 'admin',
      action: 'Temporary booking expired',
      previousStatus: 'PENDING_DOCTOR_CONFIRMATION',
      newStatus: 'EXPIRED'
    })
  })
}

// ---------- Reads ----------

export async function getAppointmentsForDoctorOnDate(doctorId: string, date: string): Promise<Appointment[]> {
  const q = query(collection(db, 'appointments'), where('doctorId', '==', doctorId), where('date', '==', date))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment)
}

export async function getAppointment(appointmentId: string): Promise<Appointment | null> {
  const snap = await getDoc(doc(db, 'appointments', appointmentId))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Appointment) : null
}

export async function listPendingConsultationsForDoctor(doctorId: string): Promise<Appointment[]> {
  try {
    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', doctorId),
      where('status', '==', 'PENDING_DOCTOR_CONFIRMATION')
    )
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment)
    list.sort((a, b) => {
      const dComp = (a.date || '').localeCompare(b.date || '')
      if (dComp !== 0) return dComp
      return (a.startTime || '').localeCompare(b.startTime || '')
    })
    return list
  } catch (err) {
    console.warn('[appointmentService] listPendingConsultationsForDoctor error:', err)
    return []
  }
}

/** Live subscription for doctor pending consultation requests. */
export function subscribeToPendingConsultationsForDoctor(
  doctorId: string,
  onChange: (items: Appointment[]) => void
) {
  const q = query(
    collection(db, 'appointments'),
    where('doctorId', '==', doctorId),
    where('status', '==', 'PENDING_DOCTOR_CONFIRMATION')
  )
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment)
      list.sort((a, b) => {
        const dComp = (a.date || '').localeCompare(b.date || '')
        if (dComp !== 0) return dComp
        return (a.startTime || '').localeCompare(b.startTime || '')
      })
      onChange(list)
    },
    (err) => {
      console.warn('[appointmentService] subscribeToPendingConsultationsForDoctor error:', err)
      onChange([])
    }
  )
}

/** Live subscription for receptionists to watch for doctor cancellation requests needing rescheduling. */
export function subscribeToAppointmentsAwaitingReceptionistAction(
  onChange: (items: Appointment[]) => void
) {
  const q = query(
    collection(db, 'appointments'),
    where('status', '==', 'DOCTOR_CANCELLATION_REQUESTED')
  )
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment)
      list.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      onChange(list)
    },
    (err) => {
      console.warn('[appointmentService] subscribeToAppointmentsAwaitingReceptionistAction error:', err)
      onChange([])
    }
  )
}

export async function listAppointmentsForDoctorToday(doctorId: string, dateStr: string): Promise<Appointment[]> {
  const q = query(collection(db, 'appointments'), where('doctorId', '==', doctorId), where('date', '==', dateStr), orderBy('startTime', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment)
}

export const listAppointmentsForDoctorDate = listAppointmentsForDoctorToday

/**
 * Lists all appointments for a given doctor across an entire month (e.g. "2026-09").
 * Returns appointments sorted by date asc, then startTime asc.
 */
export async function listAppointmentsForDoctorMonth(doctorId: string, yearMonth: string): Promise<Appointment[]> {
  const start = `${yearMonth}-01`
  const end = `${yearMonth}-31`
  try {
    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', doctorId),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'asc'),
      orderBy('startTime', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment)
  } catch (err) {
    console.warn('[appointmentService] listAppointmentsForDoctorMonth index fallback:', err)
    const q = query(
      collection(db, 'appointments'),
      where('doctorId', '==', doctorId)
    )
    const snap = await getDocs(q)
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Appointment)
      .filter((a) => a.date && a.date.startsWith(yearMonth))
      .sort((a, b) => (a.date === b.date ? (a.startTime || '').localeCompare(b.startTime || '') : (a.date || '').localeCompare(b.date || '')))
  }
}

export async function listAppointmentsByDate(dateStr: string): Promise<Appointment[]> {
  const q = query(collection(db, 'appointments'), where('date', '==', dateStr), orderBy('startTime', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment)
}

export async function listAppointmentsAwaitingReceptionistAction(): Promise<Appointment[]> {
  const q = query(collection(db, 'appointments'), where('status', '==', 'DOCTOR_CANCELLATION_REQUESTED'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Appointment)
}

/** Broad, filterable read for Admin > Appointments. Filters applied client-side after a bounded fetch. */
export async function listAllAppointments(max = 500): Promise<Appointment[]> {
  const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.slice(0, max).map((d) => ({ id: d.id, ...d.data() }) as Appointment)
}
