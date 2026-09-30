import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { listSpecializations } from '@/services/userService'
import { listDoctorsBySpecialization, getSlotsForDoctorOnDate, isDoctorAvailableOnDate } from '@/services/doctorService'
import { createTemporaryBooking, AppointmentError } from '@/services/appointmentService'
import type { Doctor, Slot, Specialization } from '@/types'
import { Button, Card, EmptyState, LoadingSpinner, Modal } from '@/components/Primitives'
import { formatTime12h } from '@/utils/dateUtils'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const SLOT_STYLES: Record<Slot['state'], string> = {
  AVAILABLE: 'bg-white border-clinic-300 text-clinic-800 hover:bg-clinic-50 cursor-pointer',
  TEMPORARILY_BOOKED: 'bg-amber-50 border-amber-200 text-amber-700 cursor-not-allowed',
  CONFIRMED: 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed',
  BLOCKED: 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
}

export function BookingPage() {
  const { profile } = useAuth()
  const { show } = useToast()

  const [specializations, setSpecializations] = useState<Specialization[]>([])
  const [specializationId, setSpecializationId] = useState('')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [date, setDate] = useState(todayStr())
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [patientName, setPatientName] = useState('')
  const [patientMobile, setPatientMobile] = useState('')
  const [patientAge, setPatientAge] = useState('')
  const [patientGender, setPatientGender] = useState<'male' | 'female' | 'other' | ''>('')
  const [isNewPatient, setIsNewPatient] = useState(true)
  const [patientUhid, setPatientUhid] = useState('')

  useEffect(() => {
    listSpecializations().then(setSpecializations)
  }, [])

  useEffect(() => {
    setDoctor(null)
    setDoctors([])
    if (!specializationId) return
    listDoctorsBySpecialization(specializationId).then(setDoctors)
  }, [specializationId])

  useEffect(() => {
    if (!doctor) {
      setSlots([])
      return
    }
    setLoadingSlots(true)
    getSlotsForDoctorOnDate(doctor, date)
      .then(setSlots)
      .finally(() => setLoadingSlots(false))
  }, [doctor, date])

  const dateAvailable = doctor ? isDoctorAvailableOnDate(doctor, date) : true

  function resetPatientForm() {
    setPatientName('')
    setPatientMobile('')
    setPatientAge('')
    setPatientGender('')
    setIsNewPatient(true)
    setPatientUhid('')
  }

  async function submitBooking() {
    if (!doctor || !selectedSlot || !profile) return
    if (!patientName.trim() || !patientMobile.trim()) {
      show('Patient name and mobile number are required.', 'error')
      return
    }
    setSubmitting(true)
    try {
      await createTemporaryBooking({
        patientName: patientName.trim(),
        patientMobile: patientMobile.trim(),
        patientAge: patientAge ? Number(patientAge) : undefined,
        patientGender: patientGender || undefined,
        isNewPatient,
        patientUhid: patientUhid || undefined,
        doctorId: doctor.id,
        doctorName: doctor.name,
        doctorUserId: doctor.userId,
        specializationId: doctor.specializationId,
        specializationName: doctor.specializationName,
        date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        createdBy: profile.uid,
        createdByName: profile.displayName
      })
      show('Temporary booking created. Waiting on the doctor to confirm.', 'success')
      setSelectedSlot(null)
      resetPatientForm()
      const refreshed = await getSlotsForDoctorOnDate(doctor, date)
      setSlots(refreshed)
    } catch (err) {
      if (err instanceof AppointmentError) {
        show(err.message, 'error')
        const refreshed = await getSlotsForDoctorOnDate(doctor, date)
        setSlots(refreshed)
      } else {
        show('Something went wrong creating the booking.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const minDate = todayStr()

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-display text-2xl mb-1">New booking</h1>
      <p className="text-sm text-slate-500 mb-6">Find an available doctor and hold a slot for the patient.</p>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* Left: specialization / doctor / date */}
        <div className="space-y-4">
          <Card className="p-4">
            <label className="block text-sm font-medium text-ink mb-1.5">Specialization</label>
            <select
              value={specializationId}
              onChange={(e) => setSpecializationId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select specialization…</option>
              {specializations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Card>

          {specializationId && (
            <Card className="p-4">
              <label className="block text-sm font-medium text-ink mb-2">Doctor</label>
              {doctors.length === 0 && <p className="text-sm text-slate-500">No doctors in this specialization.</p>}
              <div className="space-y-2">
                {doctors.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDoctor(d)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition ${
                      doctor?.id === d.id ? 'border-clinic-500 bg-clinic-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium text-ink">{d.name}</p>
                    <p className="text-xs text-slate-500">{d.qualification}</p>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {doctor && (
            <Card className="p-4">
              <label className="block text-sm font-medium text-ink mb-1.5">Date</label>
              <input
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {!dateAvailable && <p className="text-xs text-amber-600 mt-2">Dr. {doctor.name} is not available this date.</p>}
            </Card>
          )}
        </div>

        {/* Right: slot grid */}
        <Card className="p-4 min-h-[300px]">
          {!doctor && <EmptyState title="Choose a specialization and doctor" body="Available slots will appear here." />}
          {doctor && loadingSlots && <LoadingSpinner label="Loading availability…" />}
          {doctor && !loadingSlots && dateAvailable && slots.length === 0 && (
            <EmptyState title="No slots configured" body="This doctor has no working hours set for this day." />
          )}
          {doctor && !loadingSlots && dateAvailable && slots.length > 0 && (
            <>
              <p className="text-sm text-slate-500 mb-3">
                {doctor.name} · {date}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.startTime}
                    disabled={s.state !== 'AVAILABLE'}
                    onClick={() => setSelectedSlot(s)}
                    className={`rounded-lg border px-2 py-2.5 text-xs sm:text-sm font-medium transition ${SLOT_STYLES[s.state]}`}
                  >
                    {formatTime12h(s.startTime)}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-slate-500">
                <Legend color="bg-white border-clinic-300" label="Available" />
                <Legend color="bg-amber-50 border-amber-200" label="Pending" />
                <Legend color="bg-slate-100 border-slate-200" label="Confirmed" />
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        title="Confirm patient details"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedSlot(null)}>
              Cancel
            </Button>
            <Button onClick={submitBooking} disabled={submitting}>
              {submitting ? 'Booking…' : 'Create temporary booking'}
            </Button>
          </>
        }
      >
        {selectedSlot && doctor && (
          <div className="space-y-3">
            <div className="text-sm bg-slate-50 rounded-lg p-3 space-y-0.5">
              <p><span className="text-slate-500">Doctor:</span> {doctor.name}</p>
              <p><span className="text-slate-500">Date:</span> {date}</p>
              <p><span className="text-slate-500">Time:</span> {formatTime12h(selectedSlot.startTime)} – {formatTime12h(selectedSlot.endTime)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Patient name" value={patientName} onChange={setPatientName} required className="col-span-2" />
              <Field label="Mobile number" value={patientMobile} onChange={setPatientMobile} required />
              <Field label="Age" value={patientAge} onChange={setPatientAge} type="number" />
              <div>
                <label className="block text-xs text-slate-500 mb-1">Gender</label>
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value as 'male' | 'female' | 'other' | '')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Field label="UHID (optional)" value={patientUhid} onChange={setPatientUhid} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={isNewPatient} onChange={(e) => setIsNewPatient(e.target.checked)} />
              New patient
            </label>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full border ${color}`} />
      {label}
    </span>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  className = ''
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-slate-500 mb-1">
        {label} {required && <span className="text-clay">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  )
}
