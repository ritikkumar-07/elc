import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import {
  buttonPrimary,
  buttonSecondary,
  cardClass,
  EmptyState,
  ErrorState,
  inputClass,
  LoadingState,
  Notice,
  PageHeader,
  StatCard,
} from '../components/common/DashboardUI.jsx'
import {
  AssessmentStatusBadge,
  PassStateBadge,
  TableShell,
} from '../components/analytics/AnalyticsUI.jsx'
import {
  ChartCard,
  DonutChart,
  HistogramChart,
  LineChart,
} from '../components/analytics/Charts.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  apiRequest,
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

function formatPercent(value) {
  return value == null ? '—' : `${value}%`
}

function classLabel(item) {
  if (!item) return 'Class not assigned'
  return [item.name, item.section].filter(Boolean).join(' - ')
}

function changeLabel(value) {
  if (value == null) return 'Not enough comparable results'
  if (value === 0) return 'No change'
  return `${value > 0 ? '+' : ''}${value} percentage points`
}

export default function StudentResults() {
  const { user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [exportError, setExportError] = useState('')

  const loadAnalytics = useCallback(async (signal) => {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/api/v1/analytics/overview', {
        signal,
      })
      setData(result.data)
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Unable to load your results.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadAnalytics(controller.signal)
    return () => controller.abort()
  }, [loadAnalytics, reloadKey])

  async function exportResults() {
    setExportError('')

    try {
      await downloadFile(
        '/api/v1/analytics/export',
        'my-published-results.csv',
      )
    } catch (err) {
      setExportError(err.message || 'Unable to export your results.')
    }
  }

  const kpis = data?.kpis || {}
  const results = data?.results || []
  const subjects = data?.subjects || []
  const subjectOptions = [
    ...new Set(
      results
        .map((result) => result.test?.subject?.name || 'General')
        .filter(Boolean),
    ),
  ]
  const filteredResults = results.filter((result) => {
    const subject = result.test?.subject?.name || 'General'
    const term = search.trim().toLowerCase()

    if (subjectFilter && subject !== subjectFilter) return false
    if (!term) return true

    return [result.test?.title, subject]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })

  return (
    <DashboardLayout
      title="My Results"
      description="Your published academic performance and support insights."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Academic progress"
          title="My results"
          description="Only results published by your teachers appear here. Absent and missing results are shown transparently and are never counted as zero."
          action={
            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className={buttonSecondary}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                type="button"
                onClick={exportResults}
                disabled={!data || results.length === 0}
                className={buttonSecondary}
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!data}
                className={buttonPrimary}
              >
                Print report
              </button>
            </div>
          }
        />

        {exportError && <Notice tone="red">{exportError}</Notice>}

        {loading ? (
          <LoadingState label="Loading your results..." />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        ) : !data ? (
          <EmptyState
            title="No results available"
            description="Your published results will appear here once a teacher publishes them."
            icon="↗"
          />
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Published tests"
                value={kpis.publishedTests ?? 0}
                icon="↗"
                hint="Assessments with a result record for you"
              />
              <StatCard
                label="Average score"
                value={formatPercent(kpis.averagePercentage)}
                icon="◉"
                hint={`${kpis.scoredResults ?? 0} scored results included`}
              />
              <StatCard
                label="Pass rate"
                value={formatPercent(kpis.passPercentage)}
                icon="✓"
                hint={`${kpis.passCount ?? 0} pass · ${kpis.failCount ?? 0} below pass`}
              />
              <StatCard
                label="Best result"
                value={formatPercent(kpis.best?.percentage)}
                icon="☆"
                hint={
                  kpis.best?.test?.title
                    ? kpis.best.test.title
                    : 'No scored result yet'
                }
              />
            </section>

            <section className="grid items-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className={`${cardClass} p-5`}>
                <p className="text-xs font-bold uppercase tracking-wider text-[#19366e]">
                  Latest result
                </p>
                {kpis.latest ? (
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        {kpis.latest.test?.title || 'Assessment'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {kpis.latest.test?.subject?.name || 'General'} ·{' '}
                        {formatDate(
                          kpis.latest.test?.scheduledAt ||
                            kpis.latest.publishedAt,
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#19366e]">
                        {formatPercent(kpis.latest.percentage)}
                      </p>
                      <div className="mt-1 flex justify-end">
                        <AssessmentStatusBadge
                          status={kpis.latest.assessmentStatus}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    No published result has been recorded yet.
                  </p>
                )}

                {kpis.recentChange && (
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    Latest change in {kpis.recentChange.subject}:{' '}
                    <strong>{changeLabel(kpis.recentChange.delta)}</strong>{' '}
                    from {formatPercent(kpis.recentChange.from)} to{' '}
                    {formatPercent(kpis.recentChange.to)}.
                  </p>
                )}
              </div>

              <div className={`${cardClass} p-5`}>
                <p className="text-xs font-bold uppercase tracking-wider text-[#19366e]">
                  Attendance in assessments
                </p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {kpis.absentCount ?? 0}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Marked absent
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {kpis.missingCount ?? 0}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Marked missing
                    </p>
                  </div>
                </div>
                {(kpis.absentCount > 0 || kpis.missingCount > 0) && (
                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    These results are excluded from averages and pass
                    rates. Speak with your teacher if you believe a
                    record is incorrect.
                  </p>
                )}
              </div>
            </section>

            <section className="grid items-start gap-6 xl:grid-cols-2">
              <ChartCard
                title="Your score trend"
                description="Scored percentages across your latest published assessments."
                footer="Subject lines only connect results within the same subject name."
              >
                <LineChart
                  labels={data.trend?.labels || []}
                  series={data.trend?.series || []}
                  title="Your score trend"
                  emptyMessage="At least one scored published result is needed to draw your trend."
                />
              </ChartCard>

              <ChartCard
                title="Pass and below-pass outcomes"
                description="Your scored results only. Absent and missing results are not included."
              >
                <DonutChart
                  centerLabel="Scored"
                  segments={[
                    {
                      label: 'Pass',
                      value: kpis.passCount || 0,
                      color: '#0f766e',
                    },
                    {
                      label: 'Below pass',
                      value: kpis.failCount || 0,
                      color: '#b45309',
                    },
                  ]}
                />
              </ChartCard>
            </section>

            <ChartCard
              title="Your score distribution"
              description="The percentage bands where your scored results fall."
            >
              <HistogramChart
                data={data.distribution || []}
                title="Your score distribution"
                emptyMessage="No scored published results are available yet."
              />
            </ChartCard>

            <section className="grid items-start gap-6 xl:grid-cols-2">
              <section className={`${cardClass} overflow-hidden`}>
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Subject performance
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Averages use scored results only.
                  </p>
                </div>

                {subjects.length === 0 ? (
                  <p className="p-5 text-sm text-slate-500">
                    Subject insights will appear after scored results are
                    published.
                  </p>
                ) : (
                  <TableShell label="Subject performance table">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Subject</th>
                          <th className="px-4 py-3 font-semibold">Average</th>
                          <th className="px-4 py-3 font-semibold">Latest</th>
                          <th className="px-4 py-3 font-semibold">Change</th>
                          <th className="px-4 py-3 font-semibold">Pass rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subjects.map((subject) => (
                          <tr key={subject.name}>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {subject.name}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {formatPercent(subject.averagePercentage)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {formatPercent(subject.latestPercentage)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {subject.change == null
                                ? '—'
                                : `${subject.change > 0 ? '+' : ''}${subject.change} pts`}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {formatPercent(subject.passPercentage)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableShell>
                )}
              </section>

              <section className={`${cardClass} p-5`}>
                <h2 className="text-base font-bold text-slate-900">
                  What to focus on
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  These suggestions use your published scored results. They
                  are guidance, not a judgement.
                </p>

                <div className="mt-4 space-y-3">
                  {(data.recommendations || []).map((item, index) => (
                    <div
                      key={`${item.type}-${item.subject || index}`}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {item.message}
                      </p>
                    </div>
                  ))}
                </div>

                {data.strengths?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Strengths
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {data.strengths.map((subject) => (
                        <span
                          key={subject.name}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                        >
                          {subject.name} ·{' '}
                          {formatPercent(subject.averagePercentage)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.improvementAreas?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                      Areas to review
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {data.improvementAreas.map((subject) => (
                        <span
                          key={subject.name}
                          className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900"
                        >
                          {subject.name} ·{' '}
                          {formatPercent(subject.averagePercentage)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </section>

            <section className={`${cardClass} overflow-hidden`}>
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Published results
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Your result record for every published assessment.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 print:hidden">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className={inputClass}
                    placeholder="Search test or subject"
                    aria-label="Search published results"
                  />
                  <select
                    value={subjectFilter}
                    onChange={(event) =>
                      setSubjectFilter(event.target.value)
                    }
                    className={inputClass}
                    aria-label="Filter by subject"
                  >
                    <option value="">All subjects</option>
                    {subjectOptions.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No published results yet"
                    description="Your teacher has not published a result for you yet."
                    icon="↗"
                  />
                </div>
              ) : filteredResults.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">
                  No results match this search.
                </p>
              ) : (
                <TableShell label="Published results table">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Test</th>
                        <th className="px-4 py-3 font-semibold">Subject</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Result state</th>
                        <th className="px-4 py-3 font-semibold">Marks</th>
                        <th className="px-4 py-3 font-semibold">Percentage</th>
                        <th className="px-4 py-3 font-semibold">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResults.map((result) => (
                        <tr key={result.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {result.test?.title || 'Assessment'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {classLabel(result.test?.class)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {result.test?.subject?.name || 'General'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(
                              result.test?.scheduledAt ||
                                result.publishedAt,
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <AssessmentStatusBadge
                              status={result.assessmentStatus}
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {result.assessmentStatus === 'entered'
                              ? `${result.marksObtained}/${result.maxMarks}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#19366e]">
                            {formatPercent(result.percentage)}
                          </td>
                          <td className="px-4 py-3">
                            <PassStateBadge pass={result.pass} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableShell>
              )}
            </section>

            {data.upcomingTests?.length > 0 && (
              <section className={cardClass}>
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Upcoming tests
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {data.upcomingTests.map((test) => (
                    <div
                      key={test.id}
                      className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {test.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {test.subject?.name || 'General'} · Maximum{' '}
                          {test.maxMarks}
                        </p>
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        {formatDate(test.scheduledAt)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 px-5 py-3">
                  <Link
                    to="/student/tests"
                    className="text-xs font-bold text-blue-800 hover:underline"
                  >
                    View all tests
                  </Link>
                </div>
              </section>
            )}

            <section className={`${cardClass} p-5`}>
              <h2 className="text-sm font-bold text-slate-900">
                How these numbers are calculated
              </h2>
              <div className="mt-3 grid gap-3 text-xs leading-5 text-slate-600 md:grid-cols-2">
                <p>{data.methodology?.passPolicy}</p>
                <p>{data.methodology?.averagePolicy}</p>
                <p>{data.methodology?.studentInclusion}</p>
                <p>{data.methodology?.ranking}</p>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
