import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
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
  StatCard,
} from '../common/DashboardUI.jsx'
import {
  AssessmentStatusBadge,
  PassStateBadge,
  PublicationBadge,
  TableShell,
} from './AnalyticsUI.jsx'
import {
  BarChart,
  ChartCard,
  DonutChart,
  HistogramChart,
  LineChart,
} from './Charts.jsx'
import { downloadCsv, safeFileName } from '../../lib/csv.js'
import {
  apiRequest,
  buildQuery,
  downloadFile,
} from '../../lib/api.js'

const emptyFilters = {
  classId: '',
  subjectId: '',
  from: '',
  to: '',
  status: '',
}

function formatDate(value) {
  if (!value) return 'Not scheduled'
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
  if (!item) return 'Unassigned class'
  return [item.name, item.section].filter(Boolean).join(' - ')
}

function subjectLabel(item) {
  return item?.name || item?.subject?.name || 'General'
}

function deltaLabel(value, suffix = ' pts') {
  if (value == null) return 'Not comparable'
  if (value === 0) return 'No change'
  return `${value > 0 ? '+' : ''}${value}${suffix}`
}

function statusLabel(summary) {
  if (summary.resultsPublishedAt) return 'Results published'
  if (summary.status === 'published') return 'Test live'
  if (summary.status === 'closed') return 'Closed'
  return 'Draft'
}

export default function StaffAnalyticsView({ role = 'teacher' }) {
  const isAdmin = role === 'admin'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [filters, setFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [selectedTestId, setSelectedTestId] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailSearch, setDetailSearch] = useState('')
  const [detailReloadKey, setDetailReloadKey] = useState(0)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    apiRequest(
      `/api/v1/analytics/overview${buildQuery(appliedFilters)}`,
      { signal: controller.signal },
    )
      .then((result) => setData(result.data))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load result analytics.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [appliedFilters, reloadKey])

  useEffect(() => {
    if (!selectedTestId) return undefined

    const controller = new AbortController()

    apiRequest(`/api/v1/analytics/tests/${selectedTestId}`, {
      signal: controller.signal,
    })
      .then((result) => setDetail(result.data))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setDetailError(
            err.message || 'Unable to load this assessment.',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false)
      })

    return () => controller.abort()
  }, [selectedTestId, detailReloadKey])

  function beginLoad() {
    setLoading(true)
    setError('')
  }

  function applyFilters(event) {
    event.preventDefault()
    beginLoad()
    setAppliedFilters({ ...filters })
    setSelectedTestId('')
    setDetail(null)
  }

  function resetFilters() {
    beginLoad()
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setSelectedTestId('')
    setDetail(null)
  }

  function openDetail(testId) {
    setSelectedTestId(testId)
    setDetailSearch('')
    setDetailError('')
    setExportError('')
    setDetailLoading(true)
  }

  function closeDetail() {
    setSelectedTestId('')
    setDetail(null)
    setDetailError('')
    setDetailSearch('')
    setDetailLoading(false)
  }

  function exportSummary() {
    if (!data) return

    downloadCsv(
      safeFileName(`${role}-results-summary`),
      [
        'Test',
        'Class',
        'Subject',
        'Scheduled date',
        'Publication',
        'Expected students',
        'Scored results',
        'Average %',
        'Pass %',
        'Highest %',
        'Lowest %',
        'Pending evaluation',
      ],
      data.tests.map((test) => [
        test.title,
        classLabel(test.class),
        subjectLabel(test),
        test.scheduledAt
          ? new Date(test.scheduledAt).toISOString().slice(0, 10)
          : '',
        statusLabel(test),
        test.expectedStudents,
        test.scoredCount,
        test.averagePercentage ?? '',
        test.passPercentage ?? '',
        test.highestPercentage ?? '',
        test.lowestPercentage ?? '',
        test.pendingEvaluation,
      ]),
    )
  }

  async function exportTest() {
    if (!selectedTestId) return
    setExportError('')

    try {
      await downloadFile(
        `/api/v1/analytics/export${buildQuery({
          testId: selectedTestId,
        })}`,
        `${safeFileName(detail?.test?.title || 'test-results')}`,
      )
    } catch (err) {
      setExportError(err.message || 'Unable to export this test.')
    }
  }

  const classOptions = data?.filterOptions?.classes || []
  const subjectOptions = (
    data?.filterOptions?.subjects || []
  ).filter(
    (subject) =>
      !filters.classId || subject.classId === filters.classId,
  )
  const kpis = data?.kpis || {}
  const classChart = (data?.classComparison || []).map((item) => ({
    label: item.label,
    value: item.averagePercentage,
  }))
  const subjectChart = (data?.subjectComparison || []).map((item) => ({
    label: item.label,
    value: item.averagePercentage,
  }))
  const rows = (detail?.rows || []).filter((row) => {
    const term = detailSearch.trim().toLowerCase()
    if (!term) return true

    return [row.student.name, row.student.rollNumber]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
  const detailTest = detail?.test
  const detailSummary = detail?.summary
  const comparison = detail?.comparison

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isAdmin ? 'Institute assessment intelligence' : 'Teaching intelligence'}
        title={isAdmin ? 'Institute results analytics' : 'Class results analytics'}
        description={
          isAdmin
            ? 'Track assessment coverage, score quality, pass rates, and classes that need support across the institute.'
            : 'Understand how your classes are performing, where marks are still missing, and which students may need support.'
        }
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                beginLoad()
                setReloadKey((key) => key + 1)
              }}
              className={buttonSecondary}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={exportSummary}
              disabled={!data || data.tests?.length === 0}
              className={buttonPrimary}
            >
              Export summary CSV
            </button>
            <Link
              to={isAdmin ? '/admin/tests' : '/teacher/tests'}
              className={buttonSecondary}
            >
              Open tests
            </Link>
          </div>
        }
      />

      {error && (
        <Notice tone="red">
          {error}{' '}
          <button
            type="button"
            onClick={() => {
              beginLoad()
              setReloadKey((key) => key + 1)
            }}
            className="font-bold underline"
          >
            Try again
          </button>
        </Notice>
      )}

      <section className={`${cardClass} p-4 sm:p-5`}>
        <form
          onSubmit={applyFilters}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"
        >
          <label className="text-sm font-semibold text-slate-700">
            Class
            <select
              value={filters.classId}
              onChange={(event) => {
                setFilters((current) => ({
                  ...current,
                  classId: event.target.value,
                  subjectId: '',
                }))
              }}
              className={`${inputClass} mt-2`}
            >
              <option value="">All classes</option>
              {classOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Subject
            <select
              value={filters.subjectId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  subjectId: event.target.value,
                }))
              }
              className={`${inputClass} mt-2`}
            >
              <option value="">All subjects</option>
              {subjectOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            From
            <input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
              className={`${inputClass} mt-2`}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            To
            <input
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
              className={`${inputClass} mt-2`}
            />
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Test status
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              className={`${inputClass} mt-2`}
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published to students</option>
              <option value="closed">Closed</option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button type="submit" className={`${buttonPrimary} flex-1`}>
              Apply
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className={buttonSecondary}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      {data?.bounded?.truncated && (
        <Notice tone="amber">
          Showing analytics for the first {data.bounded.loadedTests} of{' '}
          {data.bounded.totalTests} matching assessments. Narrow the
          filters for a complete comparison.
        </Notice>
      )}

      {loading ? (
        <LoadingState label="Calculating result analytics..." />
      ) : error ? (
        <ErrorState
          message="Result analytics could not be loaded."
          onRetry={() => {
            beginLoad()
            setReloadKey((key) => key + 1)
          }}
        />
      ) : !data ? (
        <EmptyState
          title="No analytics available"
          description="Create assessments and enter results to start building the analysis."
          icon="↗"
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Assessments"
              value={kpis.assessments ?? 0}
              icon="▤"
              hint={`${kpis.publishedAssessments ?? 0} with published results · ${kpis.draftAssessments ?? 0} pending publication`}
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
              label="Pending evaluation"
              value={kpis.pendingEvaluation ?? 0}
              icon="◷"
              hint="Not entered plus missing-result records"
            />
            <StatCard
              label="Students needing review"
              value={kpis.studentsNeedingReview ?? 0}
              icon="!"
              hint="Scored below the pass mark in at least one assessment"
            />
            <StatCard
              label="Marks recorded"
              value={kpis.recordedStudents ?? 0}
              icon="◫"
              hint={`${kpis.enteredMarks ?? 0} entered · ${kpis.expectedStudents ?? 0} expected across assessments`}
            />
          </section>

          <section className="grid items-start gap-6 xl:grid-cols-2">
            <ChartCard
              title="Assessment trend"
              description="Average score and pass rate across the latest assessed tests, using percentages."
              footer="Only tests with at least one scored result appear in the trend."
            >
              <LineChart
                labels={data.trend?.labels || []}
                series={data.trend?.series || []}
                title="Average and pass-rate trend"
                emptyMessage="No scored assessments are available for the current filters."
              />
            </ChartCard>

            <ChartCard
              title="Pass and below-pass split"
              description="Scored results only. Absent, missing, exempt, and unentered records are reported separately."
            >
              <DonutChart
                segments={[
                  {
                    label: 'Pass',
                    value: data.passFail?.passCount || 0,
                    color: '#0f766e',
                  },
                  {
                    label: 'Below pass',
                    value: data.passFail?.failCount || 0,
                    color: '#b45309',
                  },
                ]}
              />
            </ChartCard>
          </section>

          <section className="grid items-start gap-6 xl:grid-cols-2">
            <ChartCard
              title="Average score by class"
              description="Weighted by the number of scored results in each class."
            >
              <BarChart
                data={classChart}
                title="Average score by class"
                emptyMessage="No class comparison is available yet."
              />
            </ChartCard>

            <ChartCard
              title="Average score by subject"
              description="Weighted by scored results across the filtered assessments."
            >
              <BarChart
                data={subjectChart}
                title="Average score by subject"
                emptyMessage="No subject comparison is available yet."
              />
            </ChartCard>
          </section>

          <ChartCard
            title="Score distribution"
            description="How scored percentages are distributed across the configured score bands."
            footer="Use the assessment table to inspect a specific test, including absent and unentered rows."
          >
            <HistogramChart
              data={data.distribution || []}
              title="Score distribution"
            />
          </ChartCard>

          <section className={`${cardClass} overflow-hidden`}>
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Assessments
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Select an assessment to inspect student-level results,
                  comparison, and export options.
                </p>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                {data.tests?.length || 0} shown
              </p>
            </div>

            {data.tests?.length ? (
              <TableShell label="Assessment analytics table">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Test</th>
                      <th className="px-4 py-3 font-semibold">Class</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Coverage</th>
                      <th className="px-4 py-3 font-semibold">Average</th>
                      <th className="px-4 py-3 font-semibold">Pass</th>
                      <th className="px-4 py-3 font-semibold">Publication</th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Analysis
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.tests.map((test) => (
                      <tr key={test.testId} className="align-top">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {test.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {subjectLabel(test.subject)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {classLabel(test.class)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(test.scheduledAt)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          <p>
                            {test.scoredCount}/{test.expectedStudents}{' '}
                            scored
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {test.notEntered || 0} not entered ·{' '}
                            {test.absent || 0} absent
                          </p>
                        </td>
                        <td className="px-4 py-4 font-semibold text-[#19366e]">
                          {formatPercent(test.averagePercentage)}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatPercent(test.passPercentage)}
                        </td>
                        <td className="px-4 py-4">
                          <PublicationBadge
                            publishedAt={test.resultsPublishedAt}
                            status={test.status}
                          />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openDetail(test.testId)}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableShell>
            ) : (
              <div className="p-5">
                <EmptyState
                  title="No assessments match these filters"
                  description="Adjust the class, subject, date range, or status to see more results."
                  icon="▤"
                />
              </div>
            )}
          </section>

          <section className={`${cardClass} p-5`}>
            <h2 className="text-sm font-bold text-slate-900">
              How these numbers are calculated
            </h2>
            <div className="mt-3 grid gap-3 text-xs leading-5 text-slate-600 md:grid-cols-2">
              <p>{data.methodology?.passPolicy}</p>
              <p>{data.methodology?.averagePolicy}</p>
              <p>{data.methodology?.staffInclusion}</p>
              <p>{data.methodology?.expectedStudents}</p>
            </div>
          </section>
        </>
      )}

      <Modal
        open={Boolean(selectedTestId)}
        title={detailTest?.title || 'Assessment analysis'}
        description={
          detailTest
            ? `${classLabel(detailTest.class)} · ${subjectLabel(detailTest.subject)} · ${formatDate(detailTest.scheduledAt)}`
            : 'Student-level result detail.'
        }
        onClose={closeDetail}
        wide
      >
        {detailError && (
          <Notice tone="red">
            {detailError}{' '}
            <button
              type="button"
              onClick={() => {
                setDetailError('')
                setDetailLoading(true)
                setDetailReloadKey((key) => key + 1)
              }}
              className="font-bold underline"
            >
              Try again
            </button>
          </Notice>
        )}
        {exportError && <Notice tone="red">{exportError}</Notice>}

        {detailLoading ? (
          <LoadingState label="Loading assessment analysis..." />
        ) : detail && detailSummary ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Average</p>
                <p className="mt-1 text-xl font-bold text-[#19366e]">
                  {formatPercent(detailSummary.averagePercentage)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Pass rate</p>
                <p className="mt-1 text-xl font-bold text-[#19366e]">
                  {formatPercent(detailSummary.passPercentage)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Highest / lowest</p>
                <p className="mt-1 text-xl font-bold text-[#19366e]">
                  {formatPercent(detailSummary.highestPercentage)} /{' '}
                  {formatPercent(detailSummary.lowestPercentage)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Coverage</p>
                <p className="mt-1 text-xl font-bold text-[#19366e]">
                  {detailSummary.scoredCount}/
                  {detailSummary.expectedStudents}
                </p>
              </div>
            </div>

            {comparison && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                <p className="font-bold">
                  Compared with {comparison.test.title}
                </p>
                <p className="mt-1">
                  Average score {deltaLabel(comparison.averageDelta)}{' '}
                  · pass rate {deltaLabel(comparison.passDelta)}.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="block max-w-sm flex-1 text-sm font-semibold text-slate-700">
                Find a student
                <input
                  value={detailSearch}
                  onChange={(event) =>
                    setDetailSearch(event.target.value)
                  }
                  className={`${inputClass} mt-2`}
                  placeholder="Name or roll number"
                />
              </label>

              <button
                type="button"
                onClick={exportTest}
                className={buttonPrimary}
                disabled={!detailSummary.expectedStudents}
              >
                Export test CSV
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto rounded-xl border border-slate-200">
              {rows.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">
                  No student rows match this search.
                </p>
              ) : (
                <TableShell label="Student result detail table">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Student</th>
                        <th className="px-4 py-3 font-semibold">Roll</th>
                        <th className="px-4 py-3 font-semibold">Result state</th>
                        <th className="px-4 py-3 font-semibold">Marks</th>
                        <th className="px-4 py-3 font-semibold">Percentage</th>
                        <th className="px-4 py-3 font-semibold">Outcome</th>
                        <th className="px-4 py-3 font-semibold">Publication</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => (
                        <tr
                          key={`${row.id || 'expected'}-${row.student.id}`}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {row.student.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.student.rollNumber || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <AssessmentStatusBadge
                              status={row.assessmentStatus}
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {row.assessmentStatus === 'entered'
                              ? `${row.marksObtained}/${row.maxMarks}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#19366e]">
                            {formatPercent(row.percentage)}
                          </td>
                          <td className="px-4 py-3">
                            <PassStateBadge pass={row.pass} />
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {row.resultStatus === 'published'
                              ? `Published ${formatDate(row.publishedAt)}`
                              : row.resultStatus === 'draft'
                                ? 'Draft'
                                : 'Not entered'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableShell>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs leading-5 text-slate-500">
                Expected students: {detailSummary.expectedStudents}.{' '}
                Absent {detailSummary.absent}, missing{' '}
                {detailSummary.missing}, exempt {detailSummary.exempt},
                not entered {detailSummary.notEntered}.
              </p>
              <button
                type="button"
                onClick={closeDetail}
                className={buttonSecondary}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Assessment detail unavailable"
            description="Try loading this assessment again."
            icon="↗"
          />
        )}
      </Modal>
    </div>
  )
}
