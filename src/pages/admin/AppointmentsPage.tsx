import { useEffect, useMemo, useState } from 'react'
import { listAllAppointments } from '@/services/appointmentService'
import { listDoctors } from '@/services/doctorService'
import type { Appointment, AppointmentStatus, Doctor } from '@/types'
import { Card, EmptyState, LoadingSpinner } from '@/components/Primitives'
import { StatusBadge } from '@/components/StatusBadge'
import { getLocalISODate, getDateOffset, formatTime12h } from '@/utils/dateUtils'

const STATUSES: AppointmentStatus[] = [
  'PENDING_DOCTOR_CONFIRMATION',
  'CONFIRMED',
  'DOCTOR_CANCELLATION_REQUESTED',
  'RESCHEDULED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
  'EXPIRED'
]

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('')
  const [doctorFilter, setDoctorFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    listAllAppointments().then(setAppointments)
    listDoctors(false).then(setDoctors)
  }, [])

  const filtered = useMemo(() => {
    if (!appointments) return []
    return appointments.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false
      if (doctorFilter && a.doctorId !== doctorFilter) return false
      if (dateFilter && a.date !== dateFilter) return false
      if (search && !`${a.patientName} ${a.patientMobile}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [appointments, statusFilter, doctorFilter, dateFilter, search])

  function exportCsv() {
    const header = ['Date', 'Time', 'Patient', 'Mobile', 'Doctor', 'Specialization', 'Status']
    const rows = filtered.map((a) => [a.date, a.startTime, a.patientName, a.patientMobile, a.doctorName, a.specializationName, a.status])
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'appointments.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!appointments) return <LoadingSpinner />

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Appointments</h1>
        <button onClick={exportCsv} className="text-sm text-clinic-700 underline">
          Export CSV
        </button>
      </div>

      <Card className="p-4 grid sm:grid-cols-4 gap-3 border border-blue-100/90 shadow-xs">
        <input
          placeholder="Search patient / mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2 focus:outline-none focus:border-clinic-500 focus:ring-1 focus:ring-clinic-300"
        />
        <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-clinic-500 focus:ring-1 focus:ring-clinic-300">
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-clinic-500 focus:ring-1 focus:ring-clinic-300">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <div className="sm:col-span-4 flex flex-col sm:flex-row flex-wrap sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-0.5">Quick date:</span>
            {[
              { label: 'All Dates', value: '' },
              { label: 'Yesterday', value: getDateOffset(-1) },
              { label: 'Today', value: getLocalISODate() },
              { label: 'Tomorrow', value: getDateOffset(1) }
            ].map((chip) => {
              const isSelected = dateFilter === chip.value
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setDateFilter(chip.value)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                    isSelected
                      ? 'bg-clinic-600 text-white border-clinic-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-0 border-slate-50">
            <span className="text-xs text-slate-400">Custom date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:border-clinic-500 focus:ring-1 focus:ring-clinic-300"
            />
          </div>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No matching appointments" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <div
                key={a.id}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 hover:bg-slate-50/50 transition"
              >
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-ink truncate">
                    <span className="text-clinic-700 font-bold">{a.date}</span> · {formatTime12h(a.startTime)} · {a.patientName}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
                    Dr. {a.doctorName} · {a.specializationName} · Tel: {a.patientMobile}
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
  )
}
