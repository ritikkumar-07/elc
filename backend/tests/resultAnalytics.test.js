import assert from 'node:assert/strict'
import test from 'node:test'

import { escapeCsvCell, toCsv } from '../utils/csv.js'
import {
  DEFAULT_BANDS,
  buildDistribution,
  buildStudentPerformance,
  effectivePassingMarks,
  groupTestSummaries,
  median,
  parseBands,
  percentageFor,
  summarizeTestRecords,
  summarizeTestStats,
} from '../utils/resultAnalytics.js'

function mark(id, marksObtained, overrides = {}) {
  return {
    _id: `mark-${id}`,
    student: `student-${id}`,
    marksObtained,
    maxMarks: 100,
    assessmentStatus: 'entered',
    status: 'published',
    publishedAt: new Date('2026-01-10T00:00:00.000Z'),
    updatedAt: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  }
}

function testDocument(overrides = {}) {
  return {
    _id: 'test-1',
    title: 'Unit Test',
    maxMarks: 100,
    passingMarks: 33,
    status: 'closed',
    resultsPublishedAt: new Date('2026-01-10T00:00:00.000Z'),
    scheduledAt: new Date('2026-01-05T00:00:00.000Z'),
    class: 'class-1',
    subject: { _id: 'subject-1', name: 'Mathematics' },
    ...overrides,
  }
}

test('percentageFor handles zero, maximum, decimals, and invalid values', () => {
  assert.equal(percentageFor(0, 100), 0)
  assert.equal(percentageFor(100, 100), 100)
  assert.equal(percentageFor(33.33, 100), 33.33)
  assert.equal(percentageFor(2, 3), 66.67)
  assert.equal(percentageFor(null, 100), null)
  assert.equal(percentageFor(101, 100), null)
  assert.equal(percentageFor(1, 0), null)
})

test('effectivePassingMarks uses configured marks or 33 percent fallback', () => {
  assert.equal(effectivePassingMarks({ maxMarks: 100 }), 33)
  assert.equal(
    effectivePassingMarks({ maxMarks: 80, passingMarks: 28 }),
    28,
  )
  assert.equal(effectivePassingMarks({ maxMarks: 80 }), 26.4)
  assert.equal(effectivePassingMarks({ maxMarks: 0 }), null)
})

test('median handles odd, even, empty, and string values', () => {
  assert.equal(median([10, 40, 30]), 30)
  assert.equal(median([10, 20, 30, 40]), 25)
  assert.equal(median([]), null)
  assert.equal(median(['10', '30']), 20)
  assert.equal(median([10, null, 30]), 20)
})

test('score distribution uses inclusive lower and exclusive upper bounds', () => {
  const rows = buildDistribution([0, 39.99, 40, 49.99, 100])
  assert.equal(rows[0].count, 2)
  assert.equal(rows[1].count, 2)
  assert.equal(rows.at(-1).count, 1)
  assert.deepEqual(
    rows.map((row) => row.label),
    DEFAULT_BANDS.map((band) => band.label),
  )
})

test('summary excludes absent and missing results from score calculations', () => {
  const summary = summarizeTestRecords({
    test: testDocument(),
    marks: [
      mark(1, 90),
      mark(2, 0),
      mark(3, null, { assessmentStatus: 'absent' }),
      mark(4, null, { assessmentStatus: 'missing' }),
      mark(5, 40, { assessmentStatus: 'exempt' }),
    ],
    expectedStudents: 6,
  })

  assert.equal(summary.entered, 2)
  assert.equal(summary.absent, 1)
  assert.equal(summary.missing, 1)
  assert.equal(summary.exempt, 1)
  assert.equal(summary.notEntered, 1)
  assert.equal(summary.recordedStudents, 5)
  assert.equal(summary.averagePercentage, 45)
  assert.equal(summary.medianPercentage, 45)
  assert.equal(summary.passCount, 1)
  assert.equal(summary.failCount, 1)
  assert.equal(summary.passPercentage, 50)
  assert.equal(summary.highestMarks, 90)
  assert.equal(summary.lowestMarks, 0)
  assert.equal(summary.pendingEvaluation, 2)
})

test('summary handles an empty dataset without fabricating values', () => {
  const summary = summarizeTestRecords({
    test: testDocument(),
    marks: [],
    expectedStudents: 0,
  })

  assert.equal(summary.averagePercentage, null)
  assert.equal(summary.medianPercentage, null)
  assert.equal(summary.passPercentage, null)
  assert.equal(summary.scoredCount, 0)
  assert.equal(summary.notEntered, 0)
})

test('summary stats combine aggregated counts and expected students', () => {
  const summary = summarizeTestStats({
    test: testDocument(),
    stats: {
      recorded: 8,
      entered: 7,
      absent: 1,
      missing: 0,
      exempt: 0,
      passCount: 5,
      failCount: 2,
      averagePercentage: 64.2,
    },
    expectedStudents: 10,
  })

  assert.equal(summary.expectedStudents, 10)
  assert.equal(summary.notEntered, 2)
  assert.equal(summary.pendingEvaluation, 2)
  assert.equal(summary.passPercentage, 71.43)
})

test('group summaries weight averages by scored result count', () => {
  const grouped = groupTestSummaries(
    [
      {
        class: { name: 'Class 10', section: 'A' },
        scoredCount: 10,
        averagePercentage: 80,
        passCount: 8,
        failCount: 2,
        expectedStudents: 10,
        recordedStudents: 10,
      },
      {
        class: { name: 'Class 10', section: 'A' },
        scoredCount: 30,
        averagePercentage: 40,
        passCount: 12,
        failCount: 18,
        expectedStudents: 30,
        recordedStudents: 30,
      },
    ],
    (item) =>
      item.class
        ? [item.class.name, item.class.section].filter(Boolean).join(' - ')
        : null,
  )

  assert.equal(grouped.length, 1)
  assert.equal(grouped[0].averagePercentage, 50)
  assert.equal(grouped[0].passPercentage, 50)
  assert.equal(grouped[0].scoredCount, 40)
})

test('parse bands validates contiguous coverage', () => {
  const bands = parseBands('0-40,40-60,60-100')
  assert.equal(bands.length, 3)
  assert.equal(bands.at(-1).max, 100.001)
  assert.throws(() => parseBands('0-40,50-100'))
  assert.throws(() => parseBands('10-50,50-100'))
  assert.throws(() => parseBands('0-101'))
})

test('student performance distinguishes absent results and never zeros them', () => {
  const published = new Date('2026-02-01T00:00:00.000Z')
  const marks = [
    {
      _id: 'm1',
      marksObtained: 80,
      maxMarks: 100,
      assessmentStatus: 'entered',
      status: 'published',
      publishedAt: published,
      test: testDocument({
        _id: 't1',
        title: 'Algebra',
        scheduledAt: new Date('2026-01-10T00:00:00.000Z'),
      }),
    },
    {
      _id: 'm2',
      marksObtained: null,
      maxMarks: 100,
      assessmentStatus: 'absent',
      status: 'published',
      publishedAt: published,
      test: testDocument({
        _id: 't2',
        title: 'Geometry',
        scheduledAt: new Date('2026-01-20T00:00:00.000Z'),
      }),
    },
    {
      _id: 'm3',
      marksObtained: 55,
      maxMarks: 100,
      assessmentStatus: 'entered',
      status: 'published',
      publishedAt: published,
      test: testDocument({
        _id: 't3',
        title: 'Algebra 2',
        scheduledAt: new Date('2026-01-30T00:00:00.000Z'),
      }),
    },
  ]

  const analytics = buildStudentPerformance({ marks })

  assert.equal(analytics.kpis.publishedTests, 3)
  assert.equal(analytics.kpis.scoredResults, 2)
  assert.equal(analytics.kpis.averagePercentage, 67.5)
  assert.equal(analytics.kpis.absentCount, 1)
  assert.equal(analytics.kpis.best.percentage, 80)
  assert.equal(analytics.results[1].assessmentStatus, 'absent')
  assert.equal(analytics.results[1].percentage, null)
})

test('CSV escapes commas, quotes, newlines, and formula injection', () => {
  assert.equal(escapeCsvCell('plain'), 'plain')
  assert.equal(escapeCsvCell('=SUM(A1:A2)'), "'=SUM(A1:A2)")
  assert.equal(escapeCsvCell('+cmd'), "'+cmd")
  assert.equal(escapeCsvCell('a,b'), '"a,b"')
  assert.equal(escapeCsvCell('a"b'), '"a""b"')
  assert.equal(escapeCsvCell('a\nb'), '"a\nb"')
  assert.equal(escapeCsvCell(null), '')

  const csv = toCsv(['Name', 'Score'], [['A, B', 10]])
  assert.match(csv, /Name,Score/)
  assert.match(csv, /"A, B",10/)
})
