import { useEffect, useState } from 'react'
import { listAllAppointments } from '@/services/appointmentService'
import type { Appointment } from '@/types'
import { Card, LoadingSpinner } from '@/components/Primitives'

export function ReportsPage() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    listAllAppointments(2000).then(setAppointments)
  }, [])

  if (!appointments) return <LoadingSpinner />

  const inRange = appointments.filter((a) => (!from || a.date >= from) && (!to || a.date <= to))
  const byDoctor = groupCount(inRange, (a) => a.doctorName)
  const bySpecialization = groupCount(inRange, (a) => a.specializationName)
  const confirmed = inRange.filter((a) => a.status === 'CONFIRMED' || a.status === 'COMPLETED').length
  const cancelled = inRange.filter((a) => ['CANCELLED', 'EXPIRED'].includes(a.status)).length
  const noShow = inRange.filter((a) => a.status === 'NO_SHOW').length

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="font-display text-2xl">Reports</h1>
      <Card className="p-3.5 sm:p-4 flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3 sm:items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-xs text-slate-500 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-auto rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs text-slate-500 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-auto rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <p className="text-xs sm:text-sm text-slate-500 pt-1 sm:pt-0">{inRange.length} appointments in range</p>
      </Card>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Confirmed" value={confirmed} />
        <Stat label="Cancelled" value={cancelled} />
        <Stat label="No-shows" value={noShow} />
      </div>

      <Card className="p-4">
        <p className="font-medium mb-3">By doctor</p>
        <Bars data={byDoctor} />
      </Card>
      <Card className="p-4">
        <p className="font-medium mb-3">By specialization</p>
        <Bars data={bySpecialization} />
      </Card>
    </div>
  )
}

function groupCount<T>(items: T[], keyFn: (i: T) => string) {
  const map: Record<string, number> = {}
  for (const item of items) {
    const k = keyFn(item)
    map[k] = (map[k] || 0) + 1
  }
  return map
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-3 sm:p-4">
      <p className="text-xl sm:text-2xl font-display font-bold text-ink">{value}</p>
      <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">{label}</p>
    </Card>
  )
}

function Bars({ data }: { data: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(data))
  const entries = Object.entries(data)
  if (entries.length === 0) return <p className="text-sm text-slate-500">No data in range.</p>
  return (
    <div className="space-y-2">
      {entries.map(([name, count]) => (
        <div key={name}>
          <div className="flex justify-between text-xs text-slate-500 mb-0.5">
            <span>{name}</span>
            <span>{count}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-clinic-500 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
