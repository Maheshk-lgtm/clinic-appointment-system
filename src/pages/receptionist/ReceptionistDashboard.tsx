import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listAppointmentsByDate,
  expireIfStale,
  subscribeToAppointmentsAwaitingReceptionistAction
} from '@/services/appointmentService'
import type { Appointment } from '@/types'
import { Card, EmptyState, LoadingSpinner, Button } from '@/components/Primitives'
import { StatusBadge } from '@/components/StatusBadge'
import { DateNavigator } from '@/components/DateNavigator'
import {
  getLocalISODate,
  getDateOffset,
  formatFriendlyDate,
  getDateRelativeLabel,
  formatTime12h
} from '@/utils/dateUtils'

export function ReceptionistDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalISODate())
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const [loadingDate, setLoadingDate] = useState<boolean>(false)
  const [countsByDate, setCountsByDate] = useState<Record<string, number>>({})
  const [allRescheduleRequests, setAllRescheduleRequests] = useState<Appointment[]>([])

  async function load(targetDate: string = selectedDate) {
    setLoadingDate(true)
    try {
      const list = await listAppointmentsByDate(targetDate)
      // Opportunistic client-side sweep for pending bookings past their window;
      // the scheduled Cloud Function is the authoritative one.
      await Promise.all(
        list
          .filter((a) => a.status === 'PENDING_DOCTOR_CONFIRMATION')
          .map((a) => expireIfStale(a.id))
      )
      const refreshed = await listAppointmentsByDate(targetDate)
      setAppointments(refreshed)
    } catch (err) {
      console.error('[ReceptionistDashboard] Error loading appointments:', err)
      setAppointments([])
    } finally {
      setLoadingDate(false)
    }
  }

  async function refreshCounts() {
    const today = getLocalISODate()
    const yesterday = getDateOffset(-1)
    const tomorrow = getDateOffset(1)
    try {
      const [yList, tList, tmList] = await Promise.all([
        listAppointmentsByDate(yesterday),
        listAppointmentsByDate(today),
        listAppointmentsByDate(tomorrow)
      ])
      setCountsByDate({
        [yesterday]: yList.length,
        [today]: tList.length,
        [tomorrow]: tmList.length
      })
    } catch (err) {
      console.warn('[ReceptionistDashboard] Error fetching quick date counts:', err)
    }
  }

  useEffect(() => {
    load(selectedDate)
  }, [selectedDate])

  useEffect(() => {
    refreshCounts()
    const unsub = subscribeToAppointmentsAwaitingReceptionistAction(setAllRescheduleRequests)
    return () => unsub()
  }, [])

  if (appointments === null && loadingDate) {
    return <LoadingSpinner label="Loading reception console…" />
  }

  const currentAppointments = appointments ?? []
  const pending = currentAppointments.filter((a) => a.status === 'PENDING_DOCTOR_CONFIRMATION')
  const confirmed = currentAppointments.filter((a) => a.status === 'CONFIRMED')
  const needsAction = currentAppointments.filter((a) => a.status === 'DOCTOR_CANCELLATION_REQUESTED')
  const cancelled = currentAppointments.filter((a) => ['CANCELLED', 'EXPIRED'].includes(a.status))

  const relative = getDateRelativeLabel(selectedDate)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Reception Console</h1>
          <p className="text-sm text-slate-500">
            Daily appointment tracking, patient check-ins, and schedule control
          </p>
        </div>
        <Link to="/receptionist/book">
          <Button className="shadow-sm flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New booking
          </Button>
        </Link>
      </div>

      {/* Clinic-wide Doctor Reschedule Adjustment Alert: triggers when any doctor submits a cancellation request */}
      {allRescheduleRequests.length > 0 && (
        <Card className="p-4 border-orange-300 bg-gradient-to-r from-orange-50 via-amber-50 to-white shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 shadow-2xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-orange-950">
                    Doctor Reschedule Adjustments Required
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-200 text-orange-900 border border-orange-300">
                    {allRescheduleRequests.length} waiting
                  </span>
                </div>
                <p className="text-xs text-orange-800 mt-0.5">
                  Doctors have flagged consultations as unavailable. Confirm and adjust patient schedules.
                </p>
              </div>
            </div>
            <Link
              to="/receptionist/reschedules"
              className="text-xs font-bold px-3.5 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition shadow-2xs shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Review & Adjust ({allRescheduleRequests.length})</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </Card>
      )}

      {/* Date Navigator Add-on: Yesterday, Today, Tomorrow & Custom Date Picker */}
      <DateNavigator
        selectedDate={selectedDate}
        onChange={setSelectedDate}
        countsByDate={countsByDate}
        labelPrefix="Reception Schedule"
      />

      {/* Stat Cards for Selected Date — 2x2 on Mobile, 4x1 on Desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Pending doctor" value={pending.length} />
        <StatCard label="Confirmed" value={confirmed.length} />
        <StatCard
          label="Needs rescheduling"
          value={needsAction.length}
          highlight={needsAction.length > 0}
        />
        <StatCard label="Cancelled / expired" value={cancelled.length} />
      </div>

      {needsAction.length > 0 && (
        <Card className="p-3.5 sm:p-4 border-orange-200 bg-orange-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-orange-900 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-orange-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{needsAction.length} appointment{needsAction.length > 1 ? 's require' : ' requires'} rescheduling on this date</span>
              </p>
              <p className="text-[11px] sm:text-xs text-orange-700 mt-0.5">
                Doctors have requested alternative times for these patients.
              </p>
            </div>
            <Link
              to="/receptionist/reschedules"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition self-start sm:self-auto"
            >
              Review reschedules →
            </Link>
          </div>
        </Card>
      )}

      {/* Appointments List for Selected Date */}
      <Card className="p-3.5 sm:p-5 border border-blue-100/90 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <svg className="w-4 h-4 text-clinic-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-semibold text-ink text-xs sm:text-sm truncate">
              Appointments for {formatFriendlyDate(selectedDate)}
            </p>
            <span
              className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full border ${relative.badgeClass}`}
            >
              {relative.label}
            </span>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-500 font-medium shrink-0">
            {currentAppointments.length} appointment{currentAppointments.length === 1 ? '' : 's'}
          </span>
        </div>

        {loadingDate && appointments !== null && (
          <div className="py-2 text-xs text-slate-400 text-center animate-pulse">
            Updating appointments…
          </div>
        )}

        {currentAppointments.length === 0 ? (
          <EmptyState
            title={`Nothing booked for ${relative.label.toLowerCase()}`}
            body={`There are no appointments scheduled on ${formatFriendlyDate(selectedDate)}.`}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {currentAppointments.map((a) => (
              <div
                key={a.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 hover:bg-slate-50/60 rounded-lg px-1.5 sm:px-2 transition"
              >
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-ink truncate">
                    <span className="text-clinic-700 font-bold">{formatTime12h(a.startTime)}</span> · {a.patientName}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                    Dr. {a.doctorName} · {a.specializationName} · Tel: {a.patientMobile}
                  </p>
                  {a.status === 'DOCTOR_CANCELLATION_REQUESTED' && (
                    <p className="text-[11px] sm:text-xs text-orange-600 font-medium truncate mt-0.5">
                      Doctor note: {a.cancellationReason || 'Reschedule requested'}
                      {a.nextAvailableDate ? ` (Next available: ${a.nextAvailableDate} ${formatTime12h(a.nextAvailableTime || '')})` : ''}
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t border-slate-50 sm:border-0">
                  <span className="text-[11px] text-slate-400 sm:hidden">Status:</span>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <Card
      className={`p-3 sm:p-4 border transition ${
        highlight
          ? 'border-orange-300 bg-orange-50/30'
          : 'border-blue-100/90 hover:border-clinic-300'
      }`}
    >
      <p className="text-xl sm:text-2xl font-display font-bold text-ink">{value}</p>
      <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">{label}</p>
    </Card>
  )
}
