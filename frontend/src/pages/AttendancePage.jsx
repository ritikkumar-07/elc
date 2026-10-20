import { useCallback, useEffect, useMemo, useState } from 'react'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import {
  Badge,
  buttonPrimary,
  buttonSecondary,
  cardClass,
  EmptyState,
  inputClass,
  LoadingState,
  Notice,
  PageHeader,
  StatCard,
} from '../components/common/DashboardUI.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest, buildQuery } from '../lib/api.js'

const statuses = [
  ['present', 'Present'],
  ['absent', 'Absent'],
  ['late', 'Late'],
  ['excused', 'Excused'],
]

function today() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
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

function studentId(record) {
  return record.student?.id || record.student?._id || record.student
}

export default function AttendancePage() {
  const { user, logout } = useAuth()
  const isStudent = user?.role === 'student'
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(today())
  const [session, setSession] = useState('full-day')
  const [students, setStudents] = useState([])
  const [statusesByStudent, setStatusesByStudent] = useState({})
  const [notesByStudent, setNotesByStudent] = useState({})
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    apiRequest('/api/v1/academics/classes', {
      signal: controller.signal,
    })
      .then((result) => {
        const list = Array.isArray(result.data) ? result.data : []
        setClasses(list)
        if (!isStudent && list.length > 0) {
          setClassId((current) => current || list[0].id)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load classes.')
        }
      })

    return () => controller.abort()
  }, [isStudent])

  const loadStudentAttendance = useCallback(async (signal) => {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest(
        '/api/v1/attendance/me?limit=100',
        { signal },
      )
      setRecords(Array.isArray(result.data) ? result.data : [])
      setSummary(result.summary || null)
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Unable to load attendance.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isStudent) return undefined

    const controller = new AbortController()
    loadStudentAttendance(controller.signal)
    return () => controller.abort()
  }, [isStudent, loadStudentAttendance])

  const loadClassAttendance = useCallback(
    async (signal) => {
      if (!classId) {
        setStudents([])
        setStatusesByStudent({})
        setNotesByStudent({})
        setRecords([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      setNotice('')

      try {
        const studentPath =
          user.role === 'teacher'
            ? `/api/v1/teacher/students${buildQuery({
                classId,
                status: 'active',
                limit: 100,
              })}`
            : `/api/v1/students${buildQuery({
                classId,
                status: 'active',
                limit: 100,
              })}`

        const [studentResult, attendanceResult] = await Promise.all([
          apiRequest(studentPath, { signal }),
          apiRequest(
            `/api/v1/attendance${buildQuery({
              classId,
              from: date,
              to: date,
              limit: 50,
            })}`,
            { signal },
          ),
        ])

        const studentList = Array.isArray(studentResult.data)
          ? studentResult.data
          : []

        const existing = (attendanceResult.data || []).find(
          (item) => item.session === session,
        )

        const nextStatuses = {}
        const nextNotes = {}

        for (const student of studentList) {
          const saved = existing?.records?.find(
            (record) => String(studentId(record)) === String(student.id),
          )

          nextStatuses[student.id] = saved?.status || 'present'
          nextNotes[student.id] = saved?.note || ''
        }

        setStudents(studentList)
        setStatusesByStudent(nextStatuses)
        setNotesByStudent(nextNotes)
        setRecords(
          Array.isArray(attendanceResult.data)
            ? attendanceResult.data
            : [],
        )

        if (existing) {
          setNotice('Existing attendance loaded for this session.')
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load class attendance.')
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [classId, date, session, user.role],
  )

  useEffect(() => {
    if (isStudent) return undefined

    const controller = new AbortController()
    loadClassAttendance(controller.signal)
    return () => controller.abort()
  }, [isStudent, loadClassAttendance])

  const counts = useMemo(() => {
    return students.reduce(
      (total, student) => {
        const status = statusesByStudent[student.id] || 'present'
        total[status] = (total[status] || 0) + 1
        return total
      },
      { present: 0, absent: 0, late: 0, excused: 0 },
    )
  }, [students, statusesByStudent])

  async function saveAttendance(event) {
    event.preventDefault()

    if (students.length === 0) {
      setError('There are no active students to mark in this class.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      await apiRequest('/api/v1/attendance', {
        method: 'PUT',
        body: {
          classId,
          date,
          session,
          records: students.map((student) => ({
            studentId: student.id,
            status: statusesByStudent[student.id] || 'present',
            note: notesByStudent[student.id] || '',
          })),
        },
      })

      await loadClassAttendance()
      setNotice('Attendance saved successfully.')
    } catch (err) {
      setError(err.message || 'Unable to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  if (isStudent) {
    return (
      <DashboardLayout
        title="Attendance"
        description="Review your attendance record."
        user={user}
        onLogout={logout}
      >
        <div className="space-y-6">
          <PageHeader
            eyebrow="My record"
            title="Attendance"
            description="Attendance is marked by your teachers. Contact the institute if a record looks incorrect."
          />

          {error && <Notice tone="red">{error}</Notice>}

          {loading ? (
            <LoadingState label="Loading attendance..." />
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  label="Attendance"
                  value={
                    summary?.percentage != null
                      ? `${summary.percentage}%`
                      : '—'
                  }
                  icon="◷"
                  hint="Across recorded days"
                />
                {statuses.map(([value, label]) => (
                  <StatCard
                    key={value}
                    label={label}
                    value={summary?.[value] ?? 0}
                    icon="•"
                    hint="Recorded days"
                  />
                ))}
              </section>

              {records.length === 0 ? (
                <EmptyState
                  title="No attendance recorded yet"
                  description="Your attendance history will appear after your teacher marks a session."
                  icon="◷"
                />
              ) : (
                <section className={`${cardClass} overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Session</th>
                          <th className="px-4 py-3 font-semibold">Class</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {records.map((record) => {
                          const mine = record.records?.[0]
                          return (
                            <tr key={record.id}>
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {record.date}
                              </td>
                              <td className="px-4 py-3 capitalize text-slate-600">
                                {record.session}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {record.class
                                  ? [
                                      record.class.name,
                                      record.class.section,
                                    ]
                                      .filter(Boolean)
                                      .join(' - ')
                                  : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  tone={statusTone(mine?.status)}
                                >
                                  {mine?.status || '—'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {mine?.note || '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Attendance"
      description="Mark and review class attendance."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Classroom records"
          title="Attendance"
          description="Choose a class and session, review every student, and save the attendance record."
        />

        {error && <Notice tone="red">{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}

        <section className={`${cardClass} p-4 sm:p-5`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm font-semibold text-slate-700">
              Class
              <select
                value={classId}
                onChange={(event) => {
                  setClassId(event.target.value)
                  setNotice('')
                }}
                className={`${inputClass} mt-2`}
              >
                <option value="">Select a class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label ||
                      [item.name, item.section].filter(Boolean).join(' - ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                  setNotice('')
                }}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Session
              <input
                value={session}
                onChange={(event) => {
                  setSession(event.target.value)
                  setNotice('')
                }}
                placeholder="full-day"
                className={`${inputClass} mt-2`}
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => loadClassAttendance()}
                disabled={loading || !classId}
                className={`${buttonSecondary} w-full`}
              >
                {loading ? 'Loading...' : 'Reload'}
              </button>
            </div>
          </div>
        </section>

        {classes.length === 0 && !loading ? (
          <EmptyState
            title="No classes available"
            description="Ask an administrator to create a class and assign it to you first."
            icon="▤"
          />
        ) : loading ? (
          <LoadingState label="Loading attendance..." />
        ) : !classId ? (
          <EmptyState
            title="Choose a class"
            description="Select a class to load its active students and attendance record."
            icon="◷"
          />
        ) : students.length === 0 ? (
          <EmptyState
            title="No active students in this class"
            description="Add students to this class before marking attendance."
            icon="♙"
          />
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statuses.map(([value, label]) => (
                <StatCard
                  key={value}
                  label={label}
                  value={counts[value] || 0}
                  icon="•"
                  hint="Students in this session"
                />
              ))}
            </section>

            <form onSubmit={saveAttendance} className="space-y-4">
              <section className={`${cardClass} overflow-hidden`}>
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Mark attendance
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    New sessions default to present. Review each student before saving.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Student</th>
                        <th className="px-4 py-3 font-semibold">Roll number</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {student.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {student.email}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {student.rollNumber || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={
                                statusesByStudent[student.id] || 'present'
                              }
                              onChange={(event) =>
                                setStatusesByStudent((current) => ({
                                  ...current,
                                  [student.id]: event.target.value,
                                }))
                              }
                              className={inputClass}
                              aria-label={`Attendance status for ${student.name}`}
                            >
                              {statuses.map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={notesByStudent[student.id] || ''}
                              onChange={(event) =>
                                setNotesByStudent((current) => ({
                                  ...current,
                                  [student.id]: event.target.value,
                                }))
                              }
                              maxLength={200}
                              placeholder="Optional note"
                              className={inputClass}
                              aria-label={`Note for ${student.name}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end border-t border-slate-200 px-4 py-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className={buttonPrimary}
                  >
                    {saving ? 'Saving attendance...' : 'Save attendance'}
                  </button>
                </div>
              </section>
            </form>

            <section className={`${cardClass} overflow-hidden`}>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-900">
                  Recent class records
                </h2>
              </div>

              {records.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">
                  No attendance has been saved for this class yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {records.slice(0, 10).map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {record.date} · {record.session}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {record.records?.length || 0} students marked
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {statuses.map(([value, label]) => (
                          <span
                            key={value}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                          >
                            {label}: {record.counts?.[value] ?? 0}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
