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
import { apiRequest } from '../lib/api.js'

const emptyClass = {
  name: '',
  section: '',
  academicYear: '',
  description: '',
  isActive: true,
}

const emptySubject = {
  name: '',
  code: '',
  classId: '',
  description: '',
  isActive: true,
}

export default function AcademicManagement() {
  const { user, logout } = useAuth()
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [classModal, setClassModal] = useState(false)
  const [subjectModal, setSubjectModal] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [editingSubject, setEditingSubject] = useState(null)
  const [classForm, setClassForm] = useState(emptyClass)
  const [subjectForm, setSubjectForm] = useState(emptySubject)
  const [saving, setSaving] = useState(false)
  const [subjectClassFilter, setSubjectClassFilter] = useState('')

  const loadData = useCallback(async (signal) => {
    setLoading(true)
    setError('')

    try {
      const [classResult, subjectResult] = await Promise.all([
        apiRequest(
          '/api/v1/academics/classes?includeInactive=true',
          { signal },
        ),
        apiRequest(
          '/api/v1/academics/subjects?includeInactive=true',
          { signal },
        ),
      ])

      setClasses(Array.isArray(classResult.data) ? classResult.data : [])
      setSubjects(
        Array.isArray(subjectResult.data) ? subjectResult.data : [],
      )
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Unable to load academic data.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [loadData])

  function openClass(item = null) {
    setEditingClass(item)
    setClassForm(
      item
        ? {
            name: item.name || '',
            section: item.section || '',
            academicYear: item.academicYear || '',
            description: item.description || '',
            isActive: item.isActive !== false,
          }
        : emptyClass,
    )
    setClassModal(true)
    setError('')
  }

  function openSubject(item = null) {
    setEditingSubject(item)
    setSubjectForm(
      item
        ? {
            name: item.name || '',
            code: item.code || '',
            classId: item.class?.id || item.class?._id || '',
            description: item.description || '',
            isActive: item.isActive !== false,
          }
        : {
            ...emptySubject,
            classId: subjectClassFilter || '',
          },
    )
    setSubjectModal(true)
    setError('')
  }

  async function saveClass(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        name: classForm.name.trim(),
        section: classForm.section.trim(),
        academicYear: classForm.academicYear.trim(),
        description: classForm.description.trim(),
        isActive: Boolean(classForm.isActive),
      }

      if (editingClass) {
        await apiRequest(`/api/v1/academics/classes/${editingClass.id}`, {
          method: 'PATCH',
          body: payload,
        })
        setNotice('Class updated successfully.')
      } else {
        await apiRequest('/api/v1/academics/classes', {
          method: 'POST',
          body: payload,
        })
        setNotice('Class created successfully.')
      }

      setClassModal(false)
      setEditingClass(null)
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to save the class.')
    } finally {
      setSaving(false)
    }
  }

  async function saveSubject(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim(),
        classId: subjectForm.classId,
        description: subjectForm.description.trim(),
        isActive: Boolean(subjectForm.isActive),
      }

      if (editingSubject) {
        await apiRequest(
          `/api/v1/academics/subjects/${editingSubject.id}`,
          { method: 'PATCH', body: payload },
        )
        setNotice('Subject updated successfully.')
      } else {
        await apiRequest('/api/v1/academics/subjects', {
          method: 'POST',
          body: payload,
        })
        setNotice('Subject created successfully.')
      }

      setSubjectModal(false)
      setEditingSubject(null)
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to save the subject.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleClass(item) {
    setError('')
    setNotice('')

    try {
      await apiRequest(`/api/v1/academics/classes/${item.id}`, {
        method: 'PATCH',
        body: { isActive: !item.isActive },
      })
      setNotice(item.isActive ? 'Class archived.' : 'Class activated.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to change class status.')
    }
  }

  async function toggleSubject(item) {
    setError('')
    setNotice('')

    try {
      await apiRequest(`/api/v1/academics/subjects/${item.id}`, {
        method: 'PATCH',
        body: { isActive: !item.isActive },
      })
      setNotice(item.isActive ? 'Subject archived.' : 'Subject activated.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to change subject status.')
    }
  }

  const visibleSubjects = subjectClassFilter
    ? subjects.filter(
        (item) =>
          String(item.class?.id || item.class?._id || item.class) ===
          String(subjectClassFilter),
      )
    : subjects

  return (
    <DashboardLayout
      title="Classes & Subjects"
      description="Organise class groups and the subjects taught in each."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-7">
        <PageHeader
          eyebrow="Academic structure"
          title="Classes and subjects"
          description="Create the class groups and subjects used by materials, tests, attendance, and teacher assignments."
          action={
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => openClass()} className={buttonPrimary}>
                + Add class
              </button>
              <button type="button" onClick={() => openSubject()} className={buttonSecondary}>
                + Add subject
              </button>
            </div>
          }
        />

        {error && <Notice tone="red">{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}

        {loading ? (
          <LoadingState label="Loading academic structure..." />
        ) : error && classes.length === 0 && subjects.length === 0 ? (
          <ErrorState message={error} onRetry={() => loadData()} />
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Classes</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {classes.length} class{classes.length === 1 ? '' : 'es'}
                  </p>
                </div>
              </div>

              {classes.length === 0 ? (
                <EmptyState
                  title="No classes yet"
                  description="Create a class before adding subjects or assigning students."
                  action={
                    <button type="button" onClick={() => openClass()} className={buttonPrimary}>
                      Add the first class
                    </button>
                  }
                  icon="▤"
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {classes.map((item) => (
                    <article key={item.id} className={`${cardClass} p-5`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {item.name}
                            {item.section ? ` - ${item.section}` : ''}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.academicYear || 'Academic year not set'}
                          </p>
                        </div>
                        <Badge tone={item.isActive ? 'green' : 'slate'}>
                          {item.isActive ? 'Active' : 'Archived'}
                        </Badge>
                      </div>

                      <p className="mt-3 min-h-10 text-sm leading-6 text-slate-600">
                        {item.description || 'No description added.'}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => openClass(item)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleClass(item)}
                          className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50"
                        >
                          {item.isActive ? 'Archive' : 'Activate'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Subjects</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {visibleSubjects.length} subject
                    {visibleSubjects.length === 1 ? '' : 's'}
                  </p>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-600">Class</span>
                  <select
                    value={subjectClassFilter}
                    onChange={(event) =>
                      setSubjectClassFilter(event.target.value)
                    }
                    className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">All classes</option>
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
              </div>

              {visibleSubjects.length === 0 ? (
                <EmptyState
                  title="No subjects found"
                  description={
                    classes.length === 0
                      ? 'Create a class first, then add its subjects.'
                      : 'Add a subject or choose a different class filter.'
                  }
                  action={
                    classes.length > 0 && (
                      <button type="button" onClick={() => openSubject()} className={buttonPrimary}>
                        Add a subject
                      </button>
                    )
                  }
                  icon="▧"
                />
              ) : (
                <div className={`${cardClass} overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Subject</th>
                          <th className="px-4 py-3 font-semibold">Code</th>
                          <th className="px-4 py-3 font-semibold">Class</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleSubjects.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900">
                                {item.name}
                              </p>
                              {item.description && (
                                <p className="mt-1 max-w-md text-xs text-slate-500">
                                  {item.description}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {item.code || '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {item.class
                                ? [item.class.name, item.class.section]
                                    .filter(Boolean)
                                    .join(' - ')
                                : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge tone={item.isActive ? 'green' : 'slate'}>
                                {item.isActive ? 'Active' : 'Archived'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openSubject(item)}
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleSubject(item)}
                                  className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50"
                                >
                                  {item.isActive ? 'Archive' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <Modal
        open={classModal}
        title={editingClass ? 'Edit class' : 'Add class'}
        onClose={() => !saving && setClassModal(false)}
      >
        <form onSubmit={saveClass} className="space-y-4">
          {error && <Notice tone="red">{error}</Notice>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Class name *
              <input
                required
                value={classForm.name}
                onChange={(event) =>
                  setClassForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={`${inputClass} mt-2`}
                placeholder="e.g. Class 10"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Section
              <input
                value={classForm.section}
                onChange={(event) =>
                  setClassForm((current) => ({
                    ...current,
                    section: event.target.value,
                  }))
                }
                className={`${inputClass} mt-2`}
                placeholder="e.g. A"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Academic year
              <input
                value={classForm.academicYear}
                onChange={(event) =>
                  setClassForm((current) => ({
                    ...current,
                    academicYear: event.target.value,
                  }))
                }
                className={`${inputClass} mt-2`}
                placeholder="e.g. 2026-27"
              />
            </label>

            <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={classForm.isActive}
                onChange={(event) =>
                  setClassForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
              Active class
            </label>

            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Description
              <textarea
                value={classForm.description}
                onChange={(event) =>
                  setClassForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                maxLength={300}
                className={`${inputClass} mt-2 resize-y`}
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setClassModal(false)}
              className={buttonSecondary}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className={buttonPrimary}>
              {saving ? 'Saving...' : 'Save class'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={subjectModal}
        title={editingSubject ? 'Edit subject' : 'Add subject'}
        onClose={() => !saving && setSubjectModal(false)}
      >
        {classes.length === 0 ? (
          <Notice tone="amber">
            Create a class before adding a subject.
          </Notice>
        ) : (
          <form onSubmit={saveSubject} className="space-y-4">
            {error && <Notice tone="red">{error}</Notice>}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Subject name *
                <input
                  required
                  value={subjectForm.name}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="e.g. Mathematics"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Subject code
                <input
                  value={subjectForm.code}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="e.g. MATH10"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Class *
                <select
                  required
                  value={subjectForm.classId}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      classId: event.target.value,
                    }))
                  }
                  className={`${inputClass} mt-2`}
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

              <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={subjectForm.isActive}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                Active subject
              </label>

              <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                Description
                <textarea
                  value={subjectForm.description}
                  onChange={(event) =>
                    setSubjectForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  maxLength={300}
                  className={`${inputClass} mt-2 resize-y`}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSubjectModal(false)}
                className={buttonSecondary}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={buttonPrimary}>
                {saving ? 'Saving...' : 'Save subject'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  )
}
