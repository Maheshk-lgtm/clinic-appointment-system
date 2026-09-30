import type { AppointmentStatus } from '@/types'

const STYLES: Record<AppointmentStatus, string> = {
  PENDING_DOCTOR_CONFIRMATION: 'bg-amber-50 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-clinic-50 text-clinic-800 border-clinic-200',
  DOCTOR_CANCELLATION_REQUESTED: 'bg-orange-50 text-orange-800 border-orange-200',
  RESCHEDULED: 'bg-sky-50 text-sky-800 border-sky-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  COMPLETED: 'bg-clinic-100 text-clinic-900 border-clinic-300',
  NO_SHOW: 'bg-red-50 text-red-700 border-red-200',
  EXPIRED: 'bg-slate-100 text-slate-500 border-slate-200'
}

const LABELS: Record<AppointmentStatus, string> = {
  PENDING_DOCTOR_CONFIRMATION: 'Pending doctor',
  CONFIRMED: 'Confirmed',
  DOCTOR_CANCELLATION_REQUESTED: 'Reschedule needed',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No-show',
  EXPIRED: 'Expired'
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  )
}
