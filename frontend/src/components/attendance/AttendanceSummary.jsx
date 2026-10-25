import { CalendarCheck, CircleHelp, ShieldCheck } from 'lucide-react'

import {
  attendanceStatusOptions,
  unmarkedStatus,
} from './status.js'

function SummaryItem({ option, value }) {
  const Icon = option.icon

  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 ${option.chip}`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${option.iconBox}`}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-wide opacity-75">
          {option.label}
        </p>
        <p className="text-lg font-bold leading-5">{value ?? 0}</p>
      </div>
    </div>
  )
}

export default function AttendanceSummary({
  summary,
  unsavedCount,
  sessionInfo,
  loading = false,
}) {
  const counts = summary?.counts || {}
  const total = summary?.total || 0
  const marked = summary?.marked || 0
  const unmarked = summary?.unmarked || 0
  const updatedLabel = sessionInfo?.updatedAt
    ? new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(sessionInfo.updatedAt))
    : null

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      aria-label="Attendance summary"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {attendanceStatusOptions.map((option) => (
          <SummaryItem
            key={option.value}
            option={option}
            value={loading ? '—' : counts[option.value] ?? 0}
          />
        ))}
        <SummaryItem
          option={{
            ...unmarkedStatus,
            icon: CircleHelp,
          }}
          value={loading ? '—' : unmarked}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[11px]">
        <p className="flex min-w-0 items-center gap-1.5 text-slate-500">
          <ShieldCheck
            className="h-3.5 w-3.5 shrink-0 text-slate-500"
            aria-hidden="true"
          />
          <span className="truncate">
            {marked} of {total} students marked
            {updatedLabel ? ` · Saved ${updatedLabel}` : ''}
          </span>
        </p>

        <p
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ${
            unsavedCount > 0
              ? 'bg-amber-50 text-amber-900'
              : 'bg-emerald-50 text-emerald-800'
          }`}
          aria-live="polite"
        >
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {unsavedCount > 0
            ? `${unsavedCount} unsaved ${unsavedCount === 1 ? 'change' : 'changes'}`
            : 'No unsaved changes'}
        </p>
      </div>
    </section>
  )
}
