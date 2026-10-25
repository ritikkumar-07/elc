import { useCallback, useEffect, useState } from 'react'

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
  name: '',
  email: '',
  password: '',
  rollNumber: '',
  classId: '',
  phone: '',
  guardianName: '',
  guardianPhone: '',
  admissionDate: '',
}

function statusTone(status) {
  return status === 'active'
    ? 'green'
    : status === 'pending'
      ? 'amber'
      : status === 'suspended'
        ? 'red'
        : 'slate'
}

export default function StudentManagement() {
  const { user, logout } = useAuth()
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [classId, setClassId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')

  const loadStudents = useCallback(
    async (signal) => {
      setLoading(true)
      setError('')

      try {
        const result = await apiRequest(
          `/api/v1/students${buildQuery({
            page,
            limit: 20,
            search: appliedSearch,
            status,
            classId,
          })}`,
          { signal },
        )

        setStudents(Array.isArray(result.data) ? result.data : [])
        setPagination(result.pagination || null)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load students.')
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [page, appliedSearch, status, classId],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadStudents(controller.signal)
    return () => controller.abort()
  }, [loadStudents])

  useEffect(() => {
    const controller = new AbortController()

    apiRequest('/api/v1/academics/classes?includeInactive=true', {
      signal: controller.signal,
    })
      .then((result) =>
        setClasses(Array.isArray(result.data) ? result.data : []),
      )
      .catch(() => {})

    return () => controller.abort()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
    setError('')
  }

  function openEdit(student) {
    setEditing(student)
    setForm({
      name: student.name || '',
      email: student.email || '',
      password: '',
      rollNumber: student.rollNumber || '',
      classId: student.class?.id || student.class?._id || '',
      phone: student.phone || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      admissionDate: student.admissionDate
        ? String(student.admissionDate).slice(0, 10)
        : '',
    })
    setModalOpen(true)
    setError('')
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        rollNumber: form.rollNumber.trim(),
        guardianName: form.guardianName.trim(),
        guardianPhone: form.guardianPhone.trim(),
        admissionDate: form.admissionDate || '',
      }

      if (form.classId) payload.classId = form.classId

      if (!editing) {
        payload.password = form.password
      } else {
        payload.classId = form.classId || null
      }

      if (editing) {
        await apiRequest(`/api/v1/students/${editing.id}`, {
          method: 'PATCH',
          body: payload,
        })
        setNotice('Student updated successfully.')
      } else {
        await apiRequest('/api/v1/students', {
          method: 'POST',
          body: payload,
        })
        setNotice('Student account created and activated.')
      }

      setModalOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await loadStudents()
    } catch (err) {
      setError(err.message || 'Unable to save the student.')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(student, nextStatus) {
    const label =
      nextStatus === 'active' ? 'activate' : 'suspend'

    if (
      !window.confirm(
        `Are you sure you want to ${label} ${student.name}'s account?`,
      )
    ) {
      return
    }

    setBusyId(student.id)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/api/v1/students/${student.id}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      })
      setNotice(`Student account ${label}d successfully.`)
      await loadStudents()
    } catch (err) {
      setError(err.message || 'Unable to update account status.')
    } finally {
      setBusyId('')
    }
  }

  function applyFilters(event) {
    event.preventDefault()
    setPage(1)
    setAppliedSearch(search.trim())
  }

  return (
    <DashboardLayout
      title="Student Management"
      description="Manage student accounts and academic records."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Administration"
          title="Students"
          description="Create student accounts, assign classes, and manage access. Registrations approved elsewhere appear here automatically."
          action={
            <button type="button" onClick={openCreate} className={buttonPrimary}>
              + Add student
            </button>
          }
        />

        {error && <Notice tone="red">{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}

        <section className={`${cardClass} p-4 sm:p-5`}>
          <form
            onSubmit={applyFilters}
            className="grid gap-3 lg:grid-cols-[1fr_190px_210px_auto]"
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or roll number"
              className={inputClass}
              aria-label="Search students"
            />

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              className={inputClass}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value)
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

            <button type="submit" className={buttonSecondary}>
              Search
            </button>
          </form>
        </section>

        {loading ? (
          <LoadingState label="Loading students..." />
        ) : error && students.length === 0 ? (
          <ErrorState
            message={error}
            onRetry={() => loadStudents()}
          />
        ) : students.length === 0 ? (
          <EmptyState
            title="No students found"
            description="Create a student account or adjust the current filters."
            action={
              <button type="button" onClick={openCreate} className={buttonPrimary}>
                Add the first student
              </button>
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
                    <th className="px-4 py-3 font-semibold">Class</th>
                    <th className="px-4 py-3 font-semibold">Roll number</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => (
                    <tr key={student.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {student.name}
                        </p>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {student.email}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {student.class
                          ? [student.class.name, student.class.section]
                              .filter(Boolean)
                              .join(' - ')
                          : 'Not assigned'}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {student.rollNumber || '—'}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <p>{student.phone || '—'}</p>
                        {student.guardianName && (
                          <p className="mt-1 text-xs text-slate-500">
                            Guardian: {student.guardianName}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={statusTone(student.status)}>
                          {student.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(student)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={busyId === student.id}
                            onClick={() =>
                              changeStatus(
                                student,
                                student.status === 'active'
                                  ? 'suspended'
                                  : 'active',
                              )
                            }
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                              student.status === 'active'
                                ? 'border-red-200 text-red-700 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {busyId === student.id
                              ? 'Saving...'
                              : student.status === 'active'
                                ? 'Suspend'
                                : 'Activate'}
                          </button>
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
                  {pagination.total} students
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
        open={modalOpen}
        title={editing ? 'Edit student' : 'Add student'}
        description={
          editing
            ? 'Update profile and class information. Email and roll number must remain unique.'
            : 'Create an active student account. Share the initial password securely.'
        }
        onClose={closeModal}
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Notice tone="red">{error}</Notice>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Full name *
              <input
                required
                name="name"
                value={form.name}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Email *
              <input
                required
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              />
            </label>

            {!editing && (
              <label className="block text-sm font-semibold text-slate-700">
                Initial password *
                <input
                  required
                  type="password"
                  name="password"
                  minLength={8}
                  maxLength={72}
                  value={form.password}
                  onChange={updateField}
                  className={`${inputClass} mt-2`}
                />
              </label>
            )}

            <label className="block text-sm font-semibold text-slate-700">
              Roll number
              <input
                name="rollNumber"
                value={form.rollNumber}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Class
              <select
                name="classId"
                value={form.classId}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              >
                <option value="">Not assigned</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label ||
                      [item.name, item.section].filter(Boolean).join(' - ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Phone
              <input
                name="phone"
                value={form.phone}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Guardian name
              <input
                name="guardianName"
                value={form.guardianName}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Guardian phone
              <input
                name="guardianPhone"
                value={form.guardianPhone}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Admission date
              <input
                type="date"
                name="admissionDate"
                value={form.admissionDate}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={closeModal} className={buttonSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={buttonPrimary}>
              {saving
                ? 'Saving...'
                : editing
                  ? 'Save changes'
                  : 'Create student'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
