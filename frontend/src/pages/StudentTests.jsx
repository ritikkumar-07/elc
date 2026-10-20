import { useCallback, useEffect, useState } from 'react'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import {
  Badge,
  cardClass,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
} from '../components/common/DashboardUI.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest } from '../lib/api.js'

function formatDate(value) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function localTodayKey() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

function statusTone(status) {
  return status === 'published'
    ? 'green'
    : status === 'closed'
      ? 'blue'
      : 'amber'
}

export default function StudentTests() {
  const { user, logout } = useAuth()
  const [tests, setTests] = useState([])
  const [resultsByTest, setResultsByTest] = useState({})
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadTests = useCallback(async (signal) => {
    setLoading(true)
    setError('')

    try {
      const [testResult, resultResult] = await Promise.all([
        apiRequest('/api/v1/tests?limit=100', { signal }),
        apiRequest('/api/v1/tests/results?limit=100', { signal }),
      ])

      const resultMap = {}

      for (const result of resultResult.data || []) {
        const testId = result.test?.id || result.test?._id
        if (testId) resultMap[String(testId)] = result
      }

      setTests(Array.isArray(testResult.data) ? testResult.data : [])
      setResultsByTest(resultMap)
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Unable to load tests.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadTests(controller.signal)
    return () => controller.abort()
  }, [loadTests])

  const today = localTodayKey()
  const upcoming = tests.filter(
    (test) =>
      test.status === 'published' &&
      test.scheduledAt &&
      String(test.scheduledAt).slice(0, 10) >= today,
  )
  const withResults = tests.filter((test) => resultsByTest[test.id])
  const visible =
    filter === 'upcoming'
      ? upcoming
      : filter === 'results'
        ? withResults
        : tests

  return (
    <DashboardLayout
      title="Tests"
      description="Upcoming tests and published results."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Assessments"
          title="Tests"
          description="Review tests scheduled for your class and see results once your teacher publishes them."
        />

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Tests"
            value={tests.length}
            icon="✓"
            hint="For your class"
          />
          <StatCard
            label="Upcoming"
            value={upcoming.length}
            icon="◷"
            hint="Scheduled from today"
          />
          <StatCard
            label="Published results"
            value={withResults.length}
            icon="↗"
            hint="Available to review"
          />
        </section>

        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'All tests'],
            ['upcoming', 'Upcoming'],
            ['results', 'With results'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                filter === value
                  ? 'bg-[#19366e] text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingState label="Loading tests..." />
        ) : error && tests.length === 0 ? (
          <ErrorState message={error} onRetry={() => loadTests()} />
        ) : visible.length === 0 ? (
          <EmptyState
            title={
              filter === 'results'
                ? 'No results published yet'
                : filter === 'upcoming'
                  ? 'No upcoming tests'
                  : 'No tests available'
            }
            description={
              filter === 'results'
                ? 'Results will appear here after your teacher publishes them.'
                : 'Tests assigned to your class will appear here.'
            }
            icon="✓"
          />
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {visible.map((test) => {
              const result = resultsByTest[test.id]

              return (
                <article
                  key={test.id}
                  className={`${cardClass} flex flex-col p-5`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500">
                        {test.subject?.name || 'General test'}
                      </p>
                      <h2 className="mt-1 break-words text-lg font-bold text-slate-900">
                        {test.title}
                      </h2>
                    </div>
                    <Badge tone={statusTone(test.status)}>
                      {test.status}
                    </Badge>
                  </div>

                  {test.description && (
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                      {test.description}
                    </p>
                  )}

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <dt>Date</dt>
                      <dd className="mt-1 font-semibold text-slate-800">
                        {formatDate(test.scheduledAt)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <dt>Maximum marks</dt>
                      <dd className="mt-1 font-semibold text-slate-800">
                        {test.maxMarks}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto pt-4">
                    {result ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-emerald-900">
                            Your result
                          </p>
                          <p className="text-lg font-bold text-emerald-900">
                            {result.marksObtained}/{result.maxMarks}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-emerald-800">
                          {result.percentage}% · Published{' '}
                          {formatDate(result.publishedAt)}
                        </p>
                      </div>
                    ) : (
                      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                        {test.resultsPublishedAt
                          ? 'No result is available for you.'
                          : 'Your result has not been published yet.'}
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}
