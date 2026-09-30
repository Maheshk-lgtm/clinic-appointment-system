import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { auth } from '@/firebase/config'
import {
  listPendingConsultationsForDoctor,
  acceptConsultation,
  requestDoctorCancellation,
  AppointmentError,
} from '@/services/appointmentService'
import { getDoctorForUser } from '@/services/doctorService'
import type { Appointment } from '@/types'
import {
  Button,
  Card,
  EmptyState,
  LoadingSpinner,
  Modal,
} from '@/components/Primitives'
import { formatTime12h } from '@/utils/dateUtils'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

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

export function DoctorRequestsPage() {
  const { profile } = useAuth()
  const { show } = useToast()

  const [items, setItems] = useState<Appointment[] | null>(null)
  const [resolvedDoctorId, setResolvedDoctorId] = useState<string | null>(profile?.doctorId ?? null)
  const [resolving, setResolving] = useState(!profile?.doctorId)

  // Cancellation form state
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [reason, setReason] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [nextTime, setNextTime] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function load(targetId?: string) {
    const docId = targetId || resolvedDoctorId || profile?.doctorId
    if (!docId) {
      setItems([])
      return
    }
    try {
      const res = await listPendingConsultationsForDoctor(docId)
      setItems(res)
    } catch (err) {
      console.warn('[DoctorRequestsPage] Error loading requests:', err)
      setItems([]) // Ensures items is not null so UI renders smoothly!
    }
  }

  useEffect(() => {
    let isCurrent = true

    // Safety timeout: if resolving takes more than 2 seconds, stop resolving and unblock the UI!
    const safetyTimeout = setTimeout(() => {
      if (isCurrent && resolving) {
        setResolving(false)
        setItems((prev) => prev ?? [])
      }
    }, 2000)

    async function syncDoctorProfile() {
      const currentDocId = profile?.doctorId || resolvedDoctorId
      if (currentDocId) {
        if (isCurrent) {
          setResolvedDoctorId(currentDocId)
          setResolving(false)
          load(currentDocId)
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
                  load(data.doctorId)
                  return
                }
              }
            } catch (err) {
              console.warn('[DoctorRequestsPage] syncDoctorProfile fetch error:', err)
            }
          }

          // 2. Client-side fallback lookup
          const doc = await getDoctorForUser(profile.uid, profile.email)
          if (doc && isCurrent) {
            setResolvedDoctorId(doc.id)
            setResolving(false)
            load(doc.id)
            return
          }
        } catch (e) {
          console.warn('[DoctorRequestsPage] Auto-resolve failed:', e)
        } finally {
          if (isCurrent) {
            setResolving(false)
            setItems((prev) => prev ?? [])
          }
        }
      } else {
        if (isCurrent) {
          setResolving(false)
          setItems((prev) => prev ?? [])
        }
      }
    }

    syncDoctorProfile()

    return () => {
      isCurrent = false
      clearTimeout(safetyTimeout)
    }
  }, [profile?.doctorId, profile?.uid])

  async function accept(a: Appointment) {
    if (!profile) return
    try {
      await acceptConsultation(a.id, profile.uid, profile.displayName)
      show('Confirmed.', 'success')
      await load()
    } catch (err) {
      show(
        err instanceof AppointmentError ? err.message : 'Could not accept.',
        'error'
      )
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
    const finalReason = reason.trim() || 'Doctor is unavailable for this consultation request'
    const isUpdate = cancelTarget.status === 'DOCTOR_CANCELLATION_REQUESTED'
    setSubmitting(true)
    try {
      await requestDoctorCancellation({
        appointmentId: cancelTarget.id,
        reason: finalReason,
        nextAvailableDate: nextDate || todayStr(),
        nextAvailableTime: nextTime || '10:00',
        actorId: profile.uid,
        actorName: profile.displayName
      })

      show(
        isUpdate
          ? 'Unavailability notes and next slot updated successfully.'
          : 'Cancellation request submitted. Reception has been notified.',
        'success'
      )
      closeCancellation()
      await load()
    } catch (err: unknown) {
      console.error('[DoctorRequestsPage] Cancellation error:', err)
      const msg = extractErrorMessage(err)
      show(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (resolving && items === null) {
    return <LoadingSpinner label="Connecting your doctor profile…" />
  }

  const effectiveDoctorId = resolvedDoctorId || profile?.doctorId

  if (!effectiveDoctorId) {
    return (
      <EmptyState
        title="No doctor profile linked"
        body="Ask your clinic admin to link your account to a doctor record in 'All Doctors' under Admin > Doctors."
      />
    )
  }

  if (items === null) {
    return <LoadingSpinner />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="font-display text-2xl">Consultation requests</h1>

      {items.length === 0 && (
        <EmptyState title="No pending requests" body="New bookings will show up here." />
      )}

      {items.map((a) => (
        <Card key={a.id} className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">{a.patientName}</p>
            <p className="text-sm text-slate-500">
              {a.date} · {formatTime12h(a.startTime)} – {formatTime12h(a.endTime)} · {a.specializationName}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => accept(a)}>Accept</Button>
            <Button onClick={() => openCancellation(a)} variant="secondary">
              Can't attend
            </Button>
          </div>
        </Card>
      ))}

      <Modal
        open={!!cancelTarget}
        onClose={closeCancellation}
        title={
          cancelTarget?.status === 'DOCTOR_CANCELLATION_REQUESTED'
            ? `Update unavailability — ${cancelTarget?.patientName ?? ''}`
            : `Doctor unavailable — ${cancelTarget?.patientName ?? ''}`
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeCancellation} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={submitCancellation}
              disabled={submitting}
            >
              {submitting
                ? 'Saving…'
                : cancelTarget?.status === 'DOCTOR_CANCELLATION_REQUESTED'
                  ? 'Update request'
                  : 'Submit request'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-600 mb-1.5 font-medium">
              Reason for unavailability *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Emergency surgery scheduled, medical leave, unexpected conflict"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-clinic-500 focus:ring-1 focus:ring-clinic-500"
              disabled={submitting}
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

          <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">
                Next available date
              </label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-clinic-500 focus:ring-1 focus:ring-clinic-500 bg-white"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">
                Next available time
              </label>
              <input
                type="time"
                value={nextTime}
                onChange={(e) => setNextTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-clinic-500 focus:ring-1 focus:ring-clinic-500 bg-white"
                disabled={submitting}
              />
            </div>
            <p className="col-span-2 text-xs text-slate-500">
              Reception will be notified to reschedule this patient to your next available slot.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}