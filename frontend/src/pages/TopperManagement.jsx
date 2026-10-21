import { useCallback, useEffect, useMemo, useState } from 'react'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import {
  buttonPrimary,
  buttonSecondary,
  cardClass,
  EmptyState,
  ErrorState,
  inputClass,
  Modal,
  Notice,
  PageHeader,
  StatCard,
} from '../components/common/DashboardUI.jsx'
import TopperForm from '../components/toppers/TopperForm.jsx'
import TopperList from '../components/toppers/TopperList.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest } from '../lib/api.js'

function getId(topper) {
  return topper.id || topper._id
}

function ManagementSkeleton() {
  return (
    <div className="space-y-6" role="status">
      <span className="sr-only">Loading topper management...</span>

      <div
        aria-hidden="true"
        className="grid gap-4 sm:grid-cols-3"
      >
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className={`${cardClass} animate-pulse p-5`}
          >
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="mt-4 h-8 w-16 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-36 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className={`${cardClass} animate-pulse p-5`}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_150px_150px_160px_auto]">
          <div className="h-11 rounded-xl bg-slate-100 md:col-span-2 xl:col-span-1" />
          <div className="h-11 rounded-xl bg-slate-100" />
          <div className="h-11 rounded-xl bg-slate-100" />
          <div className="h-11 rounded-xl bg-slate-100" />
          <div className="h-11 rounded-xl bg-slate-100" />
        </div>
      </div>

      <div aria-hidden="true" className={`${cardClass} p-4`}>
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex animate-pulse items-center gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
            >
              <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="h-3 w-1/4 rounded bg-slate-100" />
              </div>
              <div className="hidden h-9 w-24 rounded-lg bg-slate-100 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function TopperManagement() {
  const { user, logout } = useAuth()
  const [toppers, setToppers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [boardFilter, setBoardFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const loadToppers = useCallback(
    async ({ signal, silent = false } = {}) => {
      if (!silent) setLoading(true)
      setError('')

      try {
        const result = await apiRequest('/api/v1/toppers/manage', {
          signal,
        })

        setToppers(Array.isArray(result.data) ? result.data : [])
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load toppers.')
        }
      } finally {
        if (!silent && !signal?.aborted) setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadToppers({ signal: controller.signal })
    return () => controller.abort()
  }, [loadToppers])

  const summary = useMemo(() => {
    const published = toppers.filter(
      (topper) => topper.isPublished,
    ).length

    return {
      total: toppers.length,
      published,
      unpublished: toppers.length - published,
    }
  }, [toppers])

  const classOptions = useMemo(
    () =>
      [
        ...new Set(
          toppers
            .map((topper) => String(topper.className || '').trim())
            .filter(Boolean),
        ),
      ].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [toppers],
  )

  const boardOptions = useMemo(
    () =>
      [
        ...new Set(
          toppers
            .map((topper) => String(topper.board || '').trim())
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [toppers],
  )

  const filteredToppers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return toppers.filter((topper) => {
      const matchesSearch =
        !query ||
        String(topper.name || '').toLowerCase().includes(query)
      const matchesClass =
        !classFilter || String(topper.className) === classFilter
      const matchesBoard =
        !boardFilter || String(topper.board) === boardFilter
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'published'
          ? Boolean(topper.isPublished)
          : !topper.isPublished)

      return (
        matchesSearch &&
        matchesClass &&
        matchesBoard &&
        matchesStatus
      )
    })
  }, [toppers, search, classFilter, boardFilter, statusFilter])

  const filtersActive = Boolean(
    search.trim() || classFilter || boardFilter || statusFilter,
  )

  function clearFilters() {
    setSearch('')
    setClassFilter('')
    setBoardFilter('')
    setStatusFilter('')
  }

  function openCreate() {
    setEditing(null)
    setShowForm(true)
    setFormError('')
    setError('')
    setNotice('')
  }

  function openEdit(topper) {
    setEditing(topper)
    setShowForm(true)
    setFormError('')
    setError('')
    setNotice('')
  }

  function closeForm() {
    if (saving) return

    setShowForm(false)
    setEditing(null)
    setFormError('')
  }

  async function saveTopper(formData) {
    setSaving(true)
    setFormError('')
    setError('')
    setNotice('')

    try {
      const values = {
        name: formData.name.trim(),
        className: formData.className.trim(),
        board: formData.board,
        session: formData.session.trim(),
        percentage: Number(formData.percentage),
        rank: formData.rank || undefined,
        photoUrl: formData.photoUrl.trim(),
        description: formData.description.trim(),
        isPublished: Boolean(formData.isPublished),
      }

      let payload = values

      if (formData.photoFile) {
        payload = new FormData()

        for (const [key, value] of Object.entries(values)) {
          if (value !== undefined) {
            payload.append(key, String(value))
          }
        }

        payload.append('photo', formData.photoFile)
      }

      if (editing) {
        await apiRequest(
          `/api/v1/toppers/${encodeURIComponent(getId(editing))}`,
          { method: 'PATCH', body: payload },
        )
        setNotice('Topper updated successfully.')
      } else {
        await apiRequest('/api/v1/toppers', {
          method: 'POST',
          body: payload,
        })
        setNotice('Topper added successfully.')
      }

      setShowForm(false)
      setEditing(null)
      await loadToppers({ silent: true })
    } catch (err) {
      setFormError(err.message || 'Unable to save the topper.')
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish(topper) {
    const id = getId(topper)

    if (!id) {
      setError('This topper has no valid ID.')
      return
    }

    setBusyId(id)
    setError('')
    setNotice('')

    try {
      await apiRequest(
        `/api/v1/toppers/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: { isPublished: !topper.isPublished },
        },
      )
      setNotice(
        topper.isPublished
          ? 'Topper unpublished and removed from the public homepage.'
          : 'Topper published on the public homepage.',
      )
      await loadToppers({ silent: true })
    } catch (err) {
      setError(err.message || 'Unable to change publishing status.')
    } finally {
      setBusyId('')
    }
  }

  function requestDelete(topper) {
    setDeleteTarget(topper)
    setError('')
    setNotice('')
  }

  async function confirmDelete() {
    const target = deleteTarget
    const id = target ? getId(target) : ''

    if (!id) {
      setError('This topper has no valid ID.')
      setDeleteTarget(null)
      return
    }

    setBusyId(id)
    setError('')
    setNotice('')

    try {
      await apiRequest(
        `/api/v1/toppers/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      )
      setNotice('Topper deleted successfully.')
      await loadToppers({ silent: true })
    } catch (err) {
      setError(err.message || 'Unable to delete the topper.')
    } finally {
      setDeleteTarget(null)
      setBusyId('')
    }
  }

  const formInitialData = editing
    ? {
        name: editing.name || '',
        className: editing.className || '',
        board: editing.board || '',
        session: editing.session || '',
        percentage: editing.percentage ?? editing.marks ?? '',
        rank: editing.rank ?? '',
        photoUrl: editing.photoUrl || '',
        description: editing.description || '',
        isPublished: Boolean(editing.isPublished),
      }
    : null

  return (
    <DashboardLayout
      title="Topper Management"
      description="Manage student achievements shown on the public homepage."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Public website"
          title="Topper Management"
          description="As Director, manage the student achievements displayed in the public Star Performers section. Only published toppers appear on the website."
          action={
            <button
              type="button"
              onClick={openCreate}
              disabled={showForm || saving || Boolean(busyId)}
              className={buttonPrimary}
            >
              + Add New Topper
            </button>
          }
        />

        {error && toppers.length > 0 && (
          <Notice tone="red">{error}</Notice>
        )}
        {notice && <Notice>{notice}</Notice>}

        {loading ? (
          <ManagementSkeleton />
        ) : error && toppers.length === 0 ? (
          <ErrorState
            message={error}
            onRetry={() => loadToppers()}
          />
        ) : (
          <>
            <section
              aria-label="Topper summary"
              className="grid gap-4 sm:grid-cols-3"
            >
              <StatCard
                label="Total Toppers"
                value={summary.total}
                hint="All loaded topper records"
                icon="☆"
              />
              <StatCard
                label="Published"
                value={summary.published}
                hint="Visible on the public homepage"
                icon="✓"
              />
              <StatCard
                label="Unpublished"
                value={summary.unpublished}
                hint="Hidden from the public homepage"
                icon="○"
              />
            </section>

            {toppers.length > 0 && (
              <section
                aria-label="Filter toppers"
                className={`${cardClass} p-4 sm:p-5`}
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_150px_150px_160px_auto]">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2 xl:col-span-1">
                    Search
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by student name"
                      className={`${inputClass} mt-1.5`}
                    />
                  </label>

                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Class
                    <select
                      value={classFilter}
                      onChange={(event) =>
                        setClassFilter(event.target.value)
                      }
                      className={`${inputClass} mt-1.5`}
                    >
                      <option value="">All classes</option>
                      {classOptions.map((className) => (
                        <option key={className} value={className}>
                          {className}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Board
                    <select
                      value={boardFilter}
                      onChange={(event) =>
                        setBoardFilter(event.target.value)
                      }
                      className={`${inputClass} mt-1.5`}
                    >
                      <option value="">All boards</option>
                      {boardOptions.map((board) => (
                        <option key={board} value={board}>
                          {board}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(event.target.value)
                      }
                      className={`${inputClass} mt-1.5`}
                    >
                      <option value="">All statuses</option>
                      <option value="published">Published</option>
                      <option value="unpublished">Unpublished</option>
                    </select>
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={clearFilters}
                      disabled={!filtersActive}
                      className={`${buttonSecondary} w-full xl:w-auto`}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </section>
            )}

            {toppers.length === 0 ? (
              <EmptyState
                title="No toppers added yet"
                description="Add the first student achievement to start building the public Star Performers section."
                action={
                  <button
                    type="button"
                    onClick={openCreate}
                    className={buttonPrimary}
                  >
                    Add First Topper
                  </button>
                }
                icon="☆"
              />
            ) : (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      All Topper Records
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Showing {filteredToppers.length} of {toppers.length}{' '}
                      {toppers.length === 1 ? 'record' : 'records'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadToppers()}
                    disabled={loading || Boolean(busyId)}
                    className={buttonSecondary}
                  >
                    Refresh
                  </button>
                </div>

                {filteredToppers.length === 0 ? (
                  <EmptyState
                    title="No toppers match these filters"
                    description="Try a different student name, class, board, or publication status."
                    action={
                      <button
                        type="button"
                        onClick={clearFilters}
                        className={buttonSecondary}
                      >
                        Clear Filters
                      </button>
                    }
                    icon="⌕"
                  />
                ) : (
                  <TopperList
                    toppers={filteredToppers}
                    busyId={busyId}
                    onEdit={openEdit}
                    onDelete={requestDelete}
                    onTogglePublish={togglePublish}
                  />
                )}
              </section>
            )}
          </>
        )}
      </div>

      <Modal
        open={showForm}
        title={editing ? 'Edit Topper' : 'Add New Topper'}
        description={
          editing
            ? 'Update this student achievement. Existing photos are kept unless you choose a replacement.'
            : 'Add a verified student achievement to the topper records.'
        }
        onClose={closeForm}
        wide
      >
        <div className="space-y-4">
          {formError && <Notice tone="red">{formError}</Notice>}

          <TopperForm
            key={editing ? getId(editing) : 'new-topper'}
            initialData={formInitialData}
            onSave={saveTopper}
            onCancel={closeForm}
            busy={saving}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete Topper?"
        description="This action permanently removes the record and cannot be undone."
        onClose={() => {
          if (!busyId) setDeleteTarget(null)
        }}
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-slate-600">
            Delete{' '}
            <strong className="text-slate-900">
              {deleteTarget?.name || 'this topper'}
            </strong>
            ? The student will no longer appear in Topper Management or on
            the public website.
          </p>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={Boolean(busyId)}
              className={`${buttonSecondary} w-full sm:w-auto`}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={confirmDelete}
              disabled={Boolean(busyId)}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-red-700 bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {busyId ? 'Deleting...' : 'Delete Topper'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
