import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useToast } from '@/context/ToastContext'
import type { Appointment, Doctor, DoctorException, Weekday, WorkingHours } from '@/types'
import { Card, Modal, Button } from '@/components/Primitives'
import { StatusBadge } from '@/components/StatusBadge'
import { listAppointmentsForDoctorMonth } from '@/services/appointmentService'
import {
  getDoctorAvailabilityForDate,
  setDoctorDayAvailability,
  updateDoctorWeeklyHours
} from '@/services/doctorService'
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
  onAvailabilityChanged?: () => void
  refreshKey?: number
  className?: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const WEEKDAY_ROWS: { key: Weekday; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' }
]

export function DoctorMonthCalendar({
  doctorId,
  selectedDate,
  onSelectDate,
  onAcceptAppointment,
  onCancelAppointment,
  onAvailabilityChanged,
  refreshKey = 0,
  className = ''
}: DoctorMonthCalendarProps) {
  const { show } = useToast()

  // Parse year and month from selectedDate or today
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()
  const [year, setYear] = useState<number>(initialDate.getFullYear())
  const [month, setMonth] = useState<number>(initialDate.getMonth()) // 0 - 11
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  // Doctor profile & availability state
  const [doctor, setDoctor] = useState<Doctor | null>(null)

  // Availability Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<'day' | 'weekly'>('day')
  const [modalDate, setModalDate] = useState<string>(selectedDate || getLocalISODate())
  const [availabilityMode, setAvailabilityMode] = useState<'available' | 'leave' | 'special'>('available')
  const [leaveReason, setLeaveReason] = useState('')
  const [specialStart, setSpecialStart] = useState('09:00')
  const [specialEnd, setSpecialEnd] = useState('17:00')
  const [specialReason, setSpecialReason] = useState('')
  const [weeklyHours, setWeeklyHours] = useState<WorkingHours[]>([])
  const [savingAvailability, setSavingAvailability] = useState(false)

  const todayStr = getLocalISODate()
  const yearMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  // Subscribe to doctor profile real-time changes
  useEffect(() => {
    if (!doctorId) {
      setDoctor(null)
      return
    }
    const unsub = onSnapshot(
      doc(db, 'doctors', doctorId),
      (snap) => {
        if (snap.exists()) {
          const docData = { id: snap.id, ...snap.data() } as Doctor
          setDoctor(docData)
          if (docData.workingHours) {
            setWeeklyHours(docData.workingHours)
          }
        }
      },
      (err) => {
        console.warn('[DoctorMonthCalendar] Error subscribing to doctor document:', err)
      }
    )
    return () => unsub()
  }, [doctorId])

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

  // Open availability editing modal
  function openAvailabilityModal(dateToEdit: string = selectedDate || todayStr) {
    setModalDate(dateToEdit)
    setModalTab('day')

    if (doctor) {
      const avail = getDoctorAvailabilityForDate(doctor, dateToEdit)
      if (avail.status === 'leave' || avail.status === 'holiday') {
        setAvailabilityMode('leave')
        setLeaveReason(avail.reason || '')
        setSpecialStart('09:00')
        setSpecialEnd('17:00')
        setSpecialReason('')
      } else if (avail.status === 'special') {
        setAvailabilityMode('special')
        setSpecialStart(avail.start || '09:00')
        setSpecialEnd(avail.end || '17:00')
        setSpecialReason(avail.reason || '')
        setLeaveReason('')
      } else {
        setAvailabilityMode('available')
        setLeaveReason('')
        setSpecialStart(avail.start || '09:00')
        setSpecialEnd(avail.end || '17:00')
        setSpecialReason('')
      }
      if (doctor.workingHours) {
        setWeeklyHours(doctor.workingHours)
      }
    }
    setIsModalOpen(true)
  }

  // Save updated availability
  async function handleSaveAvailability() {
    if (!doctorId) return
    setSavingAvailability(true)
    try {
      if (modalTab === 'day') {
        await setDoctorDayAvailability(doctorId, modalDate, availabilityMode, {
          start: specialStart,
          end: specialEnd,
          reason: availabilityMode === 'leave' ? leaveReason : specialReason
        })
        show(
          `Availability updated for ${formatFriendlyDate(modalDate)} (${
            availabilityMode === 'leave'
              ? 'Marked on leave'
              : availabilityMode === 'special'
              ? `Special hours: ${formatTime12h(specialStart)} – ${formatTime12h(specialEnd)}`
              : 'Marked available'
          })`,
          'success'
        )
      } else {
        await updateDoctorWeeklyHours(doctorId, weeklyHours)
        show('Recurring weekly working hours updated successfully.', 'success')
      }
      setIsModalOpen(false)
      onAvailabilityChanged?.()
    } catch (err: unknown) {
      console.error('[DoctorMonthCalendar] Error updating availability:', err)
      const msg = err instanceof Error ? err.message : 'Could not update availability.'
      show(`Failed to update availability: ${msg}`, 'error')
    } finally {
      setSavingAvailability(false)
    }
  }

  function updateWeeklyDay(dayKey: Weekday, patch: Partial<WorkingHours>) {
    setWeeklyHours((prev) =>
      prev.map((w) => (w.day === dayKey ? { ...w, ...patch } : w))
    )
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

  // Availability of the currently selected date
  const selectedDateAvailability = doctor ? getDoctorAvailabilityForDate(doctor, selectedDate) : null

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
              Monthly schedule & doctor availability management
            </p>
          </div>
        </div>

        {/* Navigation & Availability Action Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          {/* Quick Manage Availability Button */}
          <button
            type="button"
            onClick={() => openAvailabilityModal(selectedDate || todayStr)}
            className="h-8 px-2.5 rounded-lg border border-clinic-300 bg-clinic-50 hover:bg-clinic-100 text-clinic-800 text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
            title="Edit doctor availability or mark leaves"
          >
            <svg className="w-3.5 h-3.5 text-clinic-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Edit Availability</span>
          </button>

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
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs"
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

      {/* 7-Column Calendar Grid with Availability Badges */}
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

              // Check availability for this day cell
              const dayAvail = doctor ? getDoctorAvailabilityForDate(doctor, cell.dateStr) : null
              const isLeave = dayAvail?.status === 'leave' || dayAvail?.status === 'holiday'
              const isSpecial = dayAvail?.status === 'special'
              const isWeeklyOff = dayAvail?.status === 'weekly_off'

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => onSelectDate(cell.dateStr!)}
                  className={`h-16 sm:h-24 p-1 sm:p-1.5 text-left transition relative flex flex-col justify-between overflow-hidden group ${
                    isSelected
                      ? 'bg-blue-50/90 ring-2 ring-clinic-500 ring-inset z-10'
                      : isLeave
                      ? 'bg-rose-50/30 hover:bg-rose-50/70'
                      : isSpecial
                      ? 'bg-purple-50/30 hover:bg-purple-50/70'
                      : isWeeklyOff
                      ? 'bg-slate-50/50 hover:bg-slate-50'
                      : isToday
                      ? 'bg-sky-50/40 hover:bg-sky-50/80'
                      : 'hover:bg-slate-50/90 bg-white'
                  }`}
                >
                  {/* Day header: Number + Badges */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[11px] sm:text-xs font-bold px-1.5 py-0.2 rounded-md ${
                        isSelected
                          ? 'bg-clinic-600 text-white shadow-2xs'
                          : isToday
                          ? 'bg-sky-600 text-white font-extrabold'
                          : isLeave
                          ? 'bg-rose-100 text-rose-800'
                          : 'text-slate-700'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Availability status badge */}
                      {isLeave && (
                        <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200" title={dayAvail?.reason || 'On Leave'}>
                          Off
                        </span>
                      )}
                      {isSpecial && (
                        <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200" title={`Special: ${formatTime12h(dayAvail?.start || '')}–${formatTime12h(dayAvail?.end || '')}`}>
                          Custom
                        </span>
                      )}
                      {isWeeklyOff && !isLeave && count === 0 && (
                        <span className="hidden sm:inline text-[8px] sm:text-[9px] font-semibold px-1 py-0.2 rounded bg-slate-100 text-slate-500">
                          Off
                        </span>
                      )}

                      {/* Slot Count Badge */}
                      {count > 0 && (
                        <span
                          className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                            isSelected
                              ? 'bg-white text-clinic-700 border-clinic-300'
                              : 'bg-clinic-50 text-clinic-700 border-clinic-200'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Slot Previews on Desktop / Dots on Mobile */}
                  <div className="w-full mt-1 overflow-hidden space-y-0.5">
                    {/* Desktop / Tablet view: Slot pills with 12-hour AM/PM time */}
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
                          <span className="font-bold shrink-0">{formatTime12h(a.startTime)}</span>
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

      {/* Selected Date Inspector Panel with Availability Controls */}
      <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-clinic-600" />
              <h3 className="text-xs sm:text-sm font-bold text-ink">
                Schedule for {formatFullDate(selectedDate)}
              </h3>
            </div>
            {/* Availability Pill Indicator */}
            {selectedDateAvailability && (
              <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-500 font-medium">Availability:</span>
                {selectedDateAvailability.status === 'leave' || selectedDateAvailability.status === 'holiday' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 font-semibold">
                    <span>⛔ On Leave / Day Off</span>
                    {selectedDateAvailability.reason && (
                      <span className="italic font-normal">({selectedDateAvailability.reason})</span>
                    )}
                  </span>
                ) : selectedDateAvailability.status === 'special' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 font-semibold">
                    <span>⭐ Custom Hours:</span>
                    <span>
                      {formatTime12h(selectedDateAvailability.start || '')} – {formatTime12h(selectedDateAvailability.end || '')}
                    </span>
                    {selectedDateAvailability.reason && (
                      <span className="italic font-normal">({selectedDateAvailability.reason})</span>
                    )}
                  </span>
                ) : selectedDateAvailability.status === 'available' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
                    <span>🟢 Available (Standard):</span>
                    <span>
                      {formatTime12h(selectedDateAvailability.start || '')} – {formatTime12h(selectedDateAvailability.end || '')}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold">
                    <span>⚪ Regular Weekly Day Off</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action buttons: Edit Availability + Slot Count */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => openAvailabilityModal(selectedDate)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-clinic-400 bg-clinic-600 hover:bg-clinic-700 text-white transition flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit Availability</span>
            </button>

            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg">
              {selectedDateAppointments.length} {selectedDateAppointments.length === 1 ? 'consultation' : 'consultations'}
            </span>
          </div>
        </div>

        {selectedDateAppointments.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center font-medium">
            No consultations scheduled for {formatFriendlyDate(selectedDate)}.
            {selectedDateAvailability?.status === 'leave'
              ? ' You are marked as On Leave on this date.'
              : ' Click "Edit Availability" above if you wish to adjust your hours or mark leaves.'}
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

      {/* EDIT DOCTOR AVAILABILITY MODAL */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Manage Doctor Availability"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={savingAvailability}>
              Cancel
            </Button>
            <Button onClick={handleSaveAvailability} disabled={savingAvailability}>
              {savingAvailability ? 'Saving changes…' : 'Save Availability'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Tabs: Single Date Override vs Weekly Recurring Schedule */}
          <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setModalTab('day')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                modalTab === 'day'
                  ? 'bg-white text-clinic-700 shadow-2xs'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              Date-Specific Availability ({formatFriendlyDate(modalDate)})
            </button>
            <button
              type="button"
              onClick={() => setModalTab('weekly')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                modalTab === 'weekly'
                  ? 'bg-white text-clinic-700 shadow-2xs'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              Weekly Schedule (Recurring)
            </button>
          </div>

          {modalTab === 'day' ? (
            <div className="space-y-4">
              {/* Target Date Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selected Date:
                </label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => {
                    setModalDate(e.target.value)
                    if (doctor) {
                      const av = getDoctorAvailabilityForDate(doctor, e.target.value)
                      if (av.status === 'leave' || av.status === 'holiday') {
                        setAvailabilityMode('leave')
                        setLeaveReason(av.reason || '')
                      } else if (av.status === 'special') {
                        setAvailabilityMode('special')
                        setSpecialStart(av.start || '09:00')
                        setSpecialEnd(av.end || '17:00')
                        setSpecialReason(av.reason || '')
                      } else {
                        setAvailabilityMode('available')
                        setSpecialStart(av.start || '09:00')
                        setSpecialEnd(av.end || '17:00')
                      }
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                />
              </div>

              {/* Status Radio Choices */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Select Availability for {formatFriendlyDate(modalDate)}:
                </label>

                {/* Option 1: Available */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    availabilityMode === 'available'
                      ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="availMode"
                    value="available"
                    checked={availabilityMode === 'available'}
                    onChange={() => setAvailabilityMode('available')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                      <span>🟢 Available (Standard Hours)</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Doctor is available for regular patient consultations according to their weekly schedule. Removes any leave or custom blocks for this day.
                    </p>
                  </div>
                </label>

                {/* Option 2: On Leave */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    availabilityMode === 'leave'
                      ? 'border-rose-500 bg-rose-50/60 ring-1 ring-rose-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="availMode"
                    value="leave"
                    checked={availabilityMode === 'leave'}
                    onChange={() => setAvailabilityMode('leave')}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                      <span>⛔ Mark as On Leave / Day Off</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Doctor is unavailable on this date (e.g. personal leave, emergency, conference). Slot booking will be disabled for patients on this day.
                    </p>
                  </div>
                </label>

                {/* Option 3: Custom / Special Hours */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    availabilityMode === 'special'
                      ? 'border-purple-500 bg-purple-50/60 ring-1 ring-purple-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="availMode"
                    value="special"
                    checked={availabilityMode === 'special'}
                    onChange={() => setAvailabilityMode('special')}
                    className="mt-1 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                      <span>⭐ Set Special / Custom Working Hours</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Doctor works custom hours on this day (e.g. half-day, extended evening clinic, or working on a weekend).
                    </p>
                  </div>
                </label>
              </div>

              {/* Conditional Input for Leave */}
              {availabilityMode === 'leave' && (
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-rose-900">
                    Reason for Leave (Optional):
                  </label>
                  <input
                    type="text"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="e.g. Attending Dental Conference, Family Leave, Medical Off"
                    className="w-full rounded-lg border border-rose-300 px-3 py-1.5 text-xs bg-white focus:ring-rose-500"
                  />
                </div>
              )}

              {/* Conditional Input for Special Hours */}
              {availabilityMode === 'special' && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-purple-900 mb-1">
                        Start Time ({formatTime12h(specialStart)}):
                      </label>
                      <input
                        type="time"
                        value={specialStart}
                        onChange={(e) => setSpecialStart(e.target.value)}
                        className="w-full rounded-lg border border-purple-300 px-3 py-1.5 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-900 mb-1">
                        End Time ({formatTime12h(specialEnd)}):
                      </label>
                      <input
                        type="time"
                        value={specialEnd}
                        onChange={(e) => setSpecialEnd(e.target.value)}
                        className="w-full rounded-lg border border-purple-300 px-3 py-1.5 text-xs bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-900 mb-1">
                      Reason / Note (Optional):
                    </label>
                    <input
                      type="text"
                      value={specialReason}
                      onChange={(e) => setSpecialReason(e.target.value)}
                      placeholder="e.g. Morning surgical slots only, Extended evening clinic"
                      className="w-full rounded-lg border border-purple-300 px-3 py-1.5 text-xs bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Weekly Recurring Working Hours Tab */
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Adjust your standard weekly working schedule. Unchecking a day sets it as your regular weekly day off.
              </p>

              <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                {WEEKDAY_ROWS.map((row) => {
                  const wh = weeklyHours.find((w) => w.day === row.key) || {
                    day: row.key,
                    enabled: false,
                    start: '09:00',
                    end: '17:00'
                  }
                  return (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-200/60 last:border-0"
                    >
                      <label className="flex items-center gap-2 text-xs font-bold text-ink cursor-pointer min-w-[110px]">
                        <input
                          type="checkbox"
                          checked={wh.enabled}
                          onChange={(e) => updateWeeklyDay(row.key, { enabled: e.target.checked })}
                          className="rounded text-clinic-600 focus:ring-clinic-500"
                        />
                        <span>{row.label}</span>
                      </label>

                      <div className="flex items-center gap-1.5 text-xs">
                        <input
                          type="time"
                          disabled={!wh.enabled}
                          value={wh.start}
                          onChange={(e) => updateWeeklyDay(row.key, { start: e.target.value })}
                          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 font-mono"
                        />
                        <span className="text-slate-400">–</span>
                        <input
                          type="time"
                          disabled={!wh.enabled}
                          value={wh.end}
                          onChange={(e) => updateWeeklyDay(row.key, { end: e.target.value })}
                          className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 font-mono"
                        />
                        <span className="text-[10px] text-slate-400 ml-1">
                          {wh.enabled ? `(${formatTime12h(wh.start)} – ${formatTime12h(wh.end)})` : 'Closed'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Card>
  )
}
