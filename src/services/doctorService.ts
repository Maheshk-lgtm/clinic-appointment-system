import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { Doctor, Slot, Weekday, WorkingHours } from '@/types'
import { getAppointmentsForDoctorOnDate } from './appointmentService'

const WEEKDAY_ORDER: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export async function listDoctors(activeOnly = true): Promise<Doctor[]> {
  const col = collection(db, 'doctors')
  const q = activeOnly ? query(col, where('active', '==', true)) : col
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Doctor)
}

export async function listDoctorsBySpecialization(specializationId: string): Promise<Doctor[]> {
  const q = query(
    collection(db, 'doctors'),
    where('specializationId', '==', specializationId),
    where('active', '==', true)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Doctor)
}

export async function getDoctor(doctorId: string): Promise<Doctor | null> {
  const snap = await getDoc(doc(db, 'doctors', doctorId))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Doctor) : null
}

export async function createDoctor(input: Omit<Doctor, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = await addDoc(collection(db, 'doctors'), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  // Guarantee two-way linkage: update the user document with doctorId
  if (input.userId) {
    try {
      await updateDoc(doc(db, 'users', input.userId), { doctorId: ref.id })
    } catch (e) {
      console.warn('[createDoctor] Could not auto-link user document:', e)
    }
  }

  return ref
}

export async function updateDoctor(doctorId: string, patch: Partial<Doctor>) {
  await updateDoc(doc(db, 'doctors', doctorId), { ...patch, updatedAt: serverTimestamp() })

  // Guarantee two-way linkage: update the user document if userId changed or set
  if (patch.userId) {
    try {
      await updateDoc(doc(db, 'users', patch.userId), { doctorId })
    } catch (e) {
      console.warn('[updateDoctor] Could not auto-link user document:', e)
    }
  }
}

export async function linkDoctorToUser(userId: string, doctorId: string) {
  await Promise.all([
    updateDoc(doc(db, 'users', userId), { doctorId }),
    updateDoc(doc(db, 'doctors', doctorId), { userId, updatedAt: serverTimestamp() })
  ])
}

export async function getDoctorForUser(userId: string, email?: string): Promise<Doctor | null> {
  if (userId) {
    const q1 = query(collection(db, 'doctors'), where('userId', '==', userId))
    const snap1 = await getDocs(q1)
    if (!snap1.empty) {
      const d = snap1.docs[0]
      return { id: d.id, ...d.data() } as Doctor
    }
  }
  if (email) {
    const q2 = query(collection(db, 'doctors'), where('email', '==', email.trim().toLowerCase()))
    const snap2 = await getDocs(q2)
    if (!snap2.empty) {
      const d = snap2.docs[0]
      return { id: d.id, ...d.data() } as Doctor
    }
    // Also try case-insensitive / exact match as stored
    const q3 = query(collection(db, 'doctors'), where('email', '==', email.trim()))
    const snap3 = await getDocs(q3)
    if (!snap3.empty) {
      const d = snap3.docs[0]
      return { id: d.id, ...d.data() } as Doctor
    }
  }
  return null
}

export async function setDoctorActive(doctorId: string, active: boolean) {
  await updateDoc(doc(db, 'doctors', doctorId), { active, updatedAt: serverTimestamp() })
}

/** Minutes since midnight for an "HH:mm" string. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, '0')
  const m = (mins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function weekdayOf(dateStr: string): Weekday {
  const d = new Date(dateStr + 'T00:00:00')
  return WEEKDAY_ORDER[d.getDay()]
}

/**
 * Is the doctor working at all on this date? False for holidays/leave
 * exceptions and for days where working hours are disabled and there's no
 * "special" override.
 */
export function isDoctorAvailableOnDate(doctor: Doctor, dateStr: string): boolean {
  const exception = (doctor.exceptions || []).find((e) => e.date === dateStr)
  if (exception?.type === 'leave' || exception?.type === 'holiday') return false
  if (exception?.type === 'special') return true

  const wh = (doctor.workingHours || []).find((w) => w.day === weekdayOf(dateStr))
  return !!wh?.enabled
}

export function getDoctorAvailabilityForDate(
  doctor: Doctor,
  dateStr: string
): {
  status: 'available' | 'leave' | 'holiday' | 'special' | 'weekly_off'
  label: string
  start?: string
  end?: string
  reason?: string
} {
  const exceptions = doctor.exceptions || []
  const ex = exceptions.find((e) => e.date === dateStr)
  if (ex) {
    if (ex.type === 'leave') {
      return { status: 'leave', label: 'On Leave / Day Off', reason: ex.reason || 'Doctor on leave' }
    }
    if (ex.type === 'holiday') {
      return { status: 'holiday', label: 'Holiday / Closed', reason: ex.reason || 'Clinic Holiday' }
    }
    if (ex.type === 'special') {
      return {
        status: 'special',
        label: 'Special Working Hours',
        start: ex.start,
        end: ex.end,
        reason: ex.reason || 'Custom shift'
      }
    }
  }

  const wh = (doctor.workingHours || []).find((w) => w.day === weekdayOf(dateStr))
  if (wh?.enabled) {
    return {
      status: 'available',
      label: 'Standard Working Hours',
      start: wh.start,
      end: wh.end
    }
  }

  return {
    status: 'weekly_off',
    label: 'Weekly Day Off',
    reason: 'Scheduled day off in regular weekly hours'
  }
}

export async function setDoctorDayAvailability(
  doctorId: string,
  dateStr: string,
  status: 'available' | 'leave' | 'special',
  details?: { start?: string; end?: string; reason?: string }
): Promise<Doctor> {
  const docRef = doc(db, 'doctors', doctorId)
  const snap = await getDoc(docRef)
  if (!snap.exists()) {
    throw new Error('Doctor profile not found')
  }
  const doctor = { id: snap.id, ...snap.data() } as Doctor
  const existingExceptions = doctor.exceptions || []
  const otherExceptions = existingExceptions.filter((e) => e.date !== dateStr)
  const newExceptions = [...otherExceptions]

  if (status === 'leave') {
    newExceptions.push({
      date: dateStr,
      type: 'leave',
      reason: details?.reason?.trim() || 'On leave'
    })
  } else if (status === 'special') {
    newExceptions.push({
      date: dateStr,
      type: 'special',
      start: details?.start || '09:00',
      end: details?.end || '17:00',
      reason: details?.reason?.trim() || 'Special working hours'
    })
  } else if (status === 'available') {
    const wh = (doctor.workingHours || []).find((w) => w.day === weekdayOf(dateStr))
    if (!wh?.enabled) {
      newExceptions.push({
        date: dateStr,
        type: 'special',
        start: details?.start || wh?.start || '09:00',
        end: details?.end || wh?.end || '17:00',
        reason: details?.reason?.trim() || 'Available (Weekly off override)'
      })
    }
  }

  await updateDoc(docRef, {
    exceptions: newExceptions,
    updatedAt: serverTimestamp()
  })

  return { ...doctor, exceptions: newExceptions }
}

export async function updateDoctorWeeklyHours(
  doctorId: string,
  workingHours: WorkingHours[]
): Promise<void> {
  const docRef = doc(db, 'doctors', doctorId)
  await updateDoc(docRef, {
    workingHours,
    updatedAt: serverTimestamp()
  })
}

function resolveWindow(doctor: Doctor, dateStr: string): { start: string; end: string; breakStart?: string; breakEnd?: string } | null {
  const exception = (doctor.exceptions || []).find((e) => e.date === dateStr)
  if (exception?.type === 'leave' || exception?.type === 'holiday') return null
  if (exception?.type === 'special' && exception.start && exception.end) {
    return { start: exception.start, end: exception.end }
  }
  const wh: WorkingHours | undefined = (doctor.workingHours || []).find((w) => w.day === weekdayOf(dateStr))
  if (!wh?.enabled) return null
  return { start: wh.start, end: wh.end, breakStart: wh.breakStart, breakEnd: wh.breakEnd }
}

/**
 * Builds the full day of slots for a doctor, merging generated time blocks
 * with whatever appointments currently occupy them. This is a read-time
 * projection, not a stored collection — so slot layout always reflects the
 * doctor's latest working hours.
 */
export async function getSlotsForDoctorOnDate(doctor: Doctor, dateStr: string): Promise<Slot[]> {
  const window = resolveWindow(doctor, dateStr)
  if (!window) return []

  const duration = doctor.consultationMinutes || 30
  const slots: Slot[] = []
  let cursor = toMinutes(window.start)
  const end = toMinutes(window.end)
  const breakStart = window.breakStart ? toMinutes(window.breakStart) : null
  const breakEnd = window.breakEnd ? toMinutes(window.breakEnd) : null

  while (cursor + duration <= end) {
    const slotEnd = cursor + duration
    const overlapsBreak = breakStart !== null && breakEnd !== null && cursor < breakEnd && slotEnd > breakStart
    if (!overlapsBreak) {
      slots.push({
        doctorId: doctor.id,
        date: dateStr,
        startTime: toHHMM(cursor),
        endTime: toHHMM(slotEnd),
        state: 'AVAILABLE'
      })
    }
    cursor = slotEnd
  }

  const appointments = await getAppointmentsForDoctorOnDate(doctor.id, dateStr)
  for (const appt of appointments) {
    const slot = slots.find((s) => s.startTime === appt.startTime)
    if (!slot) continue
    if (appt.status === 'PENDING_DOCTOR_CONFIRMATION') {
      slot.state = 'TEMPORARILY_BOOKED'
      slot.appointmentId = appt.id
    } else if (appt.status === 'CONFIRMED') {
      slot.state = 'CONFIRMED'
      slot.appointmentId = appt.id
    }
    // CANCELLED / EXPIRED / RESCHEDULED / COMPLETED / NO_SHOW appointments
    // free the slot back to AVAILABLE, so they're intentionally not handled above.
  }

  return slots
}
