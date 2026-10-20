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
import {
  apiRequest,
  buildQuery,
  downloadFile,
} from '../lib/api.js'

const types = [
  ['notes', 'Notes'],
  ['question-paper', 'Question paper'],
  ['solution', 'Solution'],
  ['syllabus', 'Syllabus'],
  ['other', 'Other'],
]

const emptyForm = {
  title: '',
  description: '',
  type: 'notes',
  classId: '',
  subjectId: '',
  isPublished: true,
}

function typeLabel(value) {
  return types.find(([id]) => id === value)?.[1] || value
}

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MaterialManagement() {
  const { user, logout } = useAuth()
  const [materials, setMaterials] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [classFilter, setClassFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')

  const loadMaterials = useCallback(
    async (signal) => {
      setLoading(true)
      setError('')

      try {
        const result = await apiRequest(
          `/api/v1/materials${buildQuery({
            page,
            limit: 20,
            classId: classFilter,
            type: typeFilter,
            search: appliedSearch,
            includeArchived: includeArchived ? 'true' : '',
          })}`,
          { signal },
        )
        setMaterials(Array.isArray(result.data) ? result.data : [])
        setPagination(result.pagination || null)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load study materials.')
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [page, classFilter, typeFilter, appliedSearch, includeArchived],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadMaterials(controller.signal)
    return () => controller.abort()
  }, [loadMaterials])

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
    setFile(null)
    setModalOpen(true)
    setError('')
  }

  function openEdit(material) {
    setEditing(material)
    setForm({
      title: material.title || '',
      description: material.description || '',
      type: material.type || 'notes',
      classId: material.class?.id || material.class?._id || '',
      subjectId: material.subject?.id || material.subject?._id || '',
      isPublished: material.isPublished !== false,
    })
    setFile(null)
    setModalOpen(true)
    setError('')
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
    setFile(null)
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'classId' ? { subjectId: '' } : {}),
    }))
  }

  const formSubjects = subjects.filter(
    (item) =>
      String(item.class?.id || item.class?._id || item.class) ===
      String(form.classId),
  )

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)

    try {
      if (!editing && !file) {
        throw new Error('Choose a PDF file to upload.')
      }

      if (
        file &&
        (file.type !== 'application/pdf' ||
          !file.name.toLowerCase().endsWith('.pdf'))
      ) {
        throw new Error('Only PDF files are supported.')
      }

      if (file && file.size > 10 * 1024 * 1024) {
        throw new Error('The PDF must be 10 MB or smaller.')
      }

      if (editing) {
        await apiRequest(`/api/v1/materials/${editing.id}`, {
          method: 'PATCH',
          body: {
            title: form.title.trim(),
            description: form.description.trim(),
            type: form.type,
            classId: form.classId,
            subjectId: form.subjectId || '',
            isPublished: Boolean(form.isPublished),
          },
        })
        setNotice('Study material updated successfully.')
      } else {
        const body = new FormData()
        body.append('title', form.title.trim())
        body.append('description', form.description.trim())
        body.append('type', form.type)
        body.append('classId', form.classId)
        body.append('subjectId', form.subjectId)
        body.append('isPublished', String(Boolean(form.isPublished)))
        body.append('file', file)

        await apiRequest('/api/v1/materials', {
          method: 'POST',
          body,
        })
        setNotice('Study material uploaded successfully.')
      }

      setModalOpen(false)
      setEditing(null)
      setForm(emptyForm)
      setFile(null)
      await loadMaterials()
    } catch (err) {
      setError(err.message || 'Unable to save the study material.')
    } finally {
      setSaving(false)
    }
  }

  async function togglePublished(material) {
    setBusyId(material.id)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/api/v1/materials/${material.id}`, {
        method: 'PATCH',
        body: { isPublished: !material.isPublished },
      })
      setNotice(
        material.isPublished
          ? 'Material moved to drafts.'
          : 'Material published to students.',
      )
      await loadMaterials()
    } catch (err) {
      setError(err.message || 'Unable to change publishing status.')
    } finally {
      setBusyId('')
    }
  }

  async function toggleArchived(material) {
    setBusyId(material.id)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/api/v1/materials/${material.id}`, {
        method: 'PATCH',
        body: { isArchived: !material.isArchived },
      })
      setNotice(
        material.isArchived
          ? 'Material restored.'
          : 'Material archived.',
      )
      await loadMaterials()
    } catch (err) {
      setError(err.message || 'Unable to archive the material.')
    } finally {
      setBusyId('')
    }
  }

  async function handleDownload(material) {
    setError('')

    try {
      await downloadFile(
        `/api/v1/materials/${material.id}/file`,
        material.fileName,
      )
    } catch (err) {
      setError(err.message || 'Unable to download the file.')
    }
  }

  function applyFilters(event) {
    event.preventDefault()
    setPage(1)
    setAppliedSearch(search.trim())
  }

  return (
    <DashboardLayout
      title="Study Materials"
      description="Upload and publish class notes and previous papers."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Resources"
          title="Study materials"
          description="Upload PDF notes, question papers, solutions, and syllabi for your classes."
          action={
            <button type="button" onClick={openCreate} className={buttonPrimary}>
              + Upload PDF
            </button>
          }
        />

        {error && <Notice tone="red">{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}

        <section className={`${cardClass} p-4 sm:p-5`}>
          <form
            onSubmit={applyFilters}
            className="grid gap-3 lg:grid-cols-[1fr_210px_190px_auto]"
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or file name"
              className={inputClass}
              aria-label="Search materials"
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
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value)
                setPage(1)
              }}
              className={inputClass}
              aria-label="Filter by type"
            >
              <option value="">All types</option>
              {types.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <button type="submit" className={buttonSecondary}>
              Search
            </button>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => {
                  setIncludeArchived(event.target.checked)
                  setPage(1)
                }}
                className="h-4 w-4"
              />
              Show archived
            </label>
          </form>
        </section>

        {loading ? (
          <LoadingState label="Loading study materials..." />
        ) : error && materials.length === 0 ? (
          <ErrorState message={error} onRetry={() => loadMaterials()} />
        ) : materials.length === 0 ? (
          <EmptyState
            title="No study materials found"
            description="Upload a PDF or adjust the current filters."
            action={
              <button type="button" onClick={openCreate} className={buttonPrimary}>
                Upload the first PDF
              </button>
            }
            icon="▧"
          />
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {materials.map((material) => (
              <article key={material.id} className={`${cardClass} flex flex-col p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-800">
                      {typeLabel(material.type)}
                    </p>
                    <h2 className="mt-1 break-words text-lg font-bold text-slate-900">
                      {material.title}
                    </h2>
                  </div>
                  <Badge
                    tone={
                      material.isArchived
                        ? 'slate'
                        : material.isPublished
                          ? 'green'
                          : 'amber'
                    }
                  >
                    {material.isArchived
                      ? 'Archived'
                      : material.isPublished
                        ? 'Published'
                        : 'Draft'}
                  </Badge>
                </div>

                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                  {material.description || 'No description added.'}
                </p>

                <dl className="mt-4 space-y-2 text-xs text-slate-500">
                  <div className="flex justify-between gap-3">
                    <dt>Class</dt>
                    <dd className="text-right font-medium text-slate-700">
                      {material.class
                        ? [material.class.name, material.class.section]
                            .filter(Boolean)
                            .join(' - ')
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Subject</dt>
                    <dd className="text-right font-medium text-slate-700">
                      {material.subject?.name || 'General'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>File</dt>
                    <dd className="max-w-[60%] truncate text-right font-medium text-slate-700">
                      {material.fileName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Size</dt>
                    <dd className="text-right font-medium text-slate-700">
                      {formatSize(material.size)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => handleDownload(material)}
                    className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(material)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busyId === material.id}
                    onClick={() => togglePublished(material)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {material.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === material.id}
                    onClick={() => toggleArchived(material)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {material.isArchived ? 'Restore' : 'Archive'}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <p className="text-slate-500">
              Page {pagination.page} of {pagination.pages} ·{' '}
              {pagination.total} materials
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
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit study material' : 'Upload study material'}
        description={
          editing
            ? 'Update the material details. The stored PDF cannot be replaced here.'
            : 'PDF files up to 10 MB are supported.'
        }
        onClose={closeModal}
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Title *
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
                name="classId"
                value={form.classId}
                onChange={updateField}
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
                name="subjectId"
                value={form.subjectId}
                onChange={updateField}
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
              Material type *
              <select
                name="type"
                value={form.type}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              >
                {types.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                name="isPublished"
                checked={form.isPublished}
                onChange={updateField}
                className="h-4 w-4"
              />
              Visible to students
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
                maxLength={500}
                className={`${inputClass} mt-2 resize-y`}
              />
            </label>

            {!editing && (
              <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                PDF file *
                <input
                  required
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) =>
                    setFile(event.target.files?.[0] || null)
                  }
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-900"
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Maximum size 10 MB. Only PDF files are accepted.
                </span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={closeModal} className={buttonSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={buttonPrimary}>
              {saving
                ? 'Saving...'
                : editing
                  ? 'Save changes'
                  : 'Upload material'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
