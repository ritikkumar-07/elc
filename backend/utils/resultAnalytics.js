export const DEFAULT_PASS_PERCENTAGE = 33
export const STRENGTH_THRESHOLD = 70
export const SUPPORT_THRESHOLD = 50
export const MIN_SUBJECT_SAMPLE = 2
export const REVIEW_AVERAGE_THRESHOLD = 40
export const TREND_CHANGE_THRESHOLD = 10
export const MIN_STUDENT_TREND_SAMPLE = 3

export const DEFAULT_BANDS = [
  { label: '0–39%', min: 0, max: 40 },
  { label: '40–49%', min: 40, max: 50 },
  { label: '50–59%', min: 50, max: 60 },
  { label: '60–69%', min: 60, max: 70 },
  { label: '70–79%', min: 70, max: 80 },
  { label: '80–89%', min: 80, max: 90 },
  { label: '90–100%', min: 90, max: 100.001 },
]

const ASSESSMENT_STATUSES = [
  'entered',
  'absent',
  'missing',
  'exempt',
]

function isPresent(value) {
  return value !== null && value !== undefined && value !== ''
}

export function toFiniteNumber(value) {
  if (!isPresent(value)) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function round2(value) {
  const number = toFiniteNumber(value)
  return number == null ? null : Number(number.toFixed(2))
}

export function percentageFor(marksObtained, maxMarks) {
  const obtained = toFiniteNumber(marksObtained)
  const maximum = toFiniteNumber(maxMarks)

  if (obtained == null || maximum == null || maximum <= 0) {
    return null
  }

  if (obtained < 0 || obtained > maximum) {
    return null
  }

  return round2((obtained / maximum) * 100)
}

export function effectivePassingMarks(test) {
  const maximum = toFiniteNumber(test?.maxMarks)
  if (maximum == null || maximum <= 0) return null

  const configured = toFiniteNumber(test?.passingMarks)
  const value =
    configured != null && configured >= 0
      ? configured
      : maximum * (DEFAULT_PASS_PERCENTAGE / 100)

  return round2(Math.min(Math.max(value, 0), maximum))
}

export function normalizeAssessmentStatus(mark) {
  const raw = mark?.assessmentStatus

  if (ASSESSMENT_STATUSES.includes(raw)) {
    if (raw === 'entered') {
      return toFiniteNumber(mark?.marksObtained) == null
        ? 'missing'
        : 'entered'
    }

    return raw
  }

  return toFiniteNumber(mark?.marksObtained) == null
    ? 'missing'
    : 'entered'
}

export function scorePercentage(mark, test) {
  if (normalizeAssessmentStatus(mark) !== 'entered') return null

  return percentageFor(
    mark?.marksObtained,
    toFiniteNumber(mark?.maxMarks) ?? test?.maxMarks,
  )
}

export function passState(mark, test) {
  const percentage = scorePercentage(mark, test)
  const passingMarks = effectivePassingMarks(test)

  if (percentage == null || passingMarks == null) return null

  return toFiniteNumber(mark.marksObtained) >= passingMarks
}

export function mean(values) {
  const numbers = (values || []).filter(
    (value) => toFiniteNumber(value) != null,
  )

  if (numbers.length === 0) return null

  return round2(
    numbers.reduce((sum, value) => sum + Number(value), 0) /
      numbers.length,
  )
}

export function median(values) {
  const numbers = (values || [])
    .map((value) => toFiniteNumber(value))
    .filter((value) => value != null)
    .sort((a, b) => a - b)

  if (numbers.length === 0) return null

  const middle = Math.floor(numbers.length / 2)

  if (numbers.length % 2 === 1) {
    return round2(numbers[middle])
  }

  return round2((numbers[middle - 1] + numbers[middle]) / 2)
}

export function buildDistribution(percentages, bands = DEFAULT_BANDS) {
  const values = (percentages || []).filter(
    (value) => toFiniteNumber(value) != null,
  )

  return bands.map((band, index) => ({
    label: band.label,
    min: band.min,
    max: band.max,
    count: values.filter((value) => {
      if (index === bands.length - 1) {
        return value >= band.min && value <= band.max
      }

      return value >= band.min && value < band.max
    }).length,
  }))
}

export function parseBands(value) {
  if (!value) return DEFAULT_BANDS

  const parts = String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0 || parts.length > 20) {
    throw new Error('Provide between 1 and 20 score bands.')
  }

  const bands = []
  let expectedMin = 0

  for (const part of parts) {
    const match = part.match(
      /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/,
    )

    if (!match) {
      throw new Error('Score bands must use the format 0-40,40-60,60-100.')
    }

    const min = Number(match[1])
    const max = Number(match[2])

    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min !== expectedMin ||
      max <= min ||
      max > 100
    ) {
      throw new Error(
        'Score bands must be contiguous, ascending, and cover 0 to 100.',
      )
    }

    bands.push({
      label: `${min}–${max}%`,
      min,
      max: max === 100 ? 100.001 : max,
    })

    expectedMin = max
  }

  if (expectedMin !== 100) {
    throw new Error('Score bands must cover 0 to 100.')
  }

  return bands
}

function uniqueStudentCount(marks) {
  return new Set(
    (marks || []).map((mark) => {
      const student = mark.student?._id || mark.student
      return student ? String(student) : ''
    }),
  ).size
}

function summaryBaseFromStats(test, stats = {}) {
  const entered = Number(stats.entered || 0)
  const absent = Number(stats.absent || 0)
  const missing = Number(stats.missing || 0)
  const exempt = Number(stats.exempt || 0)
  const recordedStudents = Number(stats.recorded || 0)
  const expectedStudents = Number(
    stats.expectedStudents ?? stats.expected ?? 0,
  )
  const notEntered = Math.max(expectedStudents - recordedStudents, 0)
  const passCount = Number(stats.passCount || 0)
  const failCount = Number(stats.failCount || 0)
  const scoredCount = passCount + failCount
  const invalidMarks = Math.max(
    entered - scoredCount,
    0,
  )

  return {
    testId: String(test._id || test.id || ''),
    title: test.title || 'Test',
    class: test.class || null,
    subject: test.subject || null,
    maxMarks: toFiniteNumber(test.maxMarks),
    passingMarks: effectivePassingMarks(test),
    scheduledAt: test.scheduledAt || null,
    status: test.status || 'draft',
    resultsPublishedAt: test.resultsPublishedAt || null,
    expectedStudents,
    recordedStudents,
    notEntered,
    present: entered,
    entered,
    absent,
    missing,
    exempt,
    invalidMarks,
    scoredCount,
    pendingEvaluation: notEntered + missing + invalidMarks,
    averageMarks: round2(stats.averageMarks),
    averagePercentage: round2(stats.averagePercentage),
    medianPercentage: round2(stats.medianPercentage),
    highestMarks:
      stats.highestMarks == null ? null : round2(stats.highestMarks),
    lowestMarks:
      stats.lowestMarks == null ? null : round2(stats.lowestMarks),
    highestPercentage:
      stats.highestPercentage == null
        ? null
        : round2(stats.highestPercentage),
    lowestPercentage:
      stats.lowestPercentage == null
        ? null
        : round2(stats.lowestPercentage),
    passCount,
    failCount,
    passPercentage:
      scoredCount > 0 ? round2((passCount / scoredCount) * 100) : null,
    distribution: stats.distribution || [],
    lastUpdated:
      stats.lastUpdated || test.updatedAt || test.createdAt || null,
  }
}

export function summarizeTestStats({
  test,
  stats = {},
  expectedStudents = 0,
}) {
  return summaryBaseFromStats(test, {
    ...stats,
    expectedStudents,
  })
}

export function summarizeTestRecords({
  test,
  marks = [],
  expectedStudents = 0,
  bands = DEFAULT_BANDS,
}) {
  const records = marks || []
  const counts = {
    entered: 0,
    absent: 0,
    missing: 0,
    exempt: 0,
  }
  const percentages = []
  const marksValues = []
  let passCount = 0
  let failCount = 0
  let highestMarks = null
  let lowestMarks = null
  let lastUpdated = null

  for (const mark of records) {
    const state = normalizeAssessmentStatus(mark)
    counts[state] += 1

    const updatedAt = mark.updatedAt ? new Date(mark.updatedAt) : null
    if (updatedAt && (!lastUpdated || updatedAt > lastUpdated)) {
      lastUpdated = updatedAt
    }

    if (state !== 'entered') continue

    const percentage = scorePercentage(mark, test)
    const obtained = toFiniteNumber(mark.marksObtained)

    if (percentage == null || obtained == null) continue

    percentages.push(percentage)
    marksValues.push(obtained)

    const passingMarks = effectivePassingMarks(test)

    if (passingMarks != null && obtained >= passingMarks) {
      passCount += 1
    } else {
      failCount += 1
    }

    highestMarks =
      highestMarks == null ? obtained : Math.max(highestMarks, obtained)
    lowestMarks =
      lowestMarks == null ? obtained : Math.min(lowestMarks, obtained)
  }

  const scoredCount = percentages.length
  const recordedStudents = uniqueStudentCount(records)
  const summary = summaryBaseFromStats(test, {
    entered: counts.entered,
    absent: counts.absent,
    missing: counts.missing,
    exempt: counts.exempt,
    recorded: recordedStudents,
    expectedStudents,
    averageMarks: mean(marksValues),
    averagePercentage: mean(percentages),
    medianPercentage: median(percentages),
    highestMarks,
    lowestMarks,
    highestPercentage:
      scoredCount > 0 ? Math.max(...percentages) : null,
    lowestPercentage:
      scoredCount > 0 ? Math.min(...percentages) : null,
    passCount,
    failCount,
    lastUpdated,
  })

  return {
    ...summary,
    distribution: buildDistribution(percentages, bands),
  }
}

export function buildAssessmentTrend(summaries, maxPoints = 12) {
  const rows = (summaries || [])
    .filter((item) => item.averagePercentage != null)
    .sort((a, b) => {
      const left =
        new Date(a.scheduledAt || a.lastUpdated || 0).getTime() || 0
      const right =
        new Date(b.scheduledAt || b.lastUpdated || 0).getTime() || 0
      return left - right
    })
    .slice(-maxPoints)

  return {
    labels: rows.map((item) => item.title),
    dates: rows.map(
      (item) => item.scheduledAt || item.lastUpdated || null,
    ),
    sampleCounts: rows.map((item) => item.scoredCount || 0),
    totalScored: rows.reduce(
      (total, item) => total + (item.scoredCount || 0),
      0,
    ),
    series: [
      {
        name: 'Average %',
        values: rows.map((item) => item.averagePercentage),
      },
      {
        name: 'Pass %',
        values: rows.map((item) => item.passPercentage),
      },
    ],
  }
}

export function groupTestSummaries(
  summaries,
  keyFn,
  medianByKey = null,
) {
  const groups = new Map()

  for (const item of summaries || []) {
    const key = keyFn(item)
    if (!key) continue

    if (!groups.has(key)) {
      groups.set(key, {
        label: key,
        tests: 0,
        scoredCount: 0,
        expectedStudents: 0,
        recordedStudents: 0,
        notEntered: 0,
        pendingEvaluation: 0,
        absent: 0,
        missing: 0,
        exempt: 0,
        invalidMarks: 0,
        passCount: 0,
        failCount: 0,
        weightedScore: 0,
        highestPercentage: null,
        lowestPercentage: null,
        distribution: [],
      })
    }

    const group = groups.get(key)
    group.tests += 1
    group.scoredCount += item.scoredCount || 0
    group.expectedStudents += item.expectedStudents || 0
    group.recordedStudents += item.recordedStudents || 0
    group.notEntered += item.notEntered || 0
    group.pendingEvaluation += item.pendingEvaluation || 0
    group.absent += item.absent || 0
    group.missing += item.missing || 0
    group.exempt += item.exempt || 0
    group.invalidMarks += item.invalidMarks || 0
    group.passCount += item.passCount || 0
    group.failCount += item.failCount || 0

    if (item.averagePercentage != null && item.scoredCount > 0) {
      group.weightedScore +=
        item.averagePercentage * item.scoredCount
    }

    if (
      item.highestPercentage != null &&
      (group.highestPercentage == null ||
        item.highestPercentage > group.highestPercentage)
    ) {
      group.highestPercentage = item.highestPercentage
    }

    if (
      item.lowestPercentage != null &&
      (group.lowestPercentage == null ||
        item.lowestPercentage < group.lowestPercentage)
    ) {
      group.lowestPercentage = item.lowestPercentage
    }

    if (Array.isArray(item.distribution)) {
      item.distribution.forEach((band, index) => {
        if (!group.distribution[index]) {
          group.distribution[index] = {
            label: band.label,
            min: band.min,
            max: band.max,
            count: 0,
          }
        }

        group.distribution[index].count += Number(band.count || 0)
      })
    }
  }

  return [...groups.values()]
    .map((group) => ({
      label: group.label,
      tests: group.tests,
      scoredCount: group.scoredCount,
      expectedStudents: group.expectedStudents,
      recordedStudents: group.recordedStudents,
      notEntered: group.notEntered,
      pendingEvaluation: group.pendingEvaluation,
      absent: group.absent,
      missing: group.missing,
      exempt: group.exempt,
      invalidMarks: group.invalidMarks,
      passCount: group.passCount,
      failCount: group.failCount,
      averagePercentage:
        group.scoredCount > 0
          ? round2(group.weightedScore / group.scoredCount)
          : null,
      medianPercentage: medianByKey?.get(group.label) ?? null,
      passPercentage:
        group.passCount + group.failCount > 0
          ? round2(
              (group.passCount /
                (group.passCount + group.failCount)) *
                100,
            )
          : null,
      highestPercentage: group.highestPercentage,
      lowestPercentage: group.lowestPercentage,
      distribution: group.distribution.filter(Boolean),
    }))
    .sort((a, b) => {
      if (a.averagePercentage == null) return 1
      if (b.averagePercentage == null) return -1
      return b.averagePercentage - a.averagePercentage
    })
}

function resultDate(result) {
  return new Date(
    result.test.scheduledAt ||
      result.publishedAt ||
      result.test.createdAt ||
      0,
  ).getTime()
}

function subjectNameFor(result) {
  return result.test.subject?.name || 'General'
}

function buildSubjectStats(results) {
  const groups = new Map()

  for (const result of results) {
    const subject = subjectNameFor(result)

    if (!groups.has(subject)) {
      groups.set(subject, {
        name: subject,
        totalResults: 0,
        scoredCount: 0,
        passCount: 0,
        failCount: 0,
        percentages: [],
        scoredRows: [],
      })
    }

    const group = groups.get(subject)
    group.totalResults += 1

    if (result.assessmentStatus === 'entered' && result.percentage != null) {
      group.scoredCount += 1
      group.percentages.push(result.percentage)
      group.scoredRows.push(result)

      if (result.pass === true) group.passCount += 1
      else group.failCount += 1
    }
  }

  return [...groups.values()]
    .map((group) => {
      const sorted = group.scoredRows.sort(
        (a, b) => resultDate(a) - resultDate(b),
      )
      const previous = sorted[sorted.length - 2]
      const latest = sorted[sorted.length - 1]

      return {
        name: group.name,
        totalResults: group.totalResults,
        scoredCount: group.scoredCount,
        averagePercentage: mean(group.percentages),
        passPercentage:
          group.scoredCount > 0
            ? round2((group.passCount / group.scoredCount) * 100)
            : null,
        latestPercentage: latest?.percentage ?? null,
        change:
          latest && previous
            ? round2(latest.percentage - previous.percentage)
            : null,
      }
    })
    .sort((a, b) => {
      if (a.averagePercentage == null) return 1
      if (b.averagePercentage == null) return -1
      return b.averagePercentage - a.averagePercentage
    })
}

function buildStudentTrend(results, maxPoints = 12) {
  const scored = results
    .filter(
      (result) =>
        result.assessmentStatus === 'entered' &&
        result.percentage != null,
    )
    .sort((a, b) => resultDate(a) - resultDate(b))
    .slice(-maxPoints)

  const labels = scored.map(
    (result) =>
      `${result.test.title} · ${new Date(
        result.test.scheduledAt || result.publishedAt,
      ).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })}`,
  )

  const subjectCounts = new Map()
  for (const result of scored) {
    const subject = subjectNameFor(result)
    subjectCounts.set(subject, (subjectCounts.get(subject) || 0) + 1)
  }

  const subjects = [...subjectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name)

  return {
    labels,
    series: subjects.map((subject) => ({
      name: subject,
      values: labels.map((_, index) => {
        const result = scored[index]
        return subjectNameFor(result) === subject
          ? result.percentage
          : null
      }),
    })),
  }
}

function latestComparableChange(results) {
  const groups = new Map()

  for (const result of results) {
    if (result.assessmentStatus !== 'entered') continue
    if (result.percentage == null) continue

    const subject = subjectNameFor(result)
    if (!groups.has(subject)) groups.set(subject, [])
    groups.get(subject).push(result)
  }

  const changes = []

  for (const [subject, rows] of groups.entries()) {
    const sorted = rows.sort((a, b) => resultDate(a) - resultDate(b))
    if (sorted.length < 2) continue

    const latest = sorted[sorted.length - 1]
    const previous = sorted[sorted.length - 2]

    changes.push({
      subject,
      delta: round2(latest.percentage - previous.percentage),
      from: previous.percentage,
      to: latest.percentage,
      latestTitle: latest.test.title,
      previousTitle: previous.test.title,
      date: latest.test.scheduledAt || latest.publishedAt,
    })
  }

  return changes.sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
  )[0] || null
}

function deriveInsights(subjectStats) {
  const eligible = subjectStats.filter(
    (subject) => subject.scoredCount >= MIN_SUBJECT_SAMPLE,
  )

  return {
    strengths: eligible
      .filter(
        (subject) =>
          subject.averagePercentage != null &&
          subject.averagePercentage >= STRENGTH_THRESHOLD,
      )
      .sort((a, b) => b.averagePercentage - a.averagePercentage),
    improvementAreas: eligible
      .filter(
        (subject) =>
          (subject.averagePercentage != null &&
            subject.averagePercentage < SUPPORT_THRESHOLD) ||
          (subject.change != null && subject.change <= -10),
      )
      .sort((a, b) => {
        const left = a.averagePercentage ?? 0
        const right = b.averagePercentage ?? 0
        return left - right
      }),
  }
}

function buildRecommendations(subjectStats, results) {
  const recommendations = []
  const eligible = subjectStats.filter(
    (subject) => subject.scoredCount >= MIN_SUBJECT_SAMPLE,
  )
  const absentOrMissing = results.filter((result) =>
    ['absent', 'missing'].includes(result.assessmentStatus),
  ).length

  for (const subject of eligible) {
    if (
      subject.averagePercentage != null &&
      subject.averagePercentage < 40
    ) {
      recommendations.push({
        type: 'practice',
        subject: subject.name,
        title: `Practice ${subject.name}`,
        message: `Your average in ${subject.name} is ${subject.averagePercentage}% across ${subject.scoredCount} scored assessments. Review the relevant study materials and practise similar questions.`,
      })
    } else if (subject.change != null && subject.change <= -10) {
      recommendations.push({
        type: 'review',
        subject: subject.name,
        title: `Review recent ${subject.name} work`,
        message: `Your latest ${subject.name} result changed by ${subject.change} percentage points. Review the topics from that assessment and clarify doubts with your teacher.`,
      })
    }
  }

  if (absentOrMissing > 0) {
    recommendations.push({
      type: 'follow-up',
      subject: null,
      title: 'Check missing assessments',
      message: `${absentOrMissing} published assessment${absentOrMissing === 1 ? ' has' : 's have'} an absent or missing result. Speak with your teacher if you believe this is incorrect.`,
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'keep-going',
      subject: null,
      title: 'Keep building your record',
      message:
        'Recommendations become more specific after at least two scored assessments in a subject.',
    })
  }

  return recommendations.slice(0, 4)
}

export function buildStudentPerformance({
  marks = [],
  upcomingTests = [],
  bands = DEFAULT_BANDS,
}) {
  const rows = marks
    .filter((mark) => mark?.test)
    .map((mark) => {
      const test = mark.test
      const assessmentStatus = normalizeAssessmentStatus(mark)
      const percentage = scorePercentage(mark, test)
      const passingMarks = effectivePassingMarks(test)

      return {
        id: String(mark._id),
        test: {
          id: String(test._id),
          title: test.title,
          subject: test.subject || null,
          class: test.class || null,
          scheduledAt: test.scheduledAt || null,
          resultsPublishedAt: test.resultsPublishedAt || null,
        },
        marksObtained:
          assessmentStatus === 'entered'
            ? toFiniteNumber(mark.marksObtained)
            : null,
        maxMarks: toFiniteNumber(mark.maxMarks) ?? toFiniteNumber(test.maxMarks),
        passingMarks,
        percentage,
        assessmentStatus,
        pass:
          assessmentStatus === 'entered' && percentage != null
            ? toFiniteNumber(mark.marksObtained) >= passingMarks
            : null,
        publishedAt: mark.publishedAt || null,
      }
    })
    .sort((a, b) => resultDate(b) - resultDate(a))

  const scored = rows.filter((row) => row.percentage != null)
  const subjectStats = buildSubjectStats(rows)
  const insights = deriveInsights(subjectStats)
  const latest = rows[0] || null
  const best =
    scored.length > 0
      ? scored.reduce((winner, row) =>
          row.percentage > winner.percentage ? row : winner,
        )
      : null
  const recentChange = latestComparableChange(rows)
  const passCount = rows.filter((row) => row.pass === true).length
  const failCount = rows.filter((row) => row.pass === false).length

  return {
    kpis: {
      publishedTests: rows.length,
      scoredResults: scored.length,
      averagePercentage: mean(scored.map((row) => row.percentage)),
      latest,
      best,
      recentChange,
      passCount,
      failCount,
      passPercentage:
        scored.length > 0
          ? round2((passCount / scored.length) * 100)
          : null,
      absentCount: rows.filter((row) => row.assessmentStatus === 'absent')
        .length,
      missingCount: rows.filter(
        (row) => row.assessmentStatus === 'missing',
      ).length,
    },
    results: rows,
    subjects: subjectStats,
    trend: buildStudentTrend(rows),
    distribution: buildDistribution(
      scored.map((row) => row.percentage),
      bands,
    ),
    strengths: insights.strengths,
    improvementAreas: insights.improvementAreas,
    recommendations: buildRecommendations(subjectStats, rows),
    upcomingTests,
  }
}

export function analyticsMethodology(bands = DEFAULT_BANDS) {
  return {
    passPolicy: `A scored result passes when obtained marks are at least the test's passing marks. A 33% fallback of maximum marks is used when a test has no configured passing marks.`,
    averagePolicy:
      'Averages, medians, pass rates, and distributions include valid scored marks only. A mark is valid when it is between zero and the test maximum and its assessment status is entered. Absent, missing, exempt, unentered, and out-of-range records are reported separately and are never converted to zero.',
    expectedStudents:
      'Expected students are current active students in the test class. Historical enrolment history is not stored, so transferred or inactive students may appear as extra recorded rows.',
    reviewPolicy: `A student needs review when they have at least two valid scored results in the filtered assessments and their average is below ${REVIEW_AVERAGE_THRESHOLD}%. Improvement or decline is shown only with at least ${MIN_STUDENT_TREND_SAMPLE} valid scored results and means a change of at least ${TREND_CHANGE_THRESHOLD} percentage points between the first and latest result in that window.`,
    publicationPolicy:
      'Teachers and admins may view draft and published marks. Students only receive records where both the result record and its test are published. Unpublishing is the explicit correction workflow for published marks.',
    staffInclusion:
      'Teacher and admin analytics include entered marks in draft and published results. Publication status is shown separately.',
    studentInclusion:
      'Student analytics include only published results from their own student record.',
    distributionBands: bands.map((band) => band.label),
    thresholds: {
      strength:
        'Subject average of at least 70% with at least two scored assessments.',
      support:
        'Subject average below 50%, or a decline of at least 10 percentage points between the latest two scored assessments in that subject.',
      minimumSample: MIN_SUBJECT_SAMPLE,
    },
    ranking:
      'Rank and percentile are intentionally not calculated because no explicit ranking policy or comparison toggle is configured.',
    comparability:
      'Trends use percentages so tests with different maximum marks can be displayed together. Subject trends only compare results within the same subject name.',
  }
}
