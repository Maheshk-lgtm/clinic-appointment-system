import type { Appointment } from '@/types'
import { Card } from '@/components/Primitives'
import { StatusBadge } from '@/components/StatusBadge'
import { formatFriendlyDate, formatTime12h } from '@/utils/dateUtils'

export interface DoctorUpcomingRemindersProps {
  todayDate: string
  todayAppointments: Appointment[]
  tomorrowDate: string
  tomorrowAppointments: Appointment[]
  dayAfterDate: string
  dayAfterAppointments: Appointment[]
  onSelectDate: (dateStr: string) => void
  onAcceptAppointment?: (a: Appointment) => void
  onCancelAppointment?: (a: Appointment) => void
}

function ReminderSlotItem({
  appointment: a,
  timeColor,
  onAcceptAppointment,
  onCancelAppointment
}: {
  appointment: Appointment
  timeColor: string
  onAcceptAppointment?: (a: Appointment) => void
  onCancelAppointment?: (a: Appointment) => void
}) {
  return (
    <div className="py-2.5 flex flex-col gap-1.5 border-b border-slate-100 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-bold ${timeColor}`}>
              {formatTime12h(a.startTime)}
              {a.endTime ? ` – ${formatTime12h(a.endTime)}` : ''}
            </span>
            <span className="text-xs font-semibold text-ink truncate">
              · {a.patientName}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {a.specializationName || 'General Consultation'}
            {a.patientMobile ? ` · Tel: ${a.patientMobile}` : ''}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>

      {/* Action buttons for pending new consultations */}
      {a.status === 'PENDING_DOCTOR_CONFIRMATION' && (onAcceptAppointment || onCancelAppointment) && (
        <div className="flex items-center gap-2 pt-1">
          {onAcceptAppointment && (
            <button
              type="button"
              onClick={() => onAcceptAppointment(a)}
              className="py-1 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition shadow-2xs flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Accept</span>
            </button>
          )}
          {onCancelAppointment && (
            <button
              type="button"
              onClick={() => onCancelAppointment(a)}
              className="py-1 px-2.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition shadow-2xs"
            >
              Can't attend
            </button>
          )}
        </div>
      )}

      {/* Action button for confirmed consultations */}
      {a.status === 'CONFIRMED' && onCancelAppointment && (
        <div className="flex items-center justify-end pt-0.5">
          <button
            type="button"
            onClick={() => onCancelAppointment(a)}
            className="text-[11px] text-slate-400 hover:text-red-600 font-medium underline transition"
          >
            Can't attend
          </button>
        </div>
      )}

      {/* Edit / Update action for reschedule-requested consultations */}
      {a.status === 'DOCTOR_CANCELLATION_REQUESTED' && onCancelAppointment && (
        <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-amber-50 border border-amber-200/70 text-[11px] text-amber-900">
          <span className="truncate">Note: {a.cancellationReason || 'Doctor unavailable'}</span>
          <button
            type="button"
            onClick={() => onCancelAppointment(a)}
            className="font-bold underline text-amber-800 hover:text-amber-900 shrink-0 ml-1"
          >
            Edit note
          </button>
        </div>
      )}
    </div>
  )
}

export function DoctorUpcomingReminders({
  todayDate,
  todayAppointments,
  tomorrowDate,
  tomorrowAppointments,
  dayAfterDate,
  dayAfterAppointments,
  onSelectDate,
  onAcceptAppointment,
  onCancelAppointment
}: DoctorUpcomingRemindersProps) {
  const todayCount = todayAppointments.length
  const tomorrowCount = tomorrowAppointments.length
  const dayAfterCount = dayAfterAppointments.length
  const totalUpcoming = todayCount + tomorrowCount + dayAfterCount

  return (
    <Card className="p-3.5 sm:p-5 border-sky-100 bg-gradient-to-br from-white via-sky-50/20 to-blue-50/30 shadow-xs space-y-3.5 sm:space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink">Appointment Reminders</h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Schedule overview for today, tomorrow, and the day after tomorrow
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100/80 text-sky-800 border border-sky-200/80 self-start sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
          {totalUpcoming} {totalUpcoming === 1 ? 'consultation' : 'consultations'} scheduled
        </span>
      </div>

      {/* 3-Column Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Today */}
        <div className="bg-white rounded-xl border border-emerald-100/90 p-3.5 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                  Today
                </span>
                <span className="text-xs sm:text-sm font-bold text-ink truncate">
                  {formatFriendlyDate(todayDate)}
                </span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  todayCount > 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {todayCount} {todayCount === 1 ? 'slot' : 'slots'}
              </span>
            </div>

            {/* Appointment Slots List */}
            {todayCount === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No consultations scheduled for today.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto mt-1 space-y-0.5 pr-1">
                {todayAppointments.map((a) => (
                  <ReminderSlotItem
                    key={a.id}
                    appointment={a}
                    timeColor="text-emerald-700"
                    onAcceptAppointment={onAcceptAppointment}
                    onCancelAppointment={onCancelAppointment}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelectDate(todayDate)}
            className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition shadow-2xs flex items-center justify-center gap-1 mt-1"
          >
            <span>View Today's Schedule</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Card 2: Tomorrow */}
        <div className="bg-white rounded-xl border border-sky-100/90 p-3.5 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60">
                  Tomorrow
                </span>
                <span className="text-xs sm:text-sm font-bold text-ink truncate">
                  {formatFriendlyDate(tomorrowDate)}
                </span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  tomorrowCount > 0
                    ? 'bg-blue-50 text-clinic-700 border-blue-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {tomorrowCount} {tomorrowCount === 1 ? 'slot' : 'slots'}
              </span>
            </div>

            {/* Appointment Slots List */}
            {tomorrowCount === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No consultations scheduled for tomorrow.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto mt-1 space-y-0.5 pr-1">
                {tomorrowAppointments.map((a) => (
                  <ReminderSlotItem
                    key={a.id}
                    appointment={a}
                    timeColor="text-clinic-700"
                    onAcceptAppointment={onAcceptAppointment}
                    onCancelAppointment={onCancelAppointment}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelectDate(tomorrowDate)}
            className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded-lg border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:border-sky-300 transition shadow-2xs flex items-center justify-center gap-1 mt-1"
          >
            <span>View Tomorrow's Schedule</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Card 3: Day After Tomorrow */}
        <div className="bg-white rounded-xl border border-indigo-100/90 p-3.5 shadow-2xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                  Day After
                </span>
                <span className="text-xs sm:text-sm font-bold text-ink truncate">
                  {formatFriendlyDate(dayAfterDate)}
                </span>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  dayAfterCount > 0
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {dayAfterCount} {dayAfterCount === 1 ? 'slot' : 'slots'}
              </span>
            </div>

            {/* Appointment Slots List */}
            {dayAfterCount === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No consultations scheduled for day after tomorrow.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto mt-1 space-y-0.5 pr-1">
                {dayAfterAppointments.map((a) => (
                  <ReminderSlotItem
                    key={a.id}
                    appointment={a}
                    timeColor="text-indigo-700"
                    onAcceptAppointment={onAcceptAppointment}
                    onCancelAppointment={onCancelAppointment}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelectDate(dayAfterDate)}
            className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-300 transition shadow-2xs flex items-center justify-center gap-1 mt-1"
          >
            <span>View Day After Schedule</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </Card>
  )
}
