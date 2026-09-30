import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { auth } from '@/firebase/config'
import {
  listAppointmentsForDoctorDate,
  acceptConsultation,
  requestDoctorCancellation,
  subscribeToPendingConsultationsForDoctor,
  AppointmentError
} from '@/services/appointmentService'
import { getDoctorForUser } from '@/services/doctorService'
import type { Appointment } from '@/types'
import { Button, Card, EmptyState, LoadingSpinner, Modal } from '@/components/Primitives'
import { StatusBadge } from '@/components/StatusBadge'
import { DoctorUpcomingReminders } from '@/components/DoctorUpcomingReminders'
import { DoctorMonthCalendar } from '@/components/DoctorMonthCalendar'
import {
  getLocalISODate,
  getDateOffset,
  formatFriendlyDate,
  formatTime12h
} from '@/utils/dateUtils'

function extractErrorMessage(err: unknown): string {
  if (!err) return 'An unknown error occurred.'
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    const anyErr = err as Record<string, unknown>
    if (typeof anyErr.message === 'string' && anyErr.message.trim()) {
      return anyErr.message
    }
    if (typeof anyErr.error === 'string' && anyErr.error.trim()) {
      return anyErr.error
    }
    if (typeof anyErr.code === 'string') {
      return `Error: ${anyErr.code}`
    }
  }
  return 'Could not submit request.'
}

export function DoctorDashboard() {
  const { profile } = useAuth()
  const { show } = useToast()
  const [selectedDate, setSelectedDate] = useState<string>(getLocalISODate())
  const [resolvedDoctorId, setResolvedDoctorId] = useState<string | null>(profile?.doctorId ?? null)
  const [resolving, setResolving] = useState(!profile?.doctorId)
  const [pendingRequests, setPendingRequests] = useState<Appointment[]>([])
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [tomorrowAppointments, setTomorrowAppointments] = useState<Appointment[]>([])
  const [dayAfterAppointments, setDayAfterAppointments] = useState<Appointment[]>([])
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)

  // Cancellation modal state
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [reason, setReason] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [nextTime, setNextTime] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function refreshDoctorDateCounts(docId: string) {
    const today = getLocalISODate()
    const tomorrow = getDateOffset(1)
    const dayAfterTomorrow = getDateOffset(2)
    try {
      const [tList, tmList, datList] = await Promise.all([
        listAppointmentsForDoctorDate(docId, today),
        listAppointmentsForDoctorDate(docId, tomorrow),
        listAppointmentsForDoctorDate(docId, dayAfterTomorrow)
      ])
      setTodayAppointments(tList)
      setTomorrowAppointments(tmList)
      setDayAfterAppointments(datList)
    } catch (err) {
      console.warn('[DoctorDashboard] Error fetching doctor date counts:', err)
    }
  }

  // Resolve doctor profile connection on mount or profile change
  useEffect(() => {
    let isCurrent = true

    // Safety timeout: if resolving takes more than 2 seconds, stop resolving and unblock the UI!
    const safetyTimeout = setTimeout(() => {
      if (isCurrent && resolving) {
        setResolving(false)
      }
    }, 2000)

    async function syncDoctorProfile() {
      const currentDocId = profile?.doctorId || resolvedDoctorId
      if (currentDocId) {
        if (isCurrent) {
          setResolvedDoctorId(currentDocId)
          setResolving(false)
          refreshDoctorDateCounts(currentDocId)
        }
        return
      }

      if (profile?.uid) {
        try {
          // 1. Try server-side self-heal endpoint with root admin privileges
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
                if (data.doctorId && isCurrent) {
                  setResolvedDoctorId(data.doctorId)
                  setResolving(false)
                  refreshDoctorDateCounts(data.doctorId)
                  return
                }
              }
            } catch (err) {
              console.warn('[DoctorDashboard] syncDoctorProfile fetch error:', err)
            }
          }

          // 2. Client-side fallback lookup
          const doc = await getDoctorForUser(profile.uid, profile.email)
          if (doc && isCurrent) {
            setResolvedDoctorId(doc.id)
            setResolving(false)
            refreshDoctorDateCounts(doc.id)
            return
          }
        } catch (e) {
          console.warn('[DoctorDashboard] Auto-resolve failed:', e)
        } finally {
          if (isCurrent) {
            setResolving(false)
          }
        }
      } else {
        if (isCurrent) {
          setResolving(false)
        }
      }
    }

    syncDoctorProfile()

    return () => {
      isCurrent = false
      clearTimeout(safetyTimeout)
    }
  }, [profile?.doctorId, profile?.uid])

  const effectiveDoctorId = resolvedDoctorId || profile?.doctorId

  // Real-time live listener for all pending consultation requests for this doctor
  useEffect(() => {
    if (!effectiveDoctorId) return
    const unsub = subscribeToPendingConsultationsForDoctor(effectiveDoctorId, setPendingRequests)
    return () => unsub()
  }, [effectiveDoctorId])

  async function handleAccept(appt: Appointment) {
    if (!profile) return
    try {
      await acceptConsultation(appt.id, profile.uid, profile.displayName)
      show('Consultation confirmed. Reception has been notified.', 'success')
      if (effectiveDoctorId) {
        refreshDoctorDateCounts(effectiveDoctorId)
        setCalendarRefreshKey((k) => k + 1)
      }
    } catch (err) {
      show(err instanceof AppointmentError ? err.message : 'Could not accept consultation.', 'error')
    }
  }

  function openCancellation(a: Appointment) {
    setCancelTarget(a)
    setReason(a.cancellationReason || '')
    const d = new Date()
    d.setDate(d.getDate() + 1)
    setNextDate(a.nextAvailableDate || d.toISOString().slice(0, 10))
    setNextTime(a.nextAvailableTime || a.startTime || '10:00')
  }

  function closeCancellation() {
    if (submitting) return
    setCancelTarget(null)
    setReason('')
    setNextDate('')
    setNextTime('')
  }

  async function submitCancellation() {
    if (!cancelTarget || !profile) return
    const finalReason = reason.trim() || 'Doctor is unavailable at this scheduled time'
    const isUpdate = cancelTarget.status === 'DOCTOR_CANCELLATION_REQUESTED'
    setSubmitting(true)
    try {
      await requestDoctorCancellation({
        appointmentId: cancelTarget.id,
        reason: finalReason,
        nextAvailableDate: nextDate || getLocalISODate(),
        nextAvailableTime: nextTime || '10:00',
        actorId: profile.uid,
        actorName: profile.displayName
      })
      show(
        isUpdate
          ? 'Unavailability notes and next slot updated successfully.'
          : 'Cancellation request submitted. Reception notified to adjust schedule.',
        'success'
      )
      closeCancellation()
      if (effectiveDoctorId) {
        refreshDoctorDateCounts(effectiveDoctorId)
        setCalendarRefreshKey((k) => k + 1)
      }
    } catch (err: unknown) {
      console.error('[DoctorDashboard] Cancellation error:', err)
      const msg = extractErrorMessage(err)
      show(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (resolving) {
    return <LoadingSpinner label="Connecting your doctor profile…" />
  }

  if (!effectiveDoctorId) {
    return (
      <EmptyState
        title="No doctor profile linked"
        body="Ask your clinic admin to link your account to a doctor record in 'All Doctors' under Admin > Doctors."
      />
    )
  }

  const today = getLocalISODate()
  const tomorrow = getDateOffset(1)
  const dayAfterTomorrow = getDateOffset(2)

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
      {/* Greeting Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          Good day, Dr.{' '}
          {profile?.displayName
            ? profile.displayName.replace(/^Dr\.?\s*/i, '').split(' ')[0]
            : 'Doctor'}
        </h1>
        <p className="text-sm text-slate-500">
          Manage consultation schedules, confirmations, and monthly slot availability
        </p>
      </div>

      {/* New Consultation Requests Section: Visible whenever there are pending bookings awaiting doctor response */}
      {pendingRequests.length > 0 && (
        <Card className="p-4 sm:p-5 border-amber-300 bg-gradient-to-br from-amber-50/95 via-orange-50/40 to-white shadow-sm space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-ink">New Consultation Requests</h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200/90 text-amber-900 border border-amber-300">
                    {pendingRequests.length} awaiting response
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600">
                  New patient bookings awaiting your confirmation or cancellation response
                </p>
              </div>
            </div>
            <span className="text-[11px] text-amber-800 font-semibold bg-amber-100/70 px-2.5 py-1 rounded-md border border-amber-200/70 self-start sm:self-auto">
              Action required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-amber-200/90 p-3.5 shadow-2xs flex flex-col justify-between space-y-3 hover:border-amber-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-amber-900 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded">
                          {formatFriendlyDate(a.date)}
                        </span>
                        <span className="text-xs font-bold text-clinic-700">
                          {formatTime12h(a.startTime)} – {formatTime12h(a.endTime)}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-ink mt-1 truncate">
                        {a.patientName}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {a.specializationName || 'General Consultation'}
                        {a.patientMobile ? ` · Tel: ${a.patientMobile}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleAccept(a)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Accept</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openCancellation(a)}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Can't attend</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Advance Reminder: Today's, Tomorrow's and Day After Tomorrow's Appointments with Exact Times */}
      <DoctorUpcomingReminders
        todayDate={today}
        todayAppointments={todayAppointments}
        tomorrowDate={tomorrow}
        tomorrowAppointments={tomorrowAppointments}
        dayAfterDate={dayAfterTomorrow}
        dayAfterAppointments={dayAfterAppointments}
        onSelectDate={setSelectedDate}
        onAcceptAppointment={handleAccept}
        onCancelAppointment={openCancellation}
      />

      {/* Monthly Calendar View: Whole month slots booked with date and time */}
      <DoctorMonthCalendar
        doctorId={effectiveDoctorId}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onAcceptAppointment={handleAccept}
        onCancelAppointment={openCancellation}
        refreshKey={calendarRefreshKey}
      />

      {/* Unavailability / Can't Attend Modal */}
      <Modal
        open={!!cancelTarget}
        onClose={closeCancellation}
        title={
          cancelTarget?.status === 'DOCTOR_CANCELLATION_REQUESTED'
            ? `Update unavailability — ${cancelTarget?.patientName ?? ''}`
            : `Doctor unavailable / Can't attend — ${cancelTarget?.patientName ?? ''}`
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeCancellation} disabled={submitting}>
              Back
            </Button>
            <Button variant="danger" onClick={submitCancellation} disabled={submitting}>
              {submitting
                ? 'Submitting…'
                : cancelTarget?.status === 'DOCTOR_CANCELLATION_REQUESTED'
                  ? 'Update unavailability'
                  : 'Submit cancellation request'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {cancelTarget && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-ink text-sm">{cancelTarget.patientName}</p>
              <p>
                Scheduled for: <span className="font-bold text-clinic-700">{formatFriendlyDate(cancelTarget.date)}</span> at{' '}
                <span className="font-bold text-clinic-700">{formatTime12h(cancelTarget.startTime)} – {formatTime12h(cancelTarget.endTime)}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                {cancelTarget.specializationName || 'General Consultation'}
                {cancelTarget.patientMobile ? ` · Tel: ${cancelTarget.patientMobile}` : ''}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-700 mb-1.5 font-semibold">
              Reason for cancellation *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-clinic-500 focus:ring-1 focus:ring-clinic-500 text-ink"
              placeholder="e.g. Emergency surgical procedure, medical leave, unexpected conflict"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['Emergency surgery', 'Medical / Sick leave', 'Schedule conflict', 'Personal emergency'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setReason(chip)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    reason === chip
                      ? 'bg-clinic-100 text-clinic-800 border-clinic-300 font-medium'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
            <div>
              <label className="block text-xs text-slate-700 mb-1 font-semibold">
                Suggested next available date
              </label>
              <input
                type="date"
                min={today}
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white text-ink"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-700 mb-1 font-semibold">
                Suggested next available time
              </label>
              <input
                type="time"
                value={nextTime}
                onChange={(e) => setNextTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white text-ink"
              />
            </div>
            <p className="col-span-1 sm:col-span-2 text-[11px] text-slate-500">
              Reception will receive this cancellation request to adjust the appointment with the patient and confirm the new slot.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
