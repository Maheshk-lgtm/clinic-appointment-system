/**
 * Date utilities for clinic appointment navigation and timezone-safe date strings.
 */

export function getLocalISODate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getDateOffset(offsetDays: number, baseDateStr?: string): string {
  let base: Date
  if (baseDateStr) {
    const [y, m, d] = baseDateStr.split('-').map(Number)
    base = new Date(y, m - 1, d)
  } else {
    base = new Date()
  }
  base.setDate(base.getDate() + offsetDays)
  return getLocalISODate(base)
}

export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

export function formatFullDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export function getDateRelativeLabel(dateStr: string): { label: string; badgeClass: string } {
  const today = getLocalISODate()
  const yesterday = getDateOffset(-1)
  const tomorrow = getDateOffset(1)

  if (dateStr === today) {
    return { label: 'Today', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }
  if (dateStr === yesterday) {
    return { label: 'Yesterday', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' }
  }
  if (dateStr === tomorrow) {
    return { label: 'Tomorrow', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' }
  }
  if (dateStr < today) {
    return { label: 'Past date', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' }
  }
  return { label: 'Upcoming date', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
}

export function getMonthYearLabel(year: number, month: number): string {
  const d = new Date(year, month, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return ''
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr, 10)
  if (isNaN(h)) return timeStr
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mStr || '00'} ${period}`
}
