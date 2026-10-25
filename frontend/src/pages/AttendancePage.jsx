import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  ListChecks,
  Loader2,
  RotateCcw,
  Save,
  SearchX,
  UserX,
  Users,
} from 'lucide-react'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import AttendanceSummary from '../components/attendance/AttendanceSummary.jsx'
import AttendanceTable from '../components/attendance/AttendanceTable.jsx'
import AttendanceToolbar from '../components/attendance/AttendanceToolbar.jsx'
import RecentSessions from '../components/attendance/RecentSessions.jsx'
import {
  attendanceStatusOption,
  attendanceStatusOptions,
} from '../components/attendance/status.js'
import {
  Badge,
  buttonPrimary,
  buttonDanger,
  buttonSecondary,
  CompactStatCard,
  ConfirmDialog,
  EmptyState,
  LoadingState,
  Notice,
  PageHeader,
  Panel,
  Skeleton,
  cardClass,
} from '../components/common/DashboardUI.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest, buildQuery } from '../lib/api.js'

const PAGE_SIZES = [25, 50, 100]
const SAVE_BATCH_SIZE = 100

function today() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

function defaultSummary() {
  return {
    counts: { present: 0, absent: 0, late: 0, excused: 0 },
    total: 0,
    marked: 0,
    unmarked: 0,
  }
}

function defaultSession() {
  return {
    id: null,
    revision: 0,
    markedBy: null,
    createdAt: null,
    updatedAt: null,
  }
}

function normalizeSummary(value) {
  return {
    counts: {
      present: Number(value?.counts?.present || 0),
      absent: Number(value?.counts?.absent || 0),
      late: Number(value?.counts?.late || 0),
      excused: Number(value?.counts?.excused || 0),
    },
    total: Number(value?.total || 0),
    marked: Number(value?.marked || 0),
    unmarked: Number(value?.unmarked || 0),
  }
}

function normalizeSession(value) {
  return {
    id: value?.id || null,
    revision: Number.isInteger(value?.revision)
      ? value.revision
      : Number(value?.revision || 0),
    markedBy: value?.markedBy || null,
    createdAt: value?.createdAt || null,
    updatedAt: value?.updatedAt || null,
  }
}

function formatDateLong(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function classLabel(item) {
  return (
    item?.label ||
    [item?.name, item?.section].filter(Boolean).join(' - ')
  )
}

function statusTone(value) {
  return value === 'present'
    ? 'green'
    : value === 'absent'
      ? 'red'
      : value === 'late'
        ? 'amber'
        : 'blue'
}

function studentIdFromRecord(record) {
  return String(
    record?.student?.id || record?.student?._id || record?.student || '',
  )
}

function chunk(values, size) {
  const batches = []

  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size))
  }

  return batches
}

function TableSkeleton() {
  return (
    <div
      className={`${cardClass} overflow-hidden`}
      aria-hidden="true"
    >
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="grid gap-3 px-4 py-3 sm:grid-cols-[1.4fr_1.8fr_1fr_80px]"
          >
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-7 w-full max-w-[260px]" />
            <Skeleton className="h-7 w-full max-w-[160px]" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

function StudentAttendanceView({ user, logout }) {
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError('')

      try {
        const result = await apiRequest(
          '/api/v1/attendance/me?limit=100',
          { signal: controller.signal },
        )
        setRecords(Array.isArray(result.data) ? result.data : [])
        setSummary(result.summary || null)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load attendance.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()

    return () => controller.abort()
  }, [reloadKey])

  return (
    <DashboardLayout
      title="Attendance"
      description="Review your attendance record."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="My record"
          title="Attendance"
          description="Attendance is marked by your teachers. Contact the institute if a record looks incorrect."
        />

        {error && (
          <Notice
            tone="red"
            action={
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className={buttonSecondary}
              >
                Try again
              </button>
            }
          >
            {error}
          </Notice>
        )}

        {loading ? (
          <LoadingState label="Loading attendance..." />
        ) : (
          <>
            <section
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
              aria-label="Attendance summary"
            >
              <CompactStatCard
                label="Attendance"
                value={
                  summary?.percentage != null
                    ? `${summary.percentage}%`
                    : '—'
                }
                icon={CalendarCheck}
                tone="navy"
                hint="Across recorded days"
              />
              <CompactStatCard
                label="Present"
                value={summary?.present ?? 0}
                icon={attendanceStatusOption('present').icon}
                tone="teal"
                hint="Recorded days"
              />
              <CompactStatCard
                label="Absent"
                value={summary?.absent ?? 0}
                icon={UserX}
                tone="rose"
                hint="Recorded days"
              />
              <CompactStatCard
                label="Late"
                value={summary?.late ?? 0}
                icon={attendanceStatusOption('late').icon}
                tone="amber"
                hint="Recorded days"
              />
              <CompactStatCard
                label="Excused"
                value={summary?.excused ?? 0}
                icon={FileCheck2}
                tone="indigo"
                hint="Recorded days"
              />
            </section>

            {records.length === 0 ? (
              <EmptyState
                title="No attendance recorded yet"
                description="Your attendance history will appear after your teacher marks a session."
                icon={CalendarCheck}
              />
            ) : (
              <Panel
                title="Attendance history"
                description="Your most recent recorded sessions."
                icon={ClipboardList}
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <caption className="sr-only">
                      Your attendance history
                    </caption>
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 font-bold">Date</th>
                        <th className="px-4 py-2.5 font-bold">Session</th>
                        <th className="px-4 py-2.5 font-bold">Class</th>
                        <th className="px-4 py-2.5 font-bold">Status</th>
                        <th className="px-4 py-2.5 font-bold">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((record) => {
                        const mine = record.records?.[0]
                        const option = attendanceStatusOption(
                          mine?.status,
                        )

                        return (
                          <tr key={record.id} className="hover:bg-slate-50">
                            <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-800">
                              {record.date}
                            </td>
                            <td className="px-4 py-2.5 capitalize text-slate-600">
                              {record.session}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {record.class
                                ? [
                                    record.class.name,
                                    record.class.section,
                                  ]
                                    .filter(Boolean)
                                    .join(' - ')
                                : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge
                                tone={
                                  mine?.status
                                    ? statusTone(mine.status)
                                    : 'slate'
                                }
                              >
                                {option.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {mine?.note || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function StaffAttendanceView({ user, logout }) {
  const [classes, setClasses] = useState([])
  const [classesLoading, setClassesLoading] = useState(true)
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(today())
  const [session, setSession] = useState('full-day')
  const [sessionDraft, setSessionDraft] = useState('full-day')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)

  const [roster, setRoster] = useState([])
  const [summary, setSummary] = useState(defaultSummary)
  const [sessionInfo, setSessionInfo] = useState(defaultSession)
  const [pagination, setPagination] = useState(null)
  const [savedMap, setSavedMap] = useState({})
  const [edits, setEdits] = useState({})
  const [selected, setSelected] = useState(() => new Set())

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')
  const [conflict, setConflict] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)
  const [dialog, setDialog] = useState(null)

  const hasUnsavedChanges = Object.keys(edits).length > 0
  const selectedClass = classes.find((item) => item.id === classId)

  useEffect(() => {
    const controller = new AbortController()

    apiRequest('/api/v1/academics/classes', {
      signal: controller.signal,
    })
      .then((result) => {
        const list = Array.isArray(result.data) ? result.data : []
        setClasses(list)
        if (list.length > 0) {
          setClassId((current) => current || list[0].id)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setLoadError(err.message || 'Unable to load classes.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setClassesLoading(false)
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
      setSelected(new Set())
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  const loadRoster = useCallback(
    async ({ signal, background = false } = {}) => {
      if (!classId) {
        setRoster([])
        setSummary(defaultSummary())
        setSessionInfo(defaultSession())
        setPagination(null)
        setLoading(false)
        setRefreshing(false)
        return
      }

      if (background) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setLoadError('')

      try {
        const result = await apiRequest(
          `/api/v1/attendance/roster${buildQuery({
            classId,
            date,
            session,
            search,
            status: statusFilter,
            page,
            limit,
          })}`,
          { signal },
        )

        if (signal?.aborted) return

        const students = Array.isArray(result.data)
          ? result.data
          : []
        const nextSaved = {}

        for (const student of students) {
          nextSaved[student.id] = {
            status: student.status || null,
            note: student.note || '',
            saved: Boolean(student.saved),
          }
        }

        setRoster(students)
        setSummary(normalizeSummary(result.summary))
        setSessionInfo(normalizeSession(result.session))
        setPagination(result.pagination || null)
        setSavedMap((current) => ({ ...current, ...nextSaved }))
        setEdits((current) => {
          const next = { ...current }

          for (const [studentId, edit] of Object.entries(next)) {
            const base = nextSaved[studentId]

            if (
              base &&
              (edit.status || null) === (base.status || null) &&
              (edit.note || '') === (base.note || '')
            ) {
              delete next[studentId]
            }
          }

          return next
        })
        setSelected((current) => {
          const visibleIds = new Set(
            students.map((student) => student.id),
          )

          return new Set(
            [...current].filter((id) => visibleIds.has(id)),
          )
        })
        setConflict(false)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setLoadError(
            err.message || 'Unable to load class attendance.',
          )
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [
      classId,
      date,
      session,
      search,
      statusFilter,
      page,
      limit,
    ],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadRoster({ signal: controller.signal })
    return () => controller.abort()
  }, [loadRoster])

  const loadHistory = useCallback(
    async (signal) => {
      if (!classId) {
        setHistory([])
        setHistoryLoading(false)
        return
      }

      setHistoryLoading(true)

      try {
        const result = await apiRequest(
          `/api/v1/attendance${buildQuery({
            classId,
            limit: 5,
            summaryOnly: 'true',
          })}`,
          { signal },
        )

        if (!signal?.aborted) {
          setHistory(
            Array.isArray(result.data) ? result.data : [],
          )
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setHistory([])
        }
      } finally {
        if (!signal?.aborted) setHistoryLoading(false)
      }
    },
    [classId],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadHistory(controller.signal)
    return () => controller.abort()
  }, [loadHistory, historyKey])

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined

    function handleBeforeUnload(event) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () =>
      window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined

    function handleNavigation(event) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const anchor = event.target.closest?.('a[href]')

      if (!anchor || anchor.target === '_blank') return

      const destination = new URL(anchor.href, window.location.href)

      if (destination.origin !== window.location.origin) return

      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return
      }

      if (
        !window.confirm(
          'You have unsaved attendance changes. Leave this page and discard them?',
        )
      ) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    document.addEventListener('click', handleNavigation, true)
    return () =>
      document.removeEventListener('click', handleNavigation, true)
  }, [hasUnsavedChanges])

  function closeDialog() {
    if (dialog?.busy) return
    dialog?.onCancel?.()
    setDialog(null)
  }

  function applyContext(next) {
    if (Object.prototype.hasOwnProperty.call(next, 'classId')) {
      setClassId(next.classId)
      setSearchInput('')
      setSearch('')
      setStatusFilter('')
    }

    if (Object.prototype.hasOwnProperty.call(next, 'date')) {
      setDate(next.date)
    }

    if (Object.prototype.hasOwnProperty.call(next, 'session')) {
      setSession(next.session)
      setSessionDraft(next.session)
    }

    setPage(1)
    setSelected(new Set())
    setEdits({})
    setSavedMap({})
    setRoster([])
    setSummary(defaultSummary())
    setSessionInfo(defaultSession())
    setPagination(null)
    setLoadError('')
    setSaveError('')
    setNotice('')
    setConflict(false)
  }

  function requestContextChange(next) {
    if (hasUnsavedChanges) {
      setDialog({
        title: 'Discard unsaved attendance changes?',
        description:
          'Changing the class, date, or session will clear every unsaved change in this workspace.',
        confirmLabel: 'Discard and continue',
        tone: 'danger',
        onCancel: () => {
          setSessionDraft(session)
        },
        onConfirm: () => {
          setDialog(null)
          applyContext(next)
        },
      })
      return
    }

    applyContext(next)
  }

  function changeClass(nextClassId) {
    if (nextClassId === classId) return
    requestContextChange({ classId: nextClassId })
  }

  function changeDate(nextDate) {
    if (!nextDate || nextDate === date) return
    requestContextChange({ date: nextDate })
  }

  function commitSession() {
    const nextSession = sessionDraft.trim() || 'full-day'
    setSessionDraft(nextSession)

    if (nextSession === session) return

    requestContextChange({ session: nextSession })
  }

  function changeStatusFilter(nextStatus) {
    setStatusFilter(nextStatus)
    setPage(1)
    setSelected(new Set())
  }

  function changePageSize(nextLimit) {
    setLimit(nextLimit)
    setPage(1)
    setSelected(new Set())
  }

  function goToPage(nextPage) {
    const pages = pagination?.pages || 1
    const target = Math.min(Math.max(nextPage, 1), pages)

    if (target === page) return

    setPage(target)
    setSelected(new Set())
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setStatusFilter('')
    setPage(1)
    setSelected(new Set())
  }

  function baselineFor(studentId) {
    const saved = savedMap[studentId]

    return {
      status: saved?.status || null,
      note: saved?.note || '',
    }
  }

  function setStudentStatus(student, status) {
    setEdits((current) => {
      const base = baselineFor(student.id)
      const existing = current[student.id] || base
      const next = {
        status,
        note: existing.note || '',
      }
      const copy = { ...current }

      if (
        next.status === base.status &&
        next.note === (base.note || '')
      ) {
        delete copy[student.id]
      } else {
        copy[student.id] = next
      }

      return copy
    })
    setSaveError('')
    setNotice('')
  }

  function setStudentNote(student, note) {
    setEdits((current) => {
      const base = baselineFor(student.id)
      const existing = current[student.id] || base

      if (!existing.status) return current

      const next = {
        status: existing.status,
        note,
      }
      const copy = { ...current }

      if (
        next.status === base.status &&
        (next.note || '') === (base.note || '')
      ) {
        delete copy[student.id]
      } else {
        copy[student.id] = next
      }

      return copy
    })
    setSaveError('')
    setNotice('')
  }

  function applyStatusToStudents(studentIds, status) {
    setEdits((current) => {
      const copy = { ...current }

      for (const studentId of studentIds) {
        const base = baselineFor(studentId)
        const existing = copy[studentId] || base
        const next = {
          status,
          note: existing.note || '',
        }

        if (
          next.status === base.status &&
          next.note === (base.note || '')
        ) {
          delete copy[studentId]
        } else {
          copy[studentId] = next
        }
      }

      return copy
    })
    setSaveError('')
    setNotice('')
  }

  function toggleSelected(studentId) {
    setSelected((current) => {
      const next = new Set(current)

      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)

      return next
    })
  }

  function toggleAllRows() {
    setSelected((current) => {
      const allSelected =
        rows.length > 0 &&
        rows.every((row) => current.has(row.id))

      return allSelected
        ? new Set()
        : new Set(rows.map((row) => row.id))
    })
  }

  function replacementCount(studentIds, status) {
    return studentIds.filter((studentId) => {
      const base = baselineFor(studentId)
      const existing = edits[studentId] || base

      return Boolean(base.status) && existing.status !== status
    }).length
  }

  function requestBulkStatus(status) {
    const studentIds = [...selected]

    if (studentIds.length === 0) return

    const label = attendanceStatusOption(status).label
    const replacing = replacementCount(studentIds, status)

    if (replacing > 0) {
      setDialog({
        title: `Replace saved status for ${replacing} students?`,
        description: `${studentIds.length} selected students will be marked ${label}. ${replacing} already have a saved status that will be replaced when you save these changes.`,
        confirmLabel: `Mark ${label}`,
        onConfirm: () => {
          applyStatusToStudents(studentIds, status)
          setDialog(null)
          setNotice(
            `${studentIds.length} selected students marked ${label}. Save changes to apply them.`,
          )
        },
      })
      return
    }

    applyStatusToStudents(studentIds, status)
    setNotice(
      `${studentIds.length} selected students marked ${label}. Save changes to apply them.`,
    )
  }

  function requestPagePresent() {
    const studentIds = rows.map((row) => row.id)

    if (studentIds.length === 0) return

    const replacing = replacementCount(studentIds, 'present')

    if (replacing > 0) {
      setDialog({
        title: 'Replace saved status on this page?',
        description: `${replacing} students on this page already have a saved status. Marking the page Present will replace those values when you save.`,
        confirmLabel: 'Mark page present',
        onConfirm: () => {
          applyStatusToStudents(studentIds, 'present')
          setDialog(null)
          setNotice(
            `${studentIds.length} students on this page marked Present. Save changes to apply them.`,
          )
        },
      })
      return
    }

    applyStatusToStudents(studentIds, 'present')
    setNotice(
      `${studentIds.length} students on this page marked Present. Save changes to apply them.`,
    )
  }

  function discardChanges() {
    setDialog({
      title: 'Discard unsaved changes?',
      description:
        'All unsaved attendance changes in this workspace will be removed.',
      confirmLabel: 'Discard changes',
      tone: 'danger',
      onConfirm: () => {
        setEdits({})
        setSelected(new Set())
        setSaveError('')
        setConflict(false)
        setNotice('Unsaved attendance changes were discarded.')
        setDialog(null)
      },
    })
  }

  function requestClassAction(onlyUnmarked) {
    if (hasUnsavedChanges) {
      setSaveError(
        'Save or discard unsaved changes before applying a class-wide action.',
      )
      return
    }

    const affected = onlyUnmarked ? summary.unmarked : summary.total

    if (affected === 0) {
      setNotice(
        onlyUnmarked
          ? 'All active students already have a saved status for this session.'
          : 'There are no active students to mark in this class.',
      )
      return
    }

    setDialog({
      title: onlyUnmarked
        ? 'Mark all unmarked students present?'
        : 'Mark the entire class present?',
      description: onlyUnmarked
        ? `This saves Present immediately for ${affected} unmarked students in the selected session. Existing saved records will not be changed.`
        : `This saves Present immediately for all ${affected} active students in this class. Existing saved statuses will be replaced. Existing notes are preserved.`,
      confirmLabel: onlyUnmarked
        ? 'Mark unmarked present'
        : 'Mark entire class present',
      tone: onlyUnmarked ? 'default' : 'danger',
      busy: false,
      onConfirm: async () => {
        setDialog((current) =>
          current ? { ...current, busy: true } : current,
        )
        setSaveError('')
        setNotice('')

        try {
          const result = await apiRequest(
            '/api/v1/attendance/class-action',
            {
              method: 'POST',
              body: {
                classId,
                date,
                session,
                status: 'present',
                onlyUnmarked,
                expectedRevision: sessionInfo.revision || 0,
              },
            },
          )

          const data = result.data || {}

          if (data.summary) {
            setSummary(normalizeSummary(data.summary))
          }

          if (data.session) {
            setSessionInfo(normalizeSession(data.session))
          }

          setEdits({})
          setSelected(new Set())
          setConflict(false)
          setNotice(
            result.message || 'Class attendance updated successfully.',
          )
          setHistoryKey((key) => key + 1)
          setDialog(null)
          await loadRoster({ background: true })
        } catch (err) {
          setDialog(null)
          setSaveError(
            err.message || 'Unable to update class attendance.',
          )

          if (err.code === 'ATTENDANCE_CONFLICT') {
            setConflict(true)
          }
        }
      },
    })
  }

  async function saveChanges() {
    if (!hasUnsavedChanges || saving) return

    const editEntries = Object.entries(edits).map(
      ([studentId, edit]) => ({
        studentId,
        status: edit.status,
        note: edit.note || '',
      }),
    )

    if (editEntries.length === 0) return

    setSaving(true)
    setSaveError('')
    setNotice('')
    setConflict(false)

    const batches = chunk(editEntries, SAVE_BATCH_SIZE)
    const savedMapSnapshot = { ...savedMap }
    const allSavedRecords = []
    const failedBatches = []
    let revision = sessionInfo.revision || 0
    let lastSession = null
    let firstError = null

    try {
      for (const [batchIndex, batch] of batches.entries()) {
        try {
          const result = await apiRequest(
            '/api/v1/attendance/batch',
            {
              method: 'PATCH',
              body: {
                classId,
                date,
                session,
                expectedRevision: revision,
                records: batch,
              },
            },
          )

          const data = result.data || {}
          const nextRevision = Number(data.revision)

          revision = Number.isInteger(nextRevision)
            ? nextRevision
            : revision + 1
          lastSession = data.session || lastSession

          const records = Array.isArray(data.records)
            ? data.records
            : []

          for (const record of records) {
            allSavedRecords.push({
              studentId: studentIdFromRecord(record),
              status: record.status,
              note: record.note || '',
            })
          }
        } catch (err) {
          firstError = err
          failedBatches.push({
            batchIndex,
            records: batch,
            error: err,
          })

          if (err.code === 'ATTENDANCE_CONFLICT') {
            setConflict(true)
          }

          break
        }
      }

      if (allSavedRecords.length > 0) {
        setSavedMap((current) => {
          const next = { ...current }

          for (const record of allSavedRecords) {
            next[record.studentId] = {
              status: record.status,
              note: record.note,
              saved: true,
            }
          }

          return next
        })

        setSummary((current) => {
          const counts = { ...current.counts }
          let marked = current.marked
          let unmarked = current.unmarked
          const snapshot = { ...savedMapSnapshot }

          for (const record of allSavedRecords) {
            const base = snapshot[record.studentId]
            const baseStatus = base?.status || null
            const nextStatus = record.status || null

            if (baseStatus && counts[baseStatus] !== undefined) {
              counts[baseStatus] = Math.max(
                counts[baseStatus] - 1,
                0,
              )
              marked -= 1
            }

            if (nextStatus && counts[nextStatus] !== undefined) {
              counts[nextStatus] += 1
              marked += 1
            }

            if (!baseStatus && nextStatus) unmarked -= 1
            if (baseStatus && !nextStatus) unmarked += 1

            snapshot[record.studentId] = {
              status: nextStatus,
              note: record.note || '',
            }
          }

          return {
            ...current,
            counts,
            marked: Math.max(marked, 0),
            unmarked: Math.max(unmarked, 0),
          }
        })

        setEdits((current) => {
          const next = { ...current }

          for (const record of allSavedRecords) {
            const pending = next[record.studentId]

            if (
              pending &&
              pending.status === record.status &&
              (pending.note || '') === (record.note || '')
            ) {
              delete next[record.studentId]
            }
          }

          return next
        })

        setSessionInfo((current) => ({
          ...current,
          ...(lastSession || {}),
          revision,
        }))
        setHistoryKey((key) => key + 1)
      }
    } finally {
      setSaving(false)
    }

    const failedCount = failedBatches.reduce(
      (total, batch) => total + batch.records.length,
      0,
    )

    if (failedBatches.length > 0) {
      setSaveError(
        `${allSavedRecords.length} ${
          allSavedRecords.length === 1 ? 'record was' : 'records were'
        } saved. ${failedCount} ${
          failedCount === 1 ? 'change is' : 'changes are'
        } still unsaved.${
          firstError?.message ? ` ${firstError.message}` : ''
        }`,
      )
    } else {
      setNotice(
        `${allSavedRecords.length} ${
          allSavedRecords.length === 1
            ? 'attendance update was'
            : 'attendance updates were'
        } saved successfully.`,
      )
    }
  }

  function openSavedSession(nextDate, nextSession) {
    requestContextChange({
      date: nextDate,
      session: nextSession,
    })
  }

  const rows = roster.map((student) => {
    const saved = savedMap[student.id]
    const base = {
      status: saved?.status || student.status || null,
      note: saved?.note ?? student.note ?? '',
    }
    const edit = edits[student.id]

    return {
      ...student,
      status: edit ? edit.status : base.status,
      note: edit ? edit.note : base.note,
      saved: Boolean(base.status),
      dirty: Boolean(edit),
    }
  })

  const effectiveSummary = useMemo(() => {
    const counts = { ...summary.counts }
    let marked = summary.marked
    let unmarked = summary.unmarked

    for (const [studentId, edit] of Object.entries(edits)) {
      const base = savedMap[studentId]
      const baseStatus = base?.status || null
      const nextStatus = edit.status || null

      if (baseStatus && counts[baseStatus] !== undefined) {
        counts[baseStatus] = Math.max(counts[baseStatus] - 1, 0)
        marked -= 1
      }

      if (nextStatus && counts[nextStatus] !== undefined) {
        counts[nextStatus] += 1
        marked += 1
      }

      if (!baseStatus && nextStatus) unmarked -= 1
      if (baseStatus && !nextStatus) unmarked += 1
    }

    return {
      counts,
      total: summary.total,
      marked: Math.max(marked, 0),
      unmarked: Math.max(unmarked, 0),
    }
  }, [summary, edits, savedMap])

  const disabled = loading || saving
  const filtered =
    Boolean(search) || Boolean(statusFilter)
  const start =
    pagination && pagination.total > 0
      ? (page - 1) * limit + 1
      : 0
  const end = pagination
    ? Math.min(page * limit, pagination.total)
    : 0

  return (
    <DashboardLayout
      title="Attendance"
      description="Mark and review class attendance."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-3.5">
        <PageHeader
          eyebrow="Classroom records"
          title="Attendance"
          description="Choose a class, date, and session. Search and filter the roster, then save changes in safe batches."
        />

        {loadError && (
          <Notice
            tone="red"
            action={
              <button
                type="button"
                onClick={() => loadRoster({ background: true })}
                disabled={loading || refreshing || !classId}
                className={buttonSecondary}
              >
                Try again
              </button>
            }
          >
            {loadError}
          </Notice>
        )}

        {notice && <Notice tone="green">{notice}</Notice>}

        {saveError && (
          <Notice
            tone="red"
            action={
              conflict ? (
                <button
                  type="button"
                  onClick={() => {
                    setSaveError('')
                    setConflict(false)
                    loadRoster({ background: true })
                  }}
                  disabled={loading || refreshing}
                  className={buttonSecondary}
                >
                  Reload latest
                </button>
              ) : null
            }
          >
            {saveError}
          </Notice>
        )}

        {classesLoading && !classId ? (
          <LoadingState label="Loading classes..." />
        ) : classes.length === 0 ? (
          <EmptyState
            title="No classes available"
            description="Ask an administrator to create a class and assign it to you first."
            icon={ClipboardList}
          />
        ) : (
          <>
            <AttendanceToolbar
              classes={classes}
              classId={classId}
              date={date}
              sessionDraft={sessionDraft}
              search={searchInput}
              statusFilter={statusFilter}
              loading={loading}
              refreshing={refreshing}
              disabled={saving}
              onClassChange={changeClass}
              onDateChange={changeDate}
              onSessionChange={setSessionDraft}
              onSessionCommit={commitSession}
              onSearchChange={setSearchInput}
              onStatusChange={changeStatusFilter}
              onRefresh={() => loadRoster({ background: true })}
            />

            {!classId ? (
              <EmptyState
                title="Choose a class"
                description="Select a class to load its active students and attendance record."
                icon={ClipboardList}
              />
            ) : (
              <>
                <AttendanceSummary
                  summary={effectiveSummary}
                  unsavedCount={Object.keys(edits).length}
                  sessionInfo={sessionInfo}
                  loading={loading && roster.length === 0}
                />

                <section
                  className={`${cardClass} p-3`}
                  aria-label="Attendance actions"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <ClipboardList
                          className="h-3.5 w-3.5 text-slate-500"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {classLabel(selectedClass)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatDateLong(date)} ·{' '}
                        <span className="capitalize">{session}</span> ·{' '}
                        {loading
                          ? 'Loading roster…'
                          : `${effectiveSummary.total} active students`}
                      </p>
                      {hasUnsavedChanges && (
                        <p className="mt-1 text-[11px] font-medium text-amber-800">
                          Save or discard changes before using class-wide
                          actions.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={requestPagePresent}
                        disabled={
                          disabled ||
                          loading ||
                          rows.length === 0
                        }
                        className={`${buttonSecondary} h-9 min-h-9 px-3 text-xs`}
                        title="Marks every student on the current page as Present. Changes remain unsaved until you save."
                      >
                        <CheckCheck
                          className="mr-1 h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        Mark page present
                      </button>

                      <button
                        type="button"
                        onClick={() => requestClassAction(true)}
                        disabled={
                          disabled ||
                          loading ||
                          hasUnsavedChanges ||
                          effectiveSummary.unmarked === 0
                        }
                        className={`${buttonSecondary} h-9 min-h-9 px-3 text-xs`}
                        title="Saves Present immediately for all unmarked students in the selected session."
                      >
                        <ListChecks
                          className="mr-1 h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        Mark unmarked present
                      </button>

                      <button
                        type="button"
                        onClick={() => requestClassAction(false)}
                        disabled={
                          disabled ||
                          loading ||
                          hasUnsavedChanges ||
                          effectiveSummary.total === 0
                        }
                        className={`${buttonDanger} h-9 min-h-9 px-3 text-xs`}
                        title="Saves Present immediately for every active student in the class and replaces existing statuses."
                      >
                        <Users
                          className="mr-1 h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        Mark class present
                      </button>

                      {hasUnsavedChanges && (
                        <button
                          type="button"
                          onClick={discardChanges}
                          disabled={disabled}
                          className={`${buttonSecondary} h-9 min-h-9 px-3 text-xs`}
                        >
                          <RotateCcw
                            className="mr-1 h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Discard
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={saveChanges}
                        disabled={
                          !hasUnsavedChanges || disabled || loading
                        }
                        className={`${buttonPrimary} h-9 min-h-9 px-3 text-xs`}
                      >
                        {saving ? (
                          <Loader2
                            className="mr-1 h-3.5 w-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Save
                            className="mr-1 h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        )}
                        {saving
                          ? 'Saving…'
                          : hasUnsavedChanges
                            ? `Save ${Object.keys(edits).length} ${
                                Object.keys(edits).length === 1
                                  ? 'change'
                                  : 'changes'
                              }`
                            : 'Save changes'}
                      </button>
                    </div>
                  </div>
                </section>

                {selected.size > 0 && (
                  <section
                    className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    aria-label="Bulk actions for selected students"
                  >
                    <p className="text-xs font-semibold text-blue-950">
                      {selected.size} selected on this page
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-blue-900/70">
                        Mark selected as
                      </span>
                      {attendanceStatusOptions.map((option) => {
                        const Icon = option.icon

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => requestBulkStatus(option.value)}
                            disabled={disabled}
                            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:opacity-50 ${option.idle}`}
                          >
                            <Icon
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            {option.label}
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => setSelected(new Set())}
                        className="inline-flex h-8 items-center rounded-lg px-2 text-[11px] font-semibold text-blue-900 hover:bg-blue-100"
                      >
                        Clear selection
                      </button>
                    </div>
                  </section>
                )}

                {loading && roster.length === 0 ? (
                  <TableSkeleton />
                ) : rows.length === 0 ? (
                  <EmptyState
                    title={
                      filtered
                        ? 'No students match these filters'
                        : 'No active students in this class'
                    }
                    description={
                      filtered
                        ? 'Try a different name, roll number, status filter, or clear the filters.'
                        : 'Add active students to this class before marking attendance.'
                    }
                    icon={SearchX}
                    action={
                      filtered ? (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className={buttonSecondary}
                        >
                          Clear filters
                        </button>
                      ) : null
                    }
                  />
                ) : (
                  <AttendanceTable
                    rows={rows}
                    selected={selected}
                    disabled={disabled}
                    onToggleSelect={toggleSelected}
                    onToggleAll={toggleAllRows}
                    onStatusChange={setStudentStatus}
                    onNoteChange={setStudentNote}
                  />
                )}

                {pagination && pagination.total > 0 && (
                  <section
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    aria-label="Attendance pagination"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p>
                        Showing{' '}
                        <span className="font-semibold text-slate-900">
                          {start}–{end}
                        </span>{' '}
                        of{' '}
                        <span className="font-semibold text-slate-900">
                          {pagination.total}
                        </span>{' '}
                        students
                      </p>
                      <label className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">
                          Rows
                        </span>
                        <select
                          value={limit}
                          onChange={(event) =>
                            changePageSize(
                              Number(event.target.value),
                            )
                          }
                          disabled={disabled}
                          className="h-7 rounded-md border border-slate-300 bg-white px-1.5 text-xs outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                          aria-label="Rows per page"
                        >
                          {PAGE_SIZES.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => goToPage(page - 1)}
                        disabled={disabled || page <= 1}
                        className={`${buttonSecondary} h-8 min-h-8 px-2.5 text-xs`}
                      >
                        <ChevronLeft
                          className="mr-0.5 h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        Previous
                      </button>
                      <span className="px-1 text-[11px] font-semibold text-slate-700">
                        Page {pagination.page} of {pagination.pages}
                      </span>
                      <button
                        type="button"
                        onClick={() => goToPage(page + 1)}
                        disabled={
                          disabled || page >= (pagination.pages || 1)
                        }
                        className={`${buttonSecondary} h-8 min-h-8 px-2.5 text-xs`}
                      >
                        Next
                        <ChevronRight
                          className="ml-0.5 h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </section>
                )}

                <RecentSessions
                  records={history}
                  loading={historyLoading}
                  date={date}
                  session={session}
                  disabled={disabled || hasUnsavedChanges}
                  onSelect={openSavedSession}
                />
              </>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(dialog)}
        title={dialog?.title}
        description={dialog?.description}
        confirmLabel={dialog?.confirmLabel}
        tone={dialog?.tone}
        busy={Boolean(dialog?.busy)}
        onConfirm={() => dialog?.onConfirm?.()}
        onCancel={closeDialog}
      />
    </DashboardLayout>
  )
}

export default function AttendancePage() {
  const { user, logout } = useAuth()

  if (user?.role === 'student') {
    return <StudentAttendanceView user={user} logout={logout} />
  }

  return <StaffAttendanceView user={user} logout={logout} />
}
