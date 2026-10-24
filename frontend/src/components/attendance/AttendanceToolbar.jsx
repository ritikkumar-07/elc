import {
  CalendarDays,
  Clock,
  Filter,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'

import { attendanceStatusOptions } from './status.js'

const fieldClass =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500'

const labelClass =
  'mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500'

export default function AttendanceToolbar({
  classes,
  classId,
  date,
  sessionDraft,
  search,
  statusFilter,
  loading = false,
  refreshing = false,
  disabled = false,
  onClassChange,
  onDateChange,
  onSessionChange,
  onSessionCommit,
  onSearchChange,
  onStatusChange,
  onRefresh,
}) {
  const unmarkedOnly = statusFilter === 'unmarked'

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
      aria-label="Attendance filters"
      aria-busy={loading || refreshing}
    >
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
        <label className="block lg:col-span-3">
          <span className={labelClass}>Class</span>
          <select
            value={classId}
            onChange={(event) => onClassChange(event.target.value)}
            className={fieldClass}
            disabled={disabled || classes.length === 0}
          >
            <option value="">Select a class</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label ||
                  [item.name, item.section]
                    .filter(Boolean)
                    .join(' - ')}
              </option>
            ))}
          </select>
        </label>

        <label className="block lg:col-span-2">
          <span className={labelClass}>Date</span>
          <span className="relative block">
            <CalendarDays
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              className={`${fieldClass} pl-8`}
              disabled={disabled}
            />
          </span>
        </label>

        <label className="block lg:col-span-2">
          <span className={labelClass}>Session</span>
          <span className="relative block">
            <Clock
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={sessionDraft}
              onChange={(event) => onSessionChange(event.target.value)}
              onBlur={onSessionCommit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onSessionCommit()
                }
              }}
              list="elc-attendance-sessions"
              maxLength={40}
              placeholder="full-day"
              className={`${fieldClass} pl-8`}
              disabled={disabled}
              aria-describedby="attendance-session-hint"
            />
          </span>
          <datalist id="elc-attendance-sessions">
            <option value="full-day" />
            <option value="morning" />
            <option value="afternoon" />
            <option value="evening" />
          </datalist>
          <span id="attendance-session-hint" className="sr-only">
            Type a session name. Press Enter or leave the field to apply.
          </span>
        </label>

        <label className="block sm:col-span-2 lg:col-span-3">
          <span className={labelClass}>Search students</span>
          <span className="relative block">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              maxLength={80}
              placeholder="Name, roll number, or email"
              className={`${fieldClass} pl-8 pr-8`}
              disabled={disabled || !classId}
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear student search"
                className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </span>
        </label>

        <label className="block lg:col-span-2">
          <span className={labelClass}>Status filter</span>
          <span className="relative block">
            <Filter
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <select
              value={statusFilter}
              onChange={(event) => onStatusChange(event.target.value)}
              className={`${fieldClass} pl-8`}
              disabled={disabled || !classId}
            >
              <option value="">All students</option>
              {attendanceStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value="unmarked">Unmarked only</option>
            </select>
          </span>
        </label>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <button
          type="button"
          aria-pressed={unmarkedOnly}
          onClick={() =>
            onStatusChange(unmarkedOnly ? '' : 'unmarked')
          }
          disabled={disabled || !classId}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50 ${
            unmarkedOnly
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          Unmarked only
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled || !classId || loading || refreshing}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              loading || refreshing ? 'animate-spin' : ''
            }`}
            aria-hidden="true"
          />
          {loading || refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </section>
  )
}
