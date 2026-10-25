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

const emptyForm = {
  title: '',
  content: '',
  audience: 'all',
  classId: '',
  isPublic: false,
  status: 'draft',
  publishAt: '',
  expiresAt: '',
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function statusTone(status) {
  return status === 'published'
    ? 'green'
    : status === 'archived'
      ? 'slate'
      : 'amber'
}

export default function AnnouncementManagement() {
  const { user, logout } = useAuth()
  const isTeacher = user?.role === 'teacher'
  const [announcements, setAnnouncements] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')

  const loadData = useCallback(async (signal) => {
    setLoading(true)
    setError('')

    try {
      const [announcementResult, classResult] = await Promise.all([
        apiRequest('/api/v1/announcements?limit=100', { signal }),
        apiRequest('/api/v1/academics/classes', { signal }),
      ])

      setAnnouncements(
        Array.isArray(announcementResult.data)
          ? announcementResult.data
          : [],
      )
      setClasses(
        Array.isArray(classResult.data) ? classResult.data : [],
      )
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Unable to load announcements.')
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

  function openCreate() {
    setEditing(null)
    setForm({
      ...emptyForm,
      classId: isTeacher ? classes[0]?.id || '' : '',
      audience: isTeacher ? 'students' : 'all',
    })
    setModalOpen(true)
    setError('')
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      title: item.title || '',
      content: item.content || '',
      audience: item.audience || 'all',
      classId: item.class?.id || item.class?._id || '',
      isPublic: Boolean(item.isPublic),
      status: item.status || 'draft',
      publishAt: item.publishAt
        ? String(item.publishAt).slice(0, 10)
        : '',
      expiresAt: item.expiresAt
        ? String(item.expiresAt).slice(0, 10)
        : '',
    })
    setModalOpen(true)
    setError('')
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function saveAnnouncement(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        audience: isTeacher ? 'students' : form.audience,
        classId: form.classId,
        isPublic: isTeacher ? false : Boolean(form.isPublic),
        status: form.status,
        publishAt: form.publishAt,
        expiresAt: form.expiresAt,
      }

      if (isTeacher && !payload.classId) {
        throw new Error('Choose one of your assigned classes.')
      }

      if (editing) {
        await apiRequest(`/api/v1/announcements/${editing.id}`, {
          method: 'PATCH',
          body: payload,
        })
        setNotice('Announcement updated successfully.')
      } else {
        await apiRequest('/api/v1/announcements', {
          method: 'POST',
          body: payload,
        })
        setNotice(
          payload.status === 'published'
            ? 'Announcement published.'
            : 'Announcement saved as a draft.',
        )
      }

      setModalOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to save the announcement.')
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(item, status) {
    setBusyId(item.id)
    setError('')
    setNotice('')

    try {
      await apiRequest(`/api/v1/announcements/${item.id}`, {
        method: 'PATCH',
        body: { status },
      })
      setNotice(
        status === 'published'
          ? 'Announcement published.'
          : 'Announcement archived.',
      )
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to change announcement status.')
    } finally {
      setBusyId('')
    }
  }

  function canManage(item) {
    if (user?.role === 'admin') return true
    return (
      String(item.createdBy?.id || item.createdBy?._id || item.createdBy) ===
      String(user?.id || user?._id || '')
    )
  }

  return (
    <DashboardLayout
      title="Announcements"
      description="Create updates for students and teachers."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow={isTeacher ? 'Class communication' : 'Institute communication'}
          title="Announcements"
          description={
            isTeacher
              ? 'Share updates with students in your assigned classes.'
              : 'Publish announcements to the portal and, when enabled, the public homepage.'
          }
          action={
            <button type="button" onClick={openCreate} className={buttonPrimary}>
              + New announcement
            </button>
          }
        />

        {error && <Notice tone="red">{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}

        {loading ? (
          <LoadingState label="Loading announcements..." />
        ) : error && announcements.length === 0 ? (
          <ErrorState message={error} onRetry={() => loadData()} />
        ) : announcements.length === 0 ? (
          <EmptyState
            title="No announcements yet"
            description="Create the first announcement for your portal audience."
            action={
              <button type="button" onClick={openCreate} className={buttonPrimary}>
                Create announcement
              </button>
            }
            icon="♧"
          />
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {announcements.map((item) => (
              <article key={item.id} className={`${cardClass} flex flex-col p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-800">
                      {item.audience === 'all'
                        ? 'Everyone'
                        : item.audience}
                      {item.isPublic ? ' · Public' : ''}
                    </p>
                    <h2 className="mt-1 break-words text-lg font-bold text-slate-900">
                      {item.title}
                    </h2>
                  </div>
                  <Badge tone={statusTone(item.status)}>
                    {item.status}
                  </Badge>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {item.content}
                </p>

                <dl className="mt-4 space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between gap-3">
                    <dt>Class</dt>
                    <dd className="text-right font-medium text-slate-700">
                      {item.class
                        ? [item.class.name, item.class.section]
                            .filter(Boolean)
                            .join(' - ')
                        : 'All classes'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Publish date</dt>
                    <dd className="text-right font-medium text-slate-700">
                      {formatDate(item.publishAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Expires</dt>
                    <dd className="text-right font-medium text-slate-700">
                      {formatDate(item.expiresAt)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {canManage(item) && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      {item.status !== 'published' && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => setStatus(item, 'published')}
                          className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Publish
                        </button>
                      )}

                      {item.status !== 'archived' && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => setStatus(item, 'archived')}
                          className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                        >
                          Archive
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit announcement' : 'New announcement'}
        description={
          isTeacher
            ? 'Teacher announcements are limited to your assigned classes.'
            : 'Public announcements also appear on the homepage.'
        }
        onClose={closeModal}
        wide
      >
        <form onSubmit={saveAnnouncement} className="space-y-4">
          {error && <Notice tone="red">{error}</Notice>}

          <label className="block text-sm font-semibold text-slate-700">
            Title *
            <input
              required
              name="title"
              value={form.title}
              onChange={updateField}
              maxLength={180}
              className={`${inputClass} mt-2`}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Content *
            <textarea
              required
              name="content"
              value={form.content}
              onChange={updateField}
              rows={5}
              maxLength={5000}
              className={`${inputClass} mt-2 resize-y`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Audience
              <select
                name="audience"
                value={isTeacher ? 'students' : form.audience}
                onChange={updateField}
                disabled={isTeacher}
                className={`${inputClass} mt-2`}
              >
                <option value="all">Everyone</option>
                <option value="students">Students</option>
                <option value="teachers">Teachers</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Class
              <select
                name="classId"
                value={form.classId}
                onChange={updateField}
                required={isTeacher}
                className={`${inputClass} mt-2`}
              >
                <option value="">
                  {isTeacher ? 'Select a class' : 'All classes'}
                </option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label ||
                      [item.name, item.section].filter(Boolean).join(' - ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Status
              <select
                name="status"
                value={form.status}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Publish date
              <input
                type="date"
                name="publishAt"
                value={form.publishAt}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Expiry date
              <input
                type="date"
                name="expiresAt"
                value={form.expiresAt}
                onChange={updateField}
                className={`${inputClass} mt-2`}
              />
            </label>

            {!isTeacher && (
              <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={form.isPublic}
                  onChange={updateField}
                  className="h-4 w-4"
                />
                Show on public homepage
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
                  : 'Create announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
