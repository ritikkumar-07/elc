import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import {
  Badge,
  buttonPrimary,
  buttonSecondary,
  cardClass,
  EmptyState,
  ErrorState,
  inputClass,
  LoadingState,
  Modal,
  Notice,
  PageHeader,
} from '../components/common/DashboardUI.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest, buildQuery } from '../lib/api.js'

const emptyForm = {
  title: '',
  description: '',
  classId: '',
  subjectId: '',
  maxMarks: '100',
  passingMarks: '',
  scheduledAt: '',
  status: 'draft',
}

function testClassId(test) {
  return test.class?.id || test.class?._id || test.class
}

function formatDate(value) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function statusTone(status) {
  return status === 'published'
    ? 'green'
    : status === 'closed'
      ? 'blue'
      : 'amber'
}

export default function TestManagement() {
  const { user, logout } = useAuth()
  const [tests, setTests] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [testModal, setTestModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [marksTest, setMarksTest] = useState(null)
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState({})
  const [marksLoading, setMarksLoading] = useState(false)
  const [marksSaving, setMarksSaving] = useState(false)
  const [marksError, setMarksError] = useState('')
  const [marksNotice, setMarksNotice] = useState('')
  const [marksDirty, setMarksDirty] = useState(false)
  const [marksSearch, setMarksSearch] = useState('')
  const [busyId, setBusyId] = useState('')

  const loadTests = useCallback(
    async (signal) => {
      setLoading(true)
      setError('')

      try {
        const result = await apiRequest(
          `/api/v1/tests${buildQuery({
            page,
            limit: 20,
            classId: classFilter,
            status: statusFilter,
            search: appliedSearch,
          })}`,
          { signal },
        )
        setTests(Array.isArray(result.data) ? result.data : [])
        setPagination(result.pagination || null)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load tests.')
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [page, classFilter, statusFilter, appliedSearch],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadTests(controller.signal)
    return () => controller.abort()
  }, [loadTests])

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      apiRequest('/api/v1/academics/classes', {
        signal: controller.signal,
      }),
      apiRequest('/api/v1/academics/subjects', {
        signal: controller.signal,
      }),
    ])
      .then(([classResult, subjectResult]) => {
        setClasses(
          Array.isArray(classResult.data) ? classResult.data : [],
        )
        setSubjects(
          Array.isArray(subjectResult.data)
            ? subjectResult.data
            : [],
        )
      })
      .catch(() => {})

    return () => controller.abort()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm({
      ...emptyForm,
      classId: classes[0]?.id || '',
    })
    setTestModal(true)
    setError('')
  }

  function openEdit(test) {
    setEditing(test)
    setForm({
      title: test.title || '',
      description: test.description || '',
      classId: testClassId(test) || '',
      subjectId: test.subject?.id || test.subject?._id || '',
      maxMarks: String(test.maxMarks || 100),
      passingMarks:
        test.passingMarks != null ? String(test.passingMarks) : '',
      scheduledAt: test.scheduledAt
        ? String(test.scheduledAt).slice(0, 10)
        : '',
      status: test.status || 'draft',
    })
    setTestModal(true)
    setError('')
  }

  async function saveTest(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        classId: form.classId,
        subjectId: form.subjectId,
        maxMarks: Number(form.maxMarks),
        passingMarks:
          form.passingMarks === '' ? null : Number(form.passingMarks),
        scheduledAt: form.scheduledAt || '',
        status: form.status,
      }

      if (editing) {
        await apiRequest(`/api/v1/tests/${editing.id}`, {
          method: 'PATCH',
          body: payload,
        })
        setNotice('Test updated successfully.')
      } else {
        await apiRequest('/api/v1/tests', {
          method: 'POST',
          body: payload,
        })
        setNotice('Test created successfully.')
      }

      setTestModal(false)
      setEditing(null)
      await loadTests()
    } catch (err) {
      setError(err.message || 'Unable to save the test.')
    } finally {
      setSaving(false)
    }
  }

  async function openMarks(test) {
    setMarksTest(test)
    setStudents([])
    setMarks({})
    setMarksError('')
    setMarksNotice('')
    setMarksDirty(false)
    setMarksSearch('')
    setMarksLoading(true)

    try {
      const classId = testClassId(test)
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

      const [marksResult, studentResult] = await Promise.all([
        apiRequest(`/api/v1/tests/${test.id}/marks`),
        apiRequest(studentPath),
      ])

      const loadedStudents = Array.isArray(studentResult.data)
        ? studentResult.data
        : []
      const existing = {}
      const markByStudent = new Map(
        (marksResult.data || []).map((mark) => [
          String(mark.student?.id || mark.student?._id || mark.student),
          mark,
        ]),
      )

      for (const student of loadedStudents) {
        const mark = markByStudent.get(String(student.id))

        if (!mark) {
          existing[student.id] = {
            assessmentStatus: 'not_entered',
            value: '',
          }
          continue
        }

        const assessmentStatus = mark.assessmentStatus || 'entered'
        existing[student.id] = {
          assessmentStatus,
          value:
            assessmentStatus === 'entered'
              ? String(mark.marksObtained ?? '')
              : '',
        }
      }

      setStudents(loadedStudents)
      setMarks(existing)
      setMarksDirty(false)
    } catch (err) {
      setMarksError(err.message || 'Unable to load marks.')
    } finally {
      setMarksLoading(false)
    }
  }

  async function saveMarks() {
    const entries = []
    const invalidStudent = students.find((student) => {
      const row = marks[student.id] || {}
      if (row.assessmentStatus !== 'entered') return false

      const value = String(row.value ?? '').trim()
      return (
        value === '' ||
        Number.isNaN(Number(value)) ||
        Number(value) < 0 ||
        Number(value) > marksTest.maxMarks
      )
    })

    if (invalidStudent) {
      setMarksError(
        `Enter a mark between 0 and ${marksTest.maxMarks} for ${invalidStudent.name}, or choose a non-scored status.`,
      )
      return
    }

    for (const student of students) {
      const row = marks[student.id] || {
        assessmentStatus: 'not_entered',
      }

      if (row.assessmentStatus === 'not_entered') {
        entries.push({ studentId: student.id, clear: true })
        continue
      }

      entries.push({
        studentId: student.id,
        assessmentStatus: row.assessmentStatus,
        marksObtained:
          row.assessmentStatus === 'entered'
            ? Number(row.value)
            : null,
      })
    }

    if (!marksDirty) {
      setMarksError('No mark changes to save.')
      return
    }

    setMarksSaving(true)
    setMarksError('')
    setMarksNotice('')

    try {
      await apiRequest(`/api/v1/tests/${marksTest.id}/marks`, {
        method: 'PUT',
        body: { marks: entries },
      })
      setMarksNotice('Draft marks saved.')
      setMarksDirty(false)
      await loadTests()
    } catch (err) {
      setMarksError(err.message || 'Unable to save marks.')
    } finally {
      setMarksSaving(false)
    }
  }

  function updateMark(studentId, patch) {
    setMarks((current) => ({
      ...current,
      [studentId]: {
        assessmentStatus:
          current[studentId]?.assessmentStatus || 'not_entered',
        value: current[studentId]?.value || '',
        ...patch,
      },
    }))
    setMarksDirty(true)
    setMarksNotice('')
  }

  function closeMarksModal() {
    if (marksSaving) return

    if (
      marksDirty &&
      !window.confirm('Discard unsaved mark changes?')
    ) {
      return
    }

    setMarksTest(null)
    setMarksError('')
    setMarksNotice('')
    setMarksDirty(false)
    setMarksSearch('')
  }

  async function publishResults(test) {
    if (
      !window.confirm(
        `Publish results for "${test.title}"? Students will see their marks immediately.`,
      )
    ) {
      return
    }

    setBusyId(test.id)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/api/v1/tests/${test.id}/publish`, {
        method: 'POST',
      })
      setNotice('Results published successfully.')
      await loadTests()
    } catch (err) {
      setError(err.message || 'Unable to publish results.')
    } finally {
      setBusyId('')
    }
  }

  async function unpublishResults(test) {
    if (
      !window.confirm(
        `Unpublish results for "${test.title}"? Marks will become editable drafts.`,
      )
    ) {
      return
    }

    setBusyId(test.id)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/api/v1/tests/${test.id}/unpublish`, {
        method: 'POST',
      })
      setNotice('Results unpublished. Marks can now be edited.')
      await loadTests()
    } catch (err) {
      setError(err.message || 'Unable to unpublish results.')
    } finally {
      setBusyId('')
    }
  }

  function applyFilters(event) {
    event.preventDefault()
    setPage(1)
    setAppliedSearch(search.trim())
  }

  const formSubjects = subjects.filter(
    (item) =>
      String(item.class?.id || item.class?._id || item.class) ===
      String(form.classId),
  )

  const resultsPath =
    user?.role === 'teacher' ? '/teacher/results' : '/admin/results'
  const marksReadOnly = Boolean(marksTest?.resultsPublishedAt)
  const marksPassing = marksTest
    ? marksTest.passingMarks ??
      Math.round(marksTest.maxMarks * 0.33 * 100) / 100
    : null
  const filteredStudents = students.filter((student) => {
    const term = marksSearch.trim().toLowerCase()
    if (!term) return true

    return [student.name, student.email, student.rollNumber]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
  const marksSummary = students.reduce(
    (summary, student) => {
      const status =
        marks[student.id]?.assessmentStatus || 'not_entered'
      summary[status] = (summary[status] || 0) + 1
      return summary
    },
    {},
  )

  return (
    <DashboardLayout
      title="Tests & Results"
      description="Prepare assessments, enter marks, and publish results."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Assessments"
          title="Tests and results"
          description="Create tests for your classes, record marks, and control when students can see published results."
          action={
            <div className="flex flex-wrap gap-2">
              <Link to={resultsPath} className={buttonSecondary}>
                View results
              </Link>
              <button type="button" onClick={openCreate} className={buttonPrimary}>
                + Add test
              </button>
            </div>
          }
        />

        {error && <Notice tone="red">{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}

        <section className={`${cardClass} p-4 sm:p-5`}>
          <form
            onSubmit={applyFilters}
            className="grid gap-3 lg:grid-cols-[1fr_210px_180px_auto]"
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search test title"
              className={inputClass}
              aria-label="Search tests"
            />

            <select
              value={classFilter}
              onChange={(event) => {
                setClassFilter(event.target.value)
                setPage(1)
              }}
              className={inputClass}
              aria-label="Filter by class"
            >
              <option value="">All classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label ||
                    [item.name, item.section].filter(Boolean).join(' - ')}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              className={inputClass}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Results published</option>
            </select>

            <button type="submit" className={buttonSecondary}>
              Search
            </button>
          </form>
        </section>

        {loading ? (
          <LoadingState label="Loading tests..." />
        ) : error && tests.length === 0 ? (
          <ErrorState message={error} onRetry={() => loadTests()} />
        ) : tests.length === 0 ? (
          <EmptyState
            title="No tests found"
            description="Create a test or adjust the current filters."
            action={
              <button type="button" onClick={openCreate} className={buttonPrimary}>
                Create the first test
              </button>
            }
            icon="✓"
          />
        ) : (
          <section className={`${cardClass} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Test</th>
                    <th className="px-4 py-3 font-semibold">Class</th>
                    <th className="px-4 py-3 font-semibold">Schedule</th>
                    <th className="px-4 py-3 font-semibold">Marks</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tests.map((test) => (
                    <tr key={test.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {test.title}
                        </p>
                        <p className="mt-1 max-w-sm text-xs text-slate-500">
                          {test.subject?.name || 'General'}
                          {test.description ? ` · ${test.description}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {test.class
                          ? [test.class.name, test.class.section]
                              .filter(Boolean)
                              .join(' - ')
                          : '—'}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatDate(test.scheduledAt)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <p>{test.maxMarks} maximum</p>
                        <p className="text-xs text-slate-500">
                          Pass at{' '}
                          {test.passingMarks ??
                            Math.round(test.maxMarks * 0.33 * 100) / 100}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <Badge tone={statusTone(test.status)}>
                            {test.resultsPublishedAt
                              ? 'Results published'
                              : test.status}
                          </Badge>
                          {test.resultsPublishedAt && (
                            <p className="text-[11px] text-slate-500">
                              {formatDate(test.resultsPublishedAt)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openMarks(test)}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50"
                          >
                            Marks
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(test)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          {test.resultsPublishedAt ? (
                            <button
                              type="button"
                              disabled={busyId === test.id}
                              onClick={() => unpublishResults(test)}
                              className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                            >
                              Unpublish
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === test.id}
                              onClick={() => publishResults(test)}
                              className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              Publish results
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                <p className="text-slate-500">
                  Page {pagination.page} of {pagination.pages} ·{' '}
                  {pagination.total} tests
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                    className={buttonSecondary}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((value) => value + 1)}
                    className={buttonSecondary}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <Modal
        open={testModal}
        title={editing ? 'Edit test' : 'Add test'}
        description={
          editing
            ? 'Class and maximum marks cannot be changed once marks exist.'
            : 'Create a draft first, then enter marks when ready.'
        }
        onClose={() => !saving && setTestModal(false)}
        wide
      >
        <form onSubmit={saveTest} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Test title *
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                maxLength={160}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Class *
              <select
                required
                value={form.classId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    classId: event.target.value,
                    subjectId: '',
                  }))
                }
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
              Subject
              <select
                value={form.subjectId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subjectId: event.target.value,
                  }))
                }
                className={`${inputClass} mt-2`}
              >
                <option value="">General / no subject</option>
                {formSubjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Maximum marks *
              <input
                required
                type="number"
                min="1"
                max="10000"
                value={form.maxMarks}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    maxMarks: event.target.value,
                  }))
                }
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Passing marks
              <input
                type="number"
                min="0"
                max={form.maxMarks || 10000}
                step="0.01"
                value={form.passingMarks}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    passingMarks: event.target.value,
                  }))
                }
                className={`${inputClass} mt-2`}
                placeholder="Default: 33%"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Leave blank to use 33% of maximum marks.
              </span>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Scheduled date
              <input
                type="date"
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduledAt: event.target.value,
                  }))
                }
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                disabled={Boolean(editing?.resultsPublishedAt)}
                className={`${inputClass} mt-2`}
              >
                <option value="draft">Draft</option>
                <option value="published">Published to students</option>
                <option
                  value="closed"
                  disabled={!editing?.resultsPublishedAt}
                >
                  Closed / results published
                </option>
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {editing?.resultsPublishedAt
                  ? 'Unpublish results before changing the test status.'
                  : 'Results close this test automatically when published.'}
              </span>
            </label>

            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                maxLength={1000}
                className={`${inputClass} mt-2 resize-y`}
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setTestModal(false)}
              className={buttonSecondary}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className={buttonPrimary}>
              {saving ? 'Saving...' : 'Save test'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(marksTest)}
        title={marksTest ? `Marks · ${marksTest.title}` : 'Marks'}
        description={
          marksTest
            ? `Maximum ${marksTest.maxMarks} · pass at ${marksPassing}. ${marksReadOnly ? 'Published results are read-only.' : 'Blank rows stay not entered and are excluded from averages.'}`
            : ''
        }
        onClose={closeMarksModal}
        wide
      >
        {marksError && <Notice tone="red">{marksError}</Notice>}
        {marksNotice && <Notice>{marksNotice}</Notice>}

        {marksReadOnly && (
          <Notice tone="amber">
            These results are published and cannot be edited. Unpublish
            the results before changing marks.
          </Notice>
        )}

        {marksLoading ? (
          <LoadingState label="Loading marks..." />
        ) : students.length === 0 ? (
          <EmptyState
            title="No active students in this class"
            description="Add or activate students before entering marks."
            icon="♙"
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-sm font-semibold text-slate-700">
                Find a student
                <input
                  value={marksSearch}
                  onChange={(event) =>
                    setMarksSearch(event.target.value)
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Search name, roll number, or email"
                />
              </label>

              <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">
                  Entered {marksSummary.entered || 0}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                  Not entered {marksSummary.not_entered || 0}
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                  Non-scored{' '}
                  {(marksSummary.absent || 0) +
                    (marksSummary.missing || 0) +
                    (marksSummary.exempt || 0)}
                </span>
              </div>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              Use absent, missing, or exempt for students without a
              numeric score. These states are never counted as zero.
            </p>

            <div className="max-h-[48vh] overflow-y-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Roll</th>
                    <th className="w-32 px-4 py-3 font-semibold">
                      Result state
                    </th>
                    <th className="w-32 px-4 py-3 font-semibold">
                      Marks
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Clear
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const row = marks[student.id] || {
                      assessmentStatus: 'not_entered',
                      value: '',
                    }
                    const entered = row.assessmentStatus === 'entered'

                    return (
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
                            value={row.assessmentStatus}
                            disabled={marksReadOnly}
                            onChange={(event) => {
                              const assessmentStatus =
                                event.target.value
                              updateMark(student.id, {
                                assessmentStatus,
                                value:
                                  assessmentStatus === 'entered'
                                    ? row.value
                                    : '',
                              })
                            }}
                            className={inputClass}
                            aria-label={`Result state for ${student.name}`}
                          >
                            <option value="not_entered">
                              Not entered
                            </option>
                            <option value="entered">Entered</option>
                            <option value="absent">Absent</option>
                            <option value="missing">Missing</option>
                            <option value="exempt">Exempt</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {entered ? (
                            <input
                              type="number"
                              min="0"
                              max={marksTest.maxMarks}
                              step="0.01"
                              value={row.value}
                              disabled={marksReadOnly}
                              onChange={(event) =>
                                updateMark(student.id, {
                                  value: event.target.value,
                                })
                              }
                              className={inputClass}
                              aria-label={`Marks for ${student.name}`}
                              placeholder={`0–${marksTest.maxMarks}`}
                            />
                          ) : (
                            <p className="text-xs leading-5 text-slate-500">
                              {row.assessmentStatus === 'not_entered'
                                ? 'No result recorded'
                                : 'Excluded from score averages'}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={
                              marksReadOnly ||
                              row.assessmentStatus === 'not_entered'
                            }
                            onClick={() =>
                              updateMark(student.id, {
                                assessmentStatus: 'not_entered',
                                value: '',
                              })
                            }
                            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Clear
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredStudents.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  No students match this search.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                {marksDirty
                  ? 'Unsaved mark changes.'
                  : 'Saved marks are drafts until results are published.'}
              </p>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={closeMarksModal}
                  className={buttonSecondary}
                  disabled={marksSaving}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={saveMarks}
                  disabled={marksSaving || marksReadOnly}
                  className={buttonPrimary}
                >
                  {marksSaving ? 'Saving...' : 'Save draft marks'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
