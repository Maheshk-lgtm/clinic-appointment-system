import type { Timestamp } from 'firebase/firestore'

// ---------- Roles & Users ----------

export type Role = 'admin' | 'receptionist' | 'doctor'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  role: Role
  active: boolean
  createdAt: Timestamp
  createdBy: string
  // Only set when role === 'doctor'; links to the doctors/{doctorId} document.
  doctorId?: string
  tempPassword?: string
}

// ---------- Doctors & Availability ----------

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface WorkingHours {
  day: Weekday
  enabled: boolean
  start: string // "09:00"
  end: string // "17:00"
  breakStart?: string
  breakEnd?: string
}

export interface Doctor {
  id: string
  userId: string // auth uid of the linked doctor account
  name: string
  specializationId: string
  specializationName: string
  qualification: string
  phone: string
  email: string
  consultationMinutes: number // default 30
  workingHours: WorkingHours[]
  // Explicit date overrides: leave, holiday, or special one-off availability.
  exceptions: DoctorException[]
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface DoctorException {
  date: string // "2026-09-23"
  type: 'leave' | 'holiday' | 'special'
  // For 'special' availability only — overrides working hours for that date.
  start?: string
  end?: string
  reason?: string
}

export interface Specialization {
  id: string
  name: string
  active: boolean
}

// ---------- Appointment status machine ----------

export type AppointmentStatus =
  | 'PENDING_DOCTOR_CONFIRMATION'
  | 'CONFIRMED'
  | 'DOCTOR_CANCELLATION_REQUESTED'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'EXPIRED'

// Valid forward transitions. Enforced client-side for UX and mirrored in
// Firestore rules / Cloud Functions so the frontend is never the source of truth.
export const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING_DOCTOR_CONFIRMATION: ['CONFIRMED', 'DOCTOR_CANCELLATION_REQUESTED', 'EXPIRED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'NO_SHOW', 'CANCELLED', 'DOCTOR_CANCELLATION_REQUESTED'],
  DOCTOR_CANCELLATION_REQUESTED: ['RESCHEDULED', 'CANCELLED', 'DOCTOR_CANCELLATION_REQUESTED'],
  RESCHEDULED: [],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
  EXPIRED: []
}

export interface Appointment {
  id: string
  patientName: string
  patientMobile: string
  patientAge?: number
  patientGender?: 'male' | 'female' | 'other'
  isNewPatient: boolean
  patientUhid?: string

  doctorId: string
  doctorName: string
  specializationId: string
  specializationName: string

  date: string // "2026-09-23"
  startTime: string // "09:00"
  endTime: string // "09:30"

  status: AppointmentStatus
  createdBy: string // receptionist uid
  createdByName: string
  createdAt: Timestamp
  updatedAt: Timestamp

  temporaryBookingExpiresAt?: Timestamp

  cancellationReason?: string
  nextAvailableDate?: string
  nextAvailableTime?: string

  // Set when this appointment was created to replace a doctor-cancelled one.
  rescheduledFromId?: string
}

// A single bookable slot, derived at read time from a doctor's working hours
// plus whatever appointments already occupy that date — not stored wholesale.
export interface Slot {
  doctorId: string
  date: string
  startTime: string
  endTime: string
  state: 'AVAILABLE' | 'TEMPORARILY_BOOKED' | 'CONFIRMED' | 'BLOCKED'
  appointmentId?: string
}

// ---------- Notifications ----------

export type NotificationChannel = 'in_app' // extend with 'sms' | 'whatsapp' | 'email' later

export interface AppNotification {
  id: string
  recipientRole: Role
  recipientId: string // uid, or doctorId for doctor-role notifications
  title: string
  body: string
  channel: NotificationChannel
  appointmentId?: string
  read: boolean
  createdAt: Timestamp
}

// ---------- Audit log ----------

export interface AuditLogEntry {
  id: string
  appointmentId: string
  actorId: string
  actorName: string
  actorRole: Role
  action: string
  previousStatus?: AppointmentStatus
  newStatus?: AppointmentStatus
  reason?: string
  timestamp: Timestamp
}

// ---------- Settings ----------

export interface SystemSettings {
  temporaryBookingMinutes: number
  defaultConsultationMinutes: number
  clinicName: string
}
