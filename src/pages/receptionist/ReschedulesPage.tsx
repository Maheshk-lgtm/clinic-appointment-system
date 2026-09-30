import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { listAppointmentsAwaitingReceptionistAction, cancelAppointment, rescheduleAppointment, AppointmentError } from '@/services/appointmentService'
import { getDoctor, getSlotsForDoctorOnDate } from '@/services/doctorService'
import type { Appointment, Doctor, Slot } from '@/types'
import { Button, Card, EmptyState, LoadingSpinner, Modal } from '@/components/Primitives'
import { formatTime12h } from '@/utils/dateUtils'

export function ReschedulesPage() {
  const { profile } = useAuth()
  const { show } = useToast()
  const [items, setItems] = useState<Appointment[] | null>(null)
  const [active, setActive] = useState<Appointment | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setItems(await listAppointmentsAwaitingReceptionistAction())
  }

  useEffect(() => {
    load()
  }, [])

  async function openReschedule(appt: Appointment) {
    setActive(appt)
    const d = await getDoctor(appt.doctorId)
    setDoctor(d)
    const initialDate = appt.nextAvailableDate || appt.date
    setDate(initialDate)
    if (d) {
      setLoadingSlots(true)
      setSlots(await getSlotsForDoctorOnDate(d, initialDate))
      setLoadingSlots(false)
    }
  }

  useEffect(() => {
    if (!doctor || !date) return
    setLoadingSlots(true)
    getSlotsForDoctorOnDate(doctor, date).then(setSlots).finally(() => setLoadingSlots(false))
  }, [doctor, date])

  async function confirmReschedule(slot: Slot) {
    if (!active || !doctor || !profile) return
    setSubmitting(true)
    try {
      await rescheduleAppointment({
        oldAppointmentId: active.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorUserId: doctor.userId,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        actorId: profile.uid,
        actorName: profile.displayName
      })
      show('Rescheduled — waiting on the doctor to confirm the new slot.', 'success')
      setActive(null)
      load()
    } catch (err) {
      show(err instanceof AppointmentError ? err.message : 'Could not reschedule.', 'error')
      if (doctor) setSlots(await getSlotsForDoctorOnDate(doctor, date))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(appt: Appointment) {
    if (!profile) return
    if (!confirm(`Cancel the appointment for ${appt.patientName}? This can't be undone.`)) return
    await cancelAppointment(appt.id, profile.uid, profile.displayName, profile.role, appt.cancellationReason)
    show('Appointment cancelled.', 'success')
    load()
  }

  if (!items) return <LoadingSpinner label="Loading…" />

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="font-display text-2xl">Needs rescheduling</h1>
      <p className="text-sm text-slate-500 -mt-2">Doctor-requested changes waiting on you.</p>

      {items.length === 0 && <EmptyState title="Nothing to review" body="You're all caught up." />}

      {items.map((a) => (
        <Card key={a.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-ink">{a.patientName}</p>
              <p className="text-sm text-slate-500">
                Dr. {a.doctorName} · originally {a.date} {formatTime12h(a.startTime)}
              </p>
              <p className="text-sm text-orange-700 mt-1.5">"{a.cancellationReason}"</p>
              {a.nextAvailableDate && (
                <p className="text-sm text-slate-500 mt-1">
                  Doctor suggested: {a.nextAvailableDate} {formatTime12h(a.nextAvailableTime || '')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button onClick={() => openReschedule(a)}>Pick a slot</Button>
              <Button variant="danger" onClick={() => handleCancel(a)}>
                Cancel instead
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <Modal open={!!active} onClose={() => setActive(null)} title="Choose a new slot">
        {active && (
          <div className="space-y-3">
            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {loadingSlots && <LoadingSpinner />}
            {!loadingSlots && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.startTime}
                    disabled={s.state !== 'AVAILABLE' || submitting}
                    onClick={() => confirmReschedule(s)}
                    className={`rounded-lg border px-2 py-2 text-xs sm:text-sm font-medium ${
                      s.state === 'AVAILABLE'
                        ? 'border-clinic-300 text-clinic-800 hover:bg-clinic-50'
                        : 'border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {formatTime12h(s.startTime)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
