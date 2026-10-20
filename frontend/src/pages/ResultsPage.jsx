import { useCallback, useEffect, useState } from 'react'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import {
  Badge,
  buttonSecondary,
  cardClass,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
} from '../components/common/DashboardUI.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest, buildQuery } from '../lib/api.js'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default function ResultsPage() {
  const { user, logout } = useAuth()
  const [results, setResults] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const isStudent = user?.role === 'student'

  const loadResults = useCallback(
    async (signal) => {
      setLoading(true)
      setError('')

      try {
        const result = await apiRequest(
          `/api/v1/tests/results${buildQuery({
            page,
            limit: 50,
          })}`,
          { signal },
        )
        setResults(Array.isArray(result.data) ? result.data : [])
        setPagination(result.pagination || null)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load results.')
        }
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [page],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadResults(controller.signal)
    return () => controller.abort()
  }, [loadResults, reloadKey])

  const published = results.filter(
    (result) => result.status === 'published',
  )
  const average =
    published.length > 0
      ? Number(
          (
            published.reduce(
              (total, result) => total + result.percentage,
              0,
            ) / published.length
          ).toFixed(2),
        )
      : null

  return (
    <DashboardLayout
      title={isStudent ? 'My Results' : 'Results'}
      description="Review marks and published academic results."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow={isStudent ? 'Academic progress' : 'Assessment records'}
          title={isStudent ? 'My results' : 'Student results'}
          description={
            isStudent
              ? 'Only results published by your teachers are shown here.'
              : 'Review draft and published marks across tests in your classes.'
          }
          action={
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className={buttonSecondary}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          }
        />

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={isStudent ? 'Published results' : 'Result records'}
            value={results.length}
            icon="↗"
            hint="Shown on this page"
          />
          <StatCard
            label="Average score"
            value={average != null ? `${average}%` : '—'}
            icon="◉"
            hint={
              isStudent
                ? 'Across your published results'
                : 'Across published results on this page'
            }
          />
          <StatCard
            label="Published"
            value={published.length}
            icon="✓"
            hint="Visible to students"
          />
        </section>

        {loading ? (
          <LoadingState label="Loading results..." />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        ) : results.length === 0 ? (
          <EmptyState
            title="No results found"
            description={
              isStudent
                ? 'Your teachers have not published any results yet.'
                : 'Enter marks for a test and publish the results to see them here.'
            }
            icon="↗"
          />
        ) : (
          <section className={`${cardClass} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {!isStudent && (
                      <th className="px-4 py-3 font-semibold">Student</th>
                    )}
                    <th className="px-4 py-3 font-semibold">Test</th>
                    <th className="px-4 py-3 font-semibold">Class</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Percentage</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((result) => (
                    <tr key={result.id}>
                      {!isStudent && (
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {result.student?.name || 'Student'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {result.student?.rollNumber
                              ? `Roll ${result.student.rollNumber}`
                              : result.student?.email || ''}
                          </p>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {result.test?.title || 'Test'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(result.test?.scheduledAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {result.class
                          ? [result.class.name, result.class.section]
                              .filter(Boolean)
                              .join(' - ')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {result.marksObtained}/{result.maxMarks}
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-900">
                        {result.percentage}%
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            result.status === 'published'
                              ? 'green'
                              : 'amber'
                          }
                        >
                          {result.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(result.publishedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                <p className="text-slate-500">
                  Page {pagination.page} of {pagination.pages}
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
    </DashboardLayout>
  )
}
