import { History } from 'lucide-react'

import { Panel, Skeleton } from '../common/DashboardUI.jsx'
import { attendanceStatusOptions } from './status.js'

function formatUpdated(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function RecentSessions({
  records,
  loading = false,
  date,
  session,
  disabled = false,
  onSelect,
}) {
  return (
    <Panel
      title="Recent sessions"
      description="Saved attendance for this class, newest first."
      icon={History}
    >
      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <p className="px-4 py-5 text-sm text-slate-500 sm:px-5">
          No attendance has been saved for this class yet.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {records.map((record) => {
            const active =
              record.date === date && record.session === session

            return (
              <div
                key={record.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-900">
                    {record.date}
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-medium capitalize text-slate-600">
                      {record.session}
                    </span>
                    {active && (
                      <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-900">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {record.recordCount || 0} students marked
                    {record.markedBy?.name
                      ? ` · ${record.markedBy.name}`
                      : ''}
                    {record.updatedAt
                      ? ` · ${formatUpdated(record.updatedAt)}`
                      : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {attendanceStatusOptions.map((option) => (
                    <span
                      key={option.value}
                      className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${option.chip}`}
                    >
                      {option.label}: {record.counts?.[option.value] ?? 0}
                    </span>
                  ))}
                  {!active && (
                    <button
                      type="button"
                      onClick={() =>
                        onSelect(record.date, record.session)
                      }
                      disabled={disabled || loading}
                      className="ml-1 inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:opacity-50"
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
