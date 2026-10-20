import { useCallback, useEffect, useState } from 'react'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import {
  Badge,
  buttonSecondary,
  cardClass,
  EmptyState,
  ErrorState,
  inputClass,
  LoadingState,
  PageHeader,
  StatCard,
} from '../components/common/DashboardUI.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest, buildQuery } from '../lib/api.js'

export default function TeacherStudents() {
  const { user, logout } = useAuth()
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [students, setStudents] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          setError(err.message || 'Unable to load classes.')
        }
      })

    return () => controller.abort()
  }, [])

  const loadStudents = useCallback(
    async (signal) => {
      if (!classId) {
        setStudents([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const result = await apiRequest(
          `/api/v1/teacher/students${buildQuery({
            classId,
            search: appliedSearch,
            status: 'active',
            limit: 100,
          })}`,
          { signal },
        )
        setStudents(Array.isArray(result.data) ? result.data : [])
        setPagination(result.pagination || null)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load your students.')
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [classId, appliedSearch],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadStudents(controller.signal)
    return () => controller.abort()
  }, [loadStudents])

  function applySearch(event) {
    event.preventDefault()
    setAppliedSearch(search.trim())
  }

  const selectedClass = classes.find((item) => item.id === classId)

  return (
    <DashboardLayout
      title="My Students"
      description="Students in your assigned classes."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Assigned classes"
          title="My students"
          description="View active students in the classes assigned to you."
        />

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <section className={`${cardClass} p-4 sm:p-5`}>
          <form
            onSubmit={applySearch}
            className="grid gap-3 sm:grid-cols-[220px_1fr_auto]"
          >
            <label className="block text-sm font-semibold text-slate-700">
              Class
              <select
                value={classId}
                onChange={(event) => {
                  setClassId(event.target.value)
                  setSearch('')
                  setAppliedSearch('')
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
              Search
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email, or roll number"
                className={`${inputClass} mt-2`}
              />
            </label>

            <div className="flex items-end">
              <button type="submit" className={`${buttonSecondary} w-full`}>
                Search
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Active students"
            value={students.length}
            icon="♙"
            hint="In the selected class"
          />
          <StatCard
            label="Selected class"
            value={
              selectedClass
                ? [selectedClass.name, selectedClass.section]
                    .filter(Boolean)
                    .join(' - ')
                : '—'
            }
            icon="▤"
            hint="Your assigned class"
          />
          <StatCard
            label="Assigned classes"
            value={classes.length}
            icon="♧"
            hint="Across the institute"
          />
        </section>

        {classes.length === 0 && !loading ? (
          <EmptyState
            title="No classes assigned"
            description="An administrator needs to assign a class to your teacher account."
            icon="▤"
          />
        ) : loading ? (
          <LoadingState label="Loading students..." />
        ) : error && students.length === 0 ? (
          <ErrorState message={error} onRetry={() => loadStudents()} />
        ) : students.length === 0 ? (
          <EmptyState
            title="No students found"
            description={
              appliedSearch
                ? 'No active students match this search in the selected class.'
                : 'This class has no active students yet.'
            }
            icon="♙"
          />
        ) : (
          <section className={`${cardClass} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Roll number</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Guardian</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {student.name}
                        </p>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {student.email}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {student.rollNumber || '—'}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {student.phone || '—'}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {student.guardianName || '—'}
                        {student.guardianPhone && (
                          <p className="mt-1 text-xs text-slate-500">
                            {student.guardianPhone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone="green">{student.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.total > students.length && (
              <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                Showing {students.length} of {pagination.total} students.
              </p>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}
