import { useEffect, useMemo, useState } from 'react'
import type { Appointment } from '@/types'
import { Card } from '@/components/Primitives'
import { StatusBadge } from '@/components/StatusBadge'
import { listAppointmentsForDoctorMonth } from '@/services/appointmentService'
import {
  getLocalISODate,
  formatFriendlyDate,
  formatFullDate,
  formatTime12h,
  getMonthYearLabel
} from '@/utils/dateUtils'

export interface DoctorMonthCalendarProps {
  doctorId: string
  selectedDate: string
  onSelectDate: (dateStr: string) => void
  onAcceptAppointment?: (a: Appointment) => void
  onCancelAppointment?: (a: Appointment) => void
  refreshKey?: number
  className?: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DoctorMonthCalendar({
  doctorId,
  selectedDate,
  onSelectDate,
  onAcceptAppointment,
  onCancelAppointment,
  refreshKey = 0,
  className = ''
}: DoctorMonthCalendarProps) {
  // Parse year and month from selectedDate or today
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()
  const [year, setYear] = useState<number>(initialDate.getFullYear())
  const [month, setMonth] = useState<number>(initialDate.getMonth()) // 0 - 11
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const todayStr = getLocalISODate()
  const yearMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  // Fetch month's appointments whenever doctorId or (year, month) changes
  useEffect(() => {
    if (!doctorId) return
    let active = true
    setLoading(true)

    listAppointmentsForDoctorMonth(doctorId, yearMonthStr)
      .then((data) => {
        if (active) {
          setMonthAppointments(data)
        }
      })
      .catch((err) => {
        console.warn('[DoctorMonthCalendar] Error loading monthly appointments:', err)
        if (active) setMonthAppointments([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [doctorId, yearMonthStr, refreshKey])

  // If selectedDate changes to a different month, sync calendar view to that month
  useEffect(() => {
    if (!selectedDate) return
    const [y, m] = selectedDate.split('-').map(Number)
    if (!isNaN(y) && !isNaN(m)) {
      if (y !== year || m - 1 !== month) {
        setYear(y)
        setMonth(m - 1)
      }
    }
  }, [selectedDate])

  // Navigation handlers
  function handlePrevMonth() {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function handleNextMonth() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  function handleThisMonth() {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    onSelectDate(todayStr)
  }

  // Group month appointments by date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    for (const a of monthAppointments) {
      if (!a.date) continue
      if (!map[a.date]) map[a.date] = []
      map[a.date].push(a)
    }
    // Sort each day's slots by startTime
    for (const d in map) {
      map[d].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
    }
    return map
  }, [monthAppointments])

  // Calculate grid days
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay() // 0 = Sun, 1 = Mon ...
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate() // 28, 29, 30, 31

    const days: Array<{
      dayNum: number | null
      dateStr: string | null
      isCurrentMonth: boolean
    }> = []

    // Leading empty padding
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ dayNum: null, dateStr: null, isCurrentMonth: false })
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ dayNum: d, dateStr, isCurrentMonth: true })
    }

    // Trailing padding to fill full rows of 7
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 0; i < remaining; i++) {
      days.push({ dayNum: null, dateStr: null, isCurrentMonth: false })
    }

    return days
  }, [year, month])

  // Monthly stats
  const totalMonthBookings = monthAppointments.length
  const confirmedCount = monthAppointments.filter((a) => a.status === 'CONFIRMED').length
  const pendingCount = monthAppointments.filter((a) => a.status === 'PENDING_DOCTOR_CONFIRMATION').length

  // Appointments for the currently selected date
  const selectedDateAppointments = appointmentsByDate[selectedDate] || []

  return (
    <Card className={`p-3.5 sm:p-5 border-blue-100/90 shadow-sm bg-white space-y-4 ${className}`}>
      {/* Month Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-clinic-50 border border-clinic-100 text-clinic-700 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-5 h-5 text-clinic-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-ink leading-tight">
                {getMonthYearLabel(year, month)}
              </h2>
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-clinic-50 text-clinic-700 border border-clinic-200">
                {totalMonthBookings} {totalMonthBookings === 1 ? 'Booking' : 'Bookings'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Monthly slot overview & patient bookings
            </p>
          </div>
        </div>

        {/* Navigation & View Toggle Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1 shadow-2xs"
            title="Previous month"
          >
            <span>‹</span> Prev
          </button>
          <button
            type="button"
            onClick={handleThisMonth}
            className="h-8 px-2.5 rounded-lg border border-clinic-200 bg-clinic-50 hover:bg-clinic-100 text-clinic-800 text-xs font-semibold transition shadow-2xs"
          >
            Current Month
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1 shadow-2xs"
            title="Next month"
          >
            Next <span>›</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs font-medium transition ml-1"
            title={isExpanded ? 'Collapse calendar grid' : 'Expand calendar grid'}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Month Metrics Summary Bar */}
      <div className="grid grid-cols-3 gap-2 py-1">
        <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/70 text-center">
          <p className="text-xs sm:text-sm font-bold text-ink">{totalMonthBookings}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Total Consultations</p>
        </div>
        <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-100 text-center">
          <p className="text-xs sm:text-sm font-bold text-emerald-800">{confirmedCount}</p>
          <p className="text-[10px] sm:text-[11px] text-emerald-700 font-medium">Confirmed</p>
        </div>
        <div className="bg-amber-50/60 rounded-xl p-2.5 border border-amber-100 text-center">
          <p className="text-xs sm:text-sm font-bold text-amber-800">{pendingCount}</p>
          <p className="text-[10px] sm:text-[11px] text-amber-700 font-medium">Pending Confirmation</p>
        </div>
      </div>

      {loading && (
        <div className="py-2 text-xs text-clinic-600 text-center animate-pulse font-medium">
          Loading monthly schedule…
        </div>
      )}

      {/* 7-Column Calendar Grid */}
      {isExpanded && (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-slate-50/50">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100/90 text-center">
            {WEEKDAYS.map((day, idx) => (
              <div
                key={day}
                className={`py-2 text-[10px] sm:text-xs font-bold tracking-wider uppercase ${
                  idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-white">
            {calendarDays.map((cell, idx) => {
              if (!cell.isCurrentMonth || !cell.dateStr) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-16 sm:h-24 bg-slate-50/40 p-1 sm:p-1.5 select-none"
                  />
                )
              }

              const isToday = cell.dateStr === todayStr
              const isSelected = cell.dateStr === selectedDate
              const appts = appointmentsByDate[cell.dateStr] || []
              const count = appts.length

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => onSelectDate(cell.dateStr!)}
                  className={`h-16 sm:h-24 p-1 sm:p-1.5 text-left transition relative flex flex-col justify-between overflow-hidden group ${
                    isSelected
                      ? 'bg-blue-50/90 ring-2 ring-clinic-500 ring-inset z-10'
                      : isToday
                      ? 'bg-sky-50/40 hover:bg-sky-50/80'
                      : 'hover:bg-slate-50/90 bg-white'
                  }`}
                >
                  {/* Day header: Number + Today indicator + Count */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[11px] sm:text-xs font-bold px-1.5 py-0.2 rounded-md ${
                        isSelected
                          ? 'bg-clinic-600 text-white shadow-2xs'
                          : isToday
                          ? 'bg-sky-600 text-white font-extrabold'
                          : 'text-slate-700'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {count > 0 && (
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                          isSelected
                            ? 'bg-white text-clinic-700 border-clinic-300'
                            : 'bg-clinic-50 text-clinic-700 border-clinic-200'
                        }`}
                      >
                        {count} {count === 1 ? 'slot' : 'slots'}
                      </span>
                    )}
                  </div>

                  {/* Slot Previews on Desktop / Dots on Mobile */}
                  <div className="w-full mt-1 overflow-hidden space-y-0.5">
                    {/* Desktop / Tablet view: Slot pills with time */}
                    <div className="hidden sm:block space-y-1">
                      {appts.slice(0, 2).map((a) => (
                        <div
                          key={a.id}
                          className={`text-[9px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 border ${
                            a.status === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : a.status === 'PENDING_DOCTOR_CONFIRMATION'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          title={`${formatTime12h(a.startTime)} · ${a.patientName} (${a.status})`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              a.status === 'CONFIRMED'
                                ? 'bg-emerald-500'
                                : a.status === 'PENDING_DOCTOR_CONFIRMATION'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span className="font-bold shrink-0">{a.startTime}</span>
                          <span className="truncate">{a.patientName.split(' ')[0]}</span>
                        </div>
                      ))}
                      {count > 2 && (
                        <p className="text-[9px] text-slate-400 font-semibold px-1">
                          +{count - 2} more
                        </p>
                      )}
                    </div>

                    {/* Mobile view: Compact dot indicator with count */}
                    <div className="sm:hidden flex items-center gap-1 mt-0.5">
                      {count > 0 && (
                        <div className="flex items-center gap-0.5 flex-wrap">
                          {appts.slice(0, 3).map((a) => (
                            <span
                              key={a.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                a.status === 'CONFIRMED'
                                  ? 'bg-emerald-500'
                                  : a.status === 'PENDING_DOCTOR_CONFIRMATION'
                                  ? 'bg-amber-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected Date Booked Slots Inspector Panel */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-clinic-600" />
            <h3 className="text-xs sm:text-sm font-bold text-ink">
              Booked Slots for {formatFullDate(selectedDate)}
            </h3>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500">
            {selectedDateAppointments.length} {selectedDateAppointments.length === 1 ? 'consultation' : 'consultations'}
          </span>
        </div>

        {selectedDateAppointments.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center font-medium">
            No consultations scheduled for {formatFriendlyDate(selectedDate)}. Click any calendar day above to inspect booked slots.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {selectedDateAppointments.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between space-y-2 hover:border-clinic-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-clinic-700 bg-clinic-50 border border-clinic-200/70 px-1.5 py-0.5 rounded">
                          {formatTime12h(a.startTime)}
                          {a.endTime ? ` – ${formatTime12h(a.endTime)}` : ''}
                        </span>
                        <span className="text-xs font-bold text-ink">{a.patientName}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {a.specializationName || 'General Dentist'}
                        {a.patientMobile ? ` · Tel: ${a.patientMobile}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  {a.status === 'DOCTOR_CANCELLATION_REQUESTED' && (
                    <p className="text-[11px] text-orange-700 mt-1 bg-orange-50 border border-orange-200/60 rounded px-2 py-0.5">
                      Reschedule note: {a.cancellationReason || 'Doctor requested alternative time'}
                    </p>
                  )}
                </div>

                {/* Quick actions for pending consultations */}
                {a.status === 'PENDING_DOCTOR_CONFIRMATION' && (onAcceptAppointment || onCancelAppointment) && (
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    {onAcceptAppointment && (
                      <button
                        type="button"
                        onClick={() => onAcceptAppointment(a)}
                        className="flex-1 py-1 px-2 rounded-lg bg-clinic-600 hover:bg-clinic-700 text-white font-semibold text-xs transition shadow-2xs"
                      >
                        Accept
                      </button>
                    )}
                    {onCancelAppointment && (
                      <button
                        type="button"
                        onClick={() => onCancelAppointment(a)}
                        className="flex-1 py-1 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-2xs"
                      >
                        Can't attend
                      </button>
                    )}
                  </div>
                )}

                {/* Actions for confirmed or reschedule-requested consultations */}
                {(a.status === 'CONFIRMED' || a.status === 'DOCTOR_CANCELLATION_REQUESTED') && onCancelAppointment && (
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onCancelAppointment(a)}
                      className={`text-xs font-semibold py-1 px-2.5 rounded-lg border transition shadow-2xs ${
                        a.status === 'DOCTOR_CANCELLATION_REQUESTED'
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-red-600 hover:border-red-200'
                      }`}
                    >
                      {a.status === 'DOCTOR_CANCELLATION_REQUESTED' ? 'Edit / Update note' : "Can't attend"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
