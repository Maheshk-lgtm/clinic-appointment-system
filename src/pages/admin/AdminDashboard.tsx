import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAppointmentsByDate } from '@/services/appointmentService'
import { listDoctors } from '@/services/doctorService'
import type { Appointment, Doctor } from '@/types'
import { Card, EmptyState, LoadingSpinner } from '@/components/Primitives'
import { StatusBadge } from '@/components/StatusBadge'
import { DateNavigator } from '@/components/DateNavigator'
import {
  getLocalISODate,
  getDateOffset,
  formatFriendlyDate,
  getDateRelativeLabel
} from '@/utils/dateUtils'

export function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>(getLocalISODate())
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const [doctors, setDoctors] = useState<Doctor[] | null>(null)
  const [loadingDate, setLoadingDate] = useState<boolean>(false)
  const [countsByDate, setCountsByDate] = useState<Record<string, number>>({})

  // Fetch appointments whenever selectedDate changes
  useEffect(() => {
    let isCurrent = true
    setLoadingDate(true)
    listAppointmentsByDate(selectedDate)
      .then((data) => {
        if (isCurrent) {
          setAppointments(data)
          setLoadingDate(false)
        }
      })
      .catch((err) => {
        console.error('[AdminDashboard] Error fetching appointments:', err)
        if (isCurrent) {
          setAppointments([])
          setLoadingDate(false)
        }
      })
    return () => {
      isCurrent = false
    }
  }, [selectedDate])

  // Fetch doctors and quick counts for yesterday, today, and tomorrow
  useEffect(() => {
    listDoctors(false).then(setDoctors)

    const today = getLocalISODate()
    const yesterday = getDateOffset(-1)
    const tomorrow = getDateOffset(1)

    Promise.all([
      listAppointmentsByDate(yesterday),
      listAppointmentsByDate(today),
      listAppointmentsByDate(tomorrow)
    ])
      .then(([yList, tList, tmList]) => {
        setCountsByDate({
          [yesterday]: yList.length,
          [today]: tList.length,
          [tomorrow]: tmList.length
        })
      })
      .catch((e) => console.warn('[AdminDashboard] Quick count fetch error:', e))
  }, [])

  if ((!appointments && loadingDate) || !doctors) {
    return <LoadingSpinner label="Loading admin dashboard…" />
  }

  const currentAppointments = appointments ?? []
  const pending = currentAppointments.filter((a) => a.status === 'PENDING_DOCTOR_CONFIRMATION').length
  const confirmed = currentAppointments.filter((a) => a.status === 'CONFIRMED').length
  const cancelled = currentAppointments.filter((a) => ['CANCELLED', 'EXPIRED'].includes(a.status)).length
  const activeDoctors = doctors.filter((d) => d.active).length
  const bySpecialization = groupBy(currentAppointments, (a) => a.specializationName)
  const relative = getDateRelativeLabel(selectedDate)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Clinic Overview</h1>
          <p className="text-sm text-slate-500">
            System performance, appointment distribution, and doctor engagement
          </p>
        </div>
        <Link
          to="/admin/appointments"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-clinic-300 text-clinic-700 bg-white hover:bg-clinic-50 transition shadow-2xs self-start sm:self-auto flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search all appointments
        </Link>
      </div>

      {/* Date Navigator Add-on: Yesterday, Today, Tomorrow & Custom Date Picker */}
      <DateNavigator
        selectedDate={selectedDate}
        onChange={setSelectedDate}
        countsByDate={countsByDate}
        labelPrefix="Clinic Overview"
      />

      {/* Dynamic Stat Cards for Selected Date — 2 cols on mobile, 3 on tablet, 5 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <Stat
          label={`Appointments (${relative.label})`}
          value={currentAppointments.length}
          icon={
            <svg className="w-4 h-4 text-clinic-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <Stat
          label="Pending confirmations"
          value={pending}
          icon={
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <Stat
          label="Confirmed"
          value={confirmed}
          icon={
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
        <Stat
          label="Cancelled / expired"
          value={cancelled}
          icon={
            <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
        />
        <Stat
          label="Active doctors"
          value={`${activeDoctors} / ${doctors.length}`}
          icon={
            <svg className="w-4 h-4 text-clinic-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Appointments by Specialization Card */}
        <Card className="p-3.5 sm:p-5 border border-blue-100/90 shadow-xs lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <svg className="w-4 h-4 text-clinic-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.5 2 6 4.5 6 8c0 3 1.5 6 2 9 .4 2.2 1.5 4 4 4s3.6-1.8 4-4c.5-3 2-6 2-9 0-3.5-2.5-6-6-6z" />
              <path d="M10 9c.5.5 1.5.5 2 0s1.5-.5 2 0" />
            </svg>
            <div>
              <p className="font-semibold text-ink text-xs sm:text-sm">By Specialization</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400">{formatFriendlyDate(selectedDate)}</p>
            </div>
          </div>
          {Object.keys(bySpecialization).length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">
              No appointments scheduled for this date.
            </p>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {Object.entries(bySpecialization).map(([name, list]) => (
                <div
                  key={name}
                  className="flex items-center justify-between text-sm py-1.5 px-2.5 sm:px-3 rounded-lg bg-blue-50/50 border border-blue-100/60"
                >
                  <span className="text-slate-700 font-medium text-xs truncate mr-2">{name}</span>
                  <span className="font-bold text-xs text-clinic-700 px-2 py-0.5 rounded-md bg-white border border-blue-200 shrink-0">
                    {list.length}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Schedule List for Selected Date */}
        <Card className="p-3.5 sm:p-5 border border-blue-100/90 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <svg className="w-4 h-4 text-clinic-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="font-semibold text-ink text-xs sm:text-sm truncate">
                Schedule for {formatFriendlyDate(selectedDate)}
              </p>
              <span
                className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full border ${relative.badgeClass}`}
              >
                {relative.label}
              </span>
            </div>
            <Link to="/admin/appointments" className="text-xs text-clinic-700 hover:underline font-medium shrink-0">
              View all →
            </Link>
          </div>

          {loadingDate && (
            <div className="py-2 text-xs text-slate-400 text-center animate-pulse">
              Updating schedule…
            </div>
          )}

          {currentAppointments.length === 0 ? (
            <EmptyState
              title={`Nothing booked for ${relative.label.toLowerCase()}`}
              body={`No clinic appointments are scheduled on ${formatFriendlyDate(selectedDate)}.`}
            />
          ) : (
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
              {currentAppointments.map((a) => (
                <div
                  key={a.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 hover:bg-slate-50/60 rounded-lg px-1.5 sm:px-2 transition"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-ink truncate">
                      <span className="text-clinic-700 font-bold">{a.startTime}</span> · {a.patientName}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                      Dr. {a.doctorName} · {a.specializationName}
                    </p>
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
    </div>
  )
}

function Stat({
  label,
  value,
  icon
}: {
  label: string
  value: number | string
  icon?: React.ReactNode
}) {
  return (
    <Card className="p-3 sm:p-4 border border-blue-100/90 hover:border-clinic-300 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <p className="text-xl sm:text-2xl font-display font-bold text-ink">{value}</p>
        {icon && (
          <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-blue-50 text-clinic-700 border border-blue-100 flex items-center justify-center text-xs sm:text-sm shadow-2xs">
            {icon}
          </span>
        )}
      </div>
      <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 truncate">{label}</p>
    </Card>
  )
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const key = keyFn(item)
    ;(acc[key] ||= []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}
