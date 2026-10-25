import { attendanceStatusOptions } from './status.js'

const noteClass =
  'h-8 w-full min-w-[120px] rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-700 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

function StatusControl({
  student,
  status,
  disabled,
  onChange,
  namePrefix,
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">
        Attendance status for {student.name}
        {student.rollNumber ? `, roll number ${student.rollNumber}` : ''}
      </legend>
      <div className="flex flex-wrap gap-1">
        {attendanceStatusOptions.map((option) => {
          const Icon = option.icon
          const active = status === option.value

          return (
            <label
              key={option.value}
              className={`attendance-status-option inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border px-1.5 text-[10px] font-semibold transition ${
                active ? option.active : option.idle
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="radio"
                name={`${namePrefix}-${student.id}`}
                value={option.value}
                checked={active}
                disabled={disabled}
                onChange={() => onChange(student, option.value)}
                className="sr-only"
              />
              <Icon className="h-3 w-3" aria-hidden="true" />
              <span>{option.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function StateBadge({ dirty, saved }) {
  if (dirty) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
        Unsaved
      </span>
    )
  }

  if (saved) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
        Saved
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
      Unmarked
    </span>
  )
}

export default function AttendanceTable({
  rows,
  selected,
  disabled = false,
  onToggleSelect,
  onToggleAll,
  onStatusChange,
  onNoteChange,
}) {
  const allSelected =
    rows.length > 0 && rows.every((row) => selected.has(row.id))

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="attendance-scroll max-h-[68vh] overflow-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Attendance roster. Use the status buttons in each row to
              update a student, then save your changes.
            </caption>
            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500 shadow-[0_1px_0_#e2e8f0]">
              <tr>
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    disabled={disabled || rows.length === 0}
                    aria-label="Select all students on this page"
                    className="h-4 w-4 rounded border-slate-300 text-[#19366e] focus:ring-blue-200"
                  />
                </th>
                <th scope="col" className="min-w-[210px] px-3 py-2.5 font-bold">
                  Student
                </th>
                <th scope="col" className="min-w-[250px] px-3 py-2.5 font-bold">
                  Status
                </th>
                <th scope="col" className="min-w-[160px] px-3 py-2.5 font-bold">
                  Note
                </th>
                <th scope="col" className="w-[88px] px-3 py-2.5 font-bold">
                  State
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((student) => {
                const isSelected = selected.has(student.id)

                return (
                  <tr
                    key={student.id}
                    className={`group transition focus-within:bg-blue-50/40 hover:bg-slate-50 ${
                      student.dirty ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="px-3 py-1.5 align-middle">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(student.id)}
                        disabled={disabled}
                        aria-label={`Select ${student.name}`}
                        className="h-4 w-4 rounded border-slate-300 text-[#19366e] focus:ring-blue-200"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <p className="text-[13px] font-semibold leading-5 text-slate-900">
                        {student.name}
                      </p>
                      <p className="text-[11px] leading-4 text-slate-500">
                        {student.rollNumber
                          ? `Roll ${student.rollNumber}`
                          : student.email || 'No roll number'}
                      </p>
                    </td>
                    <td className="px-3 py-1.5">
                      <StatusControl
                        student={student}
                        status={student.status}
                        disabled={disabled}
                        onChange={onStatusChange}
                        namePrefix="desktop-status"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={student.note}
                        onChange={(event) =>
                          onNoteChange(student, event.target.value)
                        }
                        maxLength={200}
                        disabled={disabled || !student.status}
                        placeholder={
                          student.status
                            ? 'Optional note'
                            : 'Mark status first'
                        }
                        aria-label={`Attendance note for ${student.name}`}
                        className={noteClass}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <StateBadge
                        dirty={student.dirty}
                        saved={student.saved}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {rows.map((student) => (
          <article
            key={student.id}
            className={`rounded-xl border bg-white p-3 shadow-sm ${
              student.dirty
                ? 'border-amber-300 bg-amber-50/40'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={selected.has(student.id)}
                onChange={() => onToggleSelect(student.id)}
                disabled={disabled}
                aria-label={`Select ${student.name}`}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-[#19366e] focus:ring-blue-200"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {student.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {student.rollNumber
                        ? `Roll ${student.rollNumber}`
                        : student.email || 'No roll number'}
                    </p>
                  </div>
                  <StateBadge
                    dirty={student.dirty}
                    saved={student.saved}
                  />
                </div>

                <div className="mt-2.5">
                  <StatusControl
                    student={student}
                    status={student.status}
                    disabled={disabled}
                    onChange={onStatusChange}
                    namePrefix="mobile-status"
                  />
                </div>

                <div className="mt-2">
                  <label className="sr-only" htmlFor={`note-${student.id}`}>
                    Attendance note for {student.name}
                  </label>
                  <input
                    id={`note-${student.id}`}
                    value={student.note}
                    onChange={(event) =>
                      onNoteChange(student, event.target.value)
                    }
                    maxLength={200}
                    disabled={disabled || !student.status}
                    placeholder={
                      student.status ? 'Optional note' : 'Mark status first'
                    }
                    className={noteClass}
                  />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
