export const ATTENDANCE_STATUSES = [
  'present',
  'absent',
  'late',
  'excused',
]

export const MAX_ATTENDANCE_BATCH = 200
export const MAX_CLASS_ATTENDANCE_STUDENTS = 5000
export const MAX_ROSTER_FILTER_STUDENTS = 5000

export const EMPTY_ATTENDANCE_COUNTS = Object.freeze({
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
})

export function normalizeAttendanceSession(value) {
  const session = String(value ?? '').trim()
  return session || 'full-day'
}

export function isValidAttendanceDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

export function attendanceStudentId(value) {
  return String(value?._id || value || '')
}

export function normalizeAttendanceRecords(records) {
  return (records || []).map((record) => ({
    student: attendanceStudentId(record.student),
    status: record.status,
    note: String(record.note || '').trim().slice(0, 200),
  }))
}

export function buildAttendanceRecordMap(records) {
  const map = new Map()

  for (const record of normalizeAttendanceRecords(records)) {
    if (!record.student || !ATTENDANCE_STATUSES.includes(record.status)) {
      continue
    }

    map.set(record.student, record)
  }

  return map
}

export function summarizeAttendanceRecords(records, activeStudentIds) {
  const counts = { ...EMPTY_ATTENDANCE_COUNTS }
  const activeIds =
    activeStudentIds == null
      ? null
      : new Set([...activeStudentIds].map(String))
  const recordsById = buildAttendanceRecordMap(records)
  const markedIds = new Set()

  for (const [studentId, record] of recordsById) {
    if (activeIds && !activeIds.has(studentId)) {
      continue
    }

    counts[record.status] += 1
    markedIds.add(studentId)
  }

  const total = activeIds ? activeIds.size : markedIds.size
  const marked = markedIds.size

  return {
    counts,
    total,
    marked,
    unmarked: Math.max(total - marked, 0),
  }
}

export function mergeAttendanceRecords(
  existingRecords,
  updates,
  options = {},
) {
  const onlyUnmarked = options.onlyUnmarked === true
  const recordsById = buildAttendanceRecordMap(existingRecords)
  let changedCount = 0

  for (const update of updates) {
    const studentId = attendanceStudentId(update.studentId || update.student)
    const status = update.status
    const note = String(update.note || '').trim().slice(0, 200)

    if (
      !studentId ||
      !ATTENDANCE_STATUSES.includes(status) ||
      (onlyUnmarked && recordsById.has(studentId))
    ) {
      continue
    }

    const current = recordsById.get(studentId)

    if (
      current &&
      current.status === status &&
      current.note === note
    ) {
      continue
    }

    recordsById.set(studentId, {
      student: studentId,
      status,
      note,
    })
    changedCount += 1
  }

  return {
    records: [...recordsById.values()],
    changedCount,
    recordsById,
  }
}

export function recordsForStudents(records, studentIds) {
  const recordsById = buildAttendanceRecordMap(records)
  const result = []

  for (const studentId of studentIds) {
    const record = recordsById.get(String(studentId))

    if (record) {
      result.push(record)
    }
  }

  return result
}

export function attendanceRevision(value) {
  const revision = Number(value)

  return Number.isInteger(revision) && revision >= 0 ? revision : 0
}
