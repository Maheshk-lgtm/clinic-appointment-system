import {
  getLocalISODate,
  getDateOffset,
  formatFriendlyDate,
  formatFullDate,
  getDateRelativeLabel
} from '@/utils/dateUtils'

export interface DateNavigatorProps {
  selectedDate: string
  onChange: (dateStr: string) => void
  labelPrefix?: string // e.g. "Appointments for" or "Schedule for"
  countsByDate?: Record<string, number> // optional badge count: { [dateStr]: count }
  className?: string
}

export function DateNavigator({
  selectedDate,
  onChange,
  labelPrefix = 'Viewing',
  countsByDate,
  className = ''
}: DateNavigatorProps) {
  const today = getLocalISODate()
  const yesterday = getDateOffset(-1)
  const tomorrow = getDateOffset(1)

  const quickDays = [
    {
      key: 'yesterday',
      label: 'Yesterday',
      date: yesterday,
      icon: (
        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      key: 'today',
      label: 'Today',
      date: today,
      icon: (
        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      key: 'tomorrow',
      label: 'Tomorrow',
      date: tomorrow,
      icon: (
        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      )
    }
  ]

  const relative = getDateRelativeLabel(selectedDate)
  const isToday = selectedDate === today

  return (
    <div
      className={`bg-white rounded-2xl border border-blue-100 shadow-sm p-3 sm:p-4 space-y-2.5 sm:space-y-3 ${className}`}
    >
      {/* Top row: Current viewing date display & Jump controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-blue-50 border border-blue-100 text-clinic-700 flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="w-4 h-4 text-clinic-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
                {labelPrefix}
              </span>
              <span
                className={`inline-flex items-center text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border ${relative.badgeClass}`}
              >
                {relative.label}
              </span>
            </div>
            <h2 className="text-sm sm:text-lg font-bold text-ink leading-tight truncate">
              {formatFullDate(selectedDate)}
            </h2>
          </div>
        </div>

        {/* Day-by-day step controls + Calendar picker */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-between sm:justify-start pt-1 sm:pt-0">
          {/* Step Back 1 Day */}
          <button
            type="button"
            onClick={() => onChange(getDateOffset(-1, selectedDate))}
            className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-clinic-800 text-[11px] sm:text-xs font-medium transition flex items-center gap-1 shadow-2xs active:scale-95"
            title="Previous day"
          >
            <span>‹</span> Prev
          </button>

          {/* Jump to Today button (visible if not today) */}
          {!isToday && (
            <button
              type="button"
              onClick={() => onChange(today)}
              className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-clinic-300 bg-clinic-50 text-clinic-800 hover:bg-clinic-100 text-[11px] sm:text-xs font-semibold transition shadow-2xs active:scale-95 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-clinic-600 inline-block"></span> Today
            </button>
          )}

          {/* Step Forward 1 Day */}
          <button
            type="button"
            onClick={() => onChange(getDateOffset(1, selectedDate))}
            className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-clinic-800 text-[11px] sm:text-xs font-medium transition flex items-center gap-1 shadow-2xs active:scale-95"
            title="Next day"
          >
            Next <span>›</span>
          </button>

          {/* Direct Date Picker */}
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onChange(e.target.value)
              }}
              className="h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg border border-slate-200 bg-white hover:border-clinic-400 text-[11px] sm:text-xs text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-clinic-500 shadow-2xs"
              title="Pick a custom date"
            />
          </div>
        </div>
      </div>

      {/* Bottom row: Yesterday | Today | Tomorrow Quick Segment Bar */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2 border-t border-slate-100">
        {quickDays.map((day) => {
          const isSelected = selectedDate === day.date
          const count = countsByDate?.[day.date]
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onChange(day.date)}
              className={`rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-r from-clinic-600 via-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/25 ring-2 ring-sky-300/40 scale-[1.01]'
                  : 'bg-slate-50/70 hover:bg-blue-50/50 border border-slate-200 hover:border-clinic-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] sm:text-xs font-bold flex items-center gap-1 truncate">
                  <span className="shrink-0">{day.icon}</span>
                  <span className="truncate">{day.label}</span>
                </span>
                {count !== undefined && (
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ml-1 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-100 text-clinic-800'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] mt-0.5 truncate ${
                  isSelected ? 'text-white/90 font-medium' : 'text-slate-400 font-normal'
                }`}
              >
                {formatFriendlyDate(day.date)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
