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
  phone: '',
  assignedClassIds: [],
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

export default function TeacherManagement() {
  const { user, logout } = useAuth()
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')

  const loadTeachers = useCallback(
    async (signal) => {
      setLoading(true)
      setError('')

      try {
        const result = await apiRequest(
          `/api/v1/teachers${buildQuery({
            page,
            limit: 20,
            search: appliedSearch,
            status,
          })}`,
          { signal },
        )

        setTeachers(Array.isArray(result.data) ? result.data : [])
        setPagination(result.pagination || null)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load teachers.')
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [page, appliedSearch, status],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadTeachers(controller.signal)
    return () => controller.abort()
  }, [loadTeachers])

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

  function openEdit(teacher) {
    setEditing(teacher)
    setForm({
      name: teacher.name || '',
      email: teacher.email || '',
      password: '',
      phone: teacher.phone || '',
      assignedClassIds: (teacher.assignedClasses || []).map(
        (item) => item.id || item._id || item,
      ),
    })
    setModalOpen(true)
    setError('')
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function toggleClass(id) {
    setForm((current) => ({
      ...current,
      assignedClassIds: current.assignedClassIds.includes(id)
        ? current.assignedClassIds.filter((item) => item !== id)
        : [...current.assignedClassIds, id],
    }))
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
        assignedClassIds: form.assignedClassIds,
      }

      if (!editing) payload.password = form.password

      if (editing) {
        await apiRequest(`/api/v1/teachers/${editing.id}`, {
          method: 'PATCH',
          body: payload,
        })
        setNotice('Teacher updated successfully.')
      } else {
        await apiRequest('/api/v1/teachers', {
          method: 'POST',
          body: payload,
        })
        setNotice('Teacher account created and activated.')
      }

      setModalOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await loadTeachers()
    } catch (err) {
      setError(err.message || 'Unable to save the teacher.')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(teacher, nextStatus) {
    const label =
      nextStatus === 'active' ? 'activate' : 'suspend'

    if (
      !window.confirm(
        `Are you sure you want to ${label} ${teacher.name}'s account?`,
      )
    ) {
      return
    }

    setBusyId(teacher.id)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/api/v1/teachers/${teacher.id}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      })
      setNotice(`Teacher account ${label}d successfully.`)
      await loadTeachers()
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
      title="Teacher Management"
      description="Manage teacher accounts and class assignments."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Administration"
          title="Teachers"
          description="Create teacher accounts and assign the classes they can manage."
          action={
            <button type="button" onClick={openCreate} className={buttonPrimary}>
              + Add teacher
            </button>
          }
        />

        {error && <Notice tone="red">{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}

        <section className={`${cardClass} p-4 sm:p-5`}>
          <form
            onSubmit={applyFilters}
            className="grid gap-3 sm:grid-cols-[1fr_190px_auto]"
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email"
              className={inputClass}
              aria-label="Search teachers"
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

            <button type="submit" className={buttonSecondary}>
              Search
            </button>
          </form>
        </section>

        {loading ? (
          <LoadingState label="Loading teachers..." />
        ) : error && teachers.length === 0 ? (
          <ErrorState
            message={error}
            onRetry={() => loadTeachers()}
          />
        ) : teachers.length === 0 ? (
          <EmptyState
            title="No teachers found"
            description="Create a teacher account or adjust the current filters."
            action={
              <button type="button" onClick={openCreate} className={buttonPrimary}>
                Add the first teacher
              </button>
            }
            icon="♧"
          />
        ) : (
          <section className={`${cardClass} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Teacher</th>
                    <th className="px-4 py-3 font-semibold">Assigned classes</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">
                          {teacher.name}
                        </p>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {teacher.email}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {(teacher.assignedClasses || []).length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {teacher.assignedClasses.map((item) => (
                              <span
                                key={item.id || item._id || item}
                                className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800"
                              >
                                {item.name
                                  ? [item.name, item.section]
                                      .filter(Boolean)
                                      .join(' - ')
                                  : 'Class'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">None assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {teacher.phone || '—'}
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={statusTone(teacher.status)}>
                          {teacher.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(teacher)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={busyId === teacher.id}
                            onClick={() =>
                              changeStatus(
                                teacher,
                                teacher.status === 'active'
                                  ? 'suspended'
                                  : 'active',
                              )
                            }
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                              teacher.status === 'active'
                                ? 'border-red-200 text-red-700 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {busyId === teacher.id
                              ? 'Saving...'
                              : teacher.status === 'active'
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
                  {pagination.total} teachers
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
        title={editing ? 'Edit teacher' : 'Add teacher'}
        description={
          editing
            ? 'Update profile details and class assignments.'
            : 'Create an active teacher account. Share the initial password securely.'
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
              Phone
              <input
                name="phone"
                value={form.phone}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">
              Assigned classes
            </legend>
            <p className="mt-1 text-xs text-slate-500">
              Teachers can only manage content and attendance for these classes.
            </p>

            {classes.length === 0 ? (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Create a class first in Classes &amp; Subjects.
              </p>
            ) : (
              <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                {classes.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2 rounded-lg p-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.assignedClassIds.includes(item.id)}
                      onChange={() => toggleClass(item.id)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span>
                      {item.label ||
                        [item.name, item.section]
                          .filter(Boolean)
                          .join(' - ')}
                      {item.academicYear ? ` · ${item.academicYear}` : ''}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={closeModal} className={buttonSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={buttonPrimary}>
              {saving
                ? 'Saving...'
                : editing
                  ? 'Save changes'
                  : 'Create teacher'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
