import { useCallback, useEffect, useState } from 'react'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import {
  buttonSecondary,
  cardClass,
  EmptyState,
  ErrorState,
  inputClass,
  LoadingState,
  Notice,
  PageHeader,
} from '../components/common/DashboardUI.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  apiRequest,
  buildQuery,
  downloadFile,
} from '../lib/api.js'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatSize(bytes) {
  if (!bytes) return 'PDF'
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const typeLabels = {
  notes: 'Class notes',
  'question-paper': 'Question paper',
  solution: 'Solution',
  syllabus: 'Syllabus',
  other: 'Resource',
}

export default function StudentMaterials() {
  const { user, logout } = useAuth()
  const [materials, setMaterials] = useState([])
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [downloading, setDownloading] = useState('')

  const loadMaterials = useCallback(
    async (signal) => {
      setLoading(true)
      setError('')

      try {
        const result = await apiRequest(
          `/api/v1/materials${buildQuery({
            search: appliedSearch,
            limit: 100,
          })}`,
          { signal },
        )
        setMaterials(Array.isArray(result.data) ? result.data : [])
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load study materials.')
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [appliedSearch],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadMaterials(controller.signal)
    return () => controller.abort()
  }, [loadMaterials])

  function applySearch(event) {
    event.preventDefault()
    setAppliedSearch(search.trim())
  }

  async function handleDownload(material) {
    setDownloading(material.id)
    setError('')
    setNotice('')

    try {
      await downloadFile(
        `/api/v1/materials/${material.id}/file`,
        material.fileName,
      )
      setNotice(`Downloading ${material.fileName}.`)
    } catch (err) {
      setError(err.message || 'Unable to download this material.')
    } finally {
      setDownloading('')
    }
  }

  return (
    <DashboardLayout
      title="Class Notes"
      description="Study materials shared with your class."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Learning resources"
          title="Class notes"
          description="Download notes, question papers, solutions, and other PDFs shared by your teachers."
        />

        {error && <Notice tone="red">{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}

        <section className={`${cardClass} p-4 sm:p-5`}>
          <form
            onSubmit={applySearch}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search materials by title or file name"
              className={inputClass}
              aria-label="Search study materials"
            />
            <button type="submit" className={`${buttonSecondary} sm:w-auto`}>
              Search
            </button>
          </form>
        </section>

        {loading ? (
          <LoadingState label="Loading materials..." />
        ) : error && materials.length === 0 ? (
          <ErrorState message={error} onRetry={() => loadMaterials()} />
        ) : materials.length === 0 ? (
          <EmptyState
            title={
              appliedSearch
                ? 'No matching materials'
                : 'No study materials yet'
            }
            description={
              appliedSearch
                ? 'Try a different search term.'
                : 'Materials shared by your teachers will appear here.'
            }
            icon="▧"
          />
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {materials.map((material) => (
              <article
                key={material.id}
                className={`${cardClass} flex flex-col p-5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-sm font-bold text-red-700">
                    PDF
                  </span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">
                    {typeLabels[material.type] || material.type}
                  </span>
                </div>

                <h2 className="mt-3 break-words text-base font-bold text-slate-900">
                  {material.title}
                </h2>

                {material.description && (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                    {material.description}
                  </p>
                )}

                <dl className="mt-3 space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between gap-3">
                    <dt>Subject</dt>
                    <dd className="text-right font-medium text-slate-700">
                      {material.subject?.name || 'General'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Uploaded</dt>
                    <dd className="text-right font-medium text-slate-700">
                      {formatDate(material.createdAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>File size</dt>
                    <dd className="text-right font-medium text-slate-700">
                      {formatSize(material.size)}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  disabled={downloading === material.id}
                  onClick={() => handleDownload(material)}
                  className={`${buttonSecondary} mt-4 w-full`}
                >
                  {downloading === material.id
                    ? 'Downloading...'
                    : 'Download PDF'}
                </button>
              </article>
            ))}
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}
