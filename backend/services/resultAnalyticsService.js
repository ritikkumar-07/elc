import Mark from '../models/Mark.js'
import Test from '../models/Test.js'
import User from '../models/User.js'
import {
  DEFAULT_BANDS,
  MIN_STUDENT_TREND_SAMPLE,
  REVIEW_AVERAGE_THRESHOLD,
  TREND_CHANGE_THRESHOLD,
  median,
  round2,
  summarizeTestStats,
} from '../utils/resultAnalytics.js'

function numericValues(values) {
  return (values || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
}

function minValue(values) {
  const numbers = numericValues(values)
  return numbers.length === 0
    ? null
    : numbers.reduce((min, value) => Math.min(min, value), numbers[0])
}

function maxValue(values) {
  const numbers = numericValues(values)
  return numbers.length === 0
    ? null
    : numbers.reduce((max, value) => Math.max(max, value), numbers[0])
}

function assessmentStateExpression() {
  return {
    $switch: {
      branches: [
        {
          case: {
            $in: [
              '$assessmentStatus',
              ['absent', 'missing', 'exempt'],
            ],
          },
          then: '$assessmentStatus',
        },
        {
          case: {
            $and: [
              { $eq: ['$assessmentStatus', 'entered'] },
              { $isNumber: '$marksObtained' },
            ],
          },
          then: 'entered',
        },
        {
          case: { $isNumber: '$marksObtained' },
          then: 'entered',
        },
      ],
      default: 'missing',
    },
  }
}

function scorePipeline(testIds) {
  return [
    { $match: { test: { $in: testIds } } },
    {
      $lookup: {
        from: 'tests',
        localField: 'test',
        foreignField: '_id',
        as: 'testDocument',
      },
    },
    { $unwind: '$testDocument' },
    { $addFields: { assessmentState: assessmentStateExpression() } },
    {
      $addFields: {
        effectiveMax: '$testDocument.maxMarks',
        effectivePassing: {
          $ifNull: [
            '$testDocument.passingMarks',
            {
              $multiply: ['$testDocument.maxMarks', 0.33],
            },
          ],
        },
        validScore: {
          $and: [
            { $eq: ['$assessmentState', 'entered'] },
            { $isNumber: '$marksObtained' },
            { $gte: ['$marksObtained', 0] },
            { $gt: ['$testDocument.maxMarks', 0] },
            {
              $lte: ['$marksObtained', '$testDocument.maxMarks'],
            },
          ],
        },
      },
    },
    {
      $addFields: {
        percentageValue: {
          $cond: [
            '$validScore',
            {
              $multiply: [
                {
                  $divide: [
                    '$marksObtained',
                    '$testDocument.maxMarks',
                  ],
                },
                100,
              ],
            },
            null,
          ],
        },
      },
    },
  ]
}

export async function aggregateMarksByTest(testIds) {
  if (!testIds || testIds.length === 0) return new Map()

  const rows = await Mark.aggregate([
    ...scorePipeline(testIds),
    {
      $group: {
        _id: '$test',
        recorded: { $sum: 1 },
        entered: {
          $sum: {
            $cond: [{ $eq: ['$assessmentState', 'entered'] }, 1, 0],
          },
        },
        absent: {
          $sum: {
            $cond: [{ $eq: ['$assessmentState', 'absent'] }, 1, 0],
          },
        },
        missing: {
          $sum: {
            $cond: [{ $eq: ['$assessmentState', 'missing'] }, 1, 0],
          },
        },
        exempt: {
          $sum: {
            $cond: [{ $eq: ['$assessmentState', 'exempt'] }, 1, 0],
          },
        },
        invalidMarks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$assessmentState', 'entered'] },
                  { $eq: ['$validScore', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
        averageMarks: {
          $avg: {
            $cond: ['$validScore', '$marksObtained', null],
          },
        },
        averagePercentage: { $avg: '$percentageValue' },
        scoreValues: { $push: '$percentageValue' },
        markValues: {
          $push: {
            $cond: ['$validScore', '$marksObtained', null],
          },
        },
        passCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$validScore', true] },
                  { $gte: ['$marksObtained', '$effectivePassing'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        failCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$validScore', true] },
                  { $lt: ['$marksObtained', '$effectivePassing'] },
                ],
              },
              1,
              0,
            ],
          },
        },
        lastUpdated: { $max: '$updatedAt' },
      },
    },
  ])

  return new Map(
    rows.map((row) => [
      String(row._id),
      {
        ...row,
        highestPercentage: maxValue(row.scoreValues),
        lowestPercentage: minValue(row.scoreValues),
        medianPercentage: median(row.scoreValues),
        highestMarks: maxValue(row.markValues),
        lowestMarks: minValue(row.markValues),
      },
    ]),
  )
}

export async function expectedStudentCounts(classIds) {
  if (!classIds || classIds.length === 0) return new Map()

  const rows = await User.aggregate([
    {
      $match: {
        role: 'student',
        status: 'active',
        class: { $in: classIds },
      },
    },
    { $group: { _id: '$class', count: { $sum: 1 } } },
  ])

  return new Map(rows.map((row) => [String(row._id), row.count]))
}

export async function loadTestSummaries({
  filter = {},
  limit = 500,
  skip = 0,
  bands = DEFAULT_BANDS,
  sort = { scheduledAt: -1, createdAt: -1 },
}) {
  const tests = await Test.find(filter)
    .select(
      'title class subject maxMarks passingMarks scheduledAt status resultsPublishedAt resultsPublishedBy createdAt updatedAt',
    )
    .populate('class', 'name section academicYear')
    .populate('subject', 'name code')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean()

  if (tests.length === 0) return { tests: [], truncated: false }

  const testIds = tests.map((test) => test._id)
  const classIds = [
    ...new Set(
      tests
        .map((test) => test.class?._id || test.class)
        .filter(Boolean),
    ),
  ]

  const [statsByTest, expectedByClass] = await Promise.all([
    aggregateMarksByTest(testIds),
    expectedStudentCounts(classIds),
  ])

  return {
    tests: tests.map((test) => {
      const classId = String(test.class?._id || test.class || '')
      const stats = statsByTest.get(String(test._id)) || {}
      const expectedStudents = expectedByClass.get(classId) || 0

      return summarizeTestStats({
        test,
        stats,
        expectedStudents,
      })
    }),
    truncated: false,
    bands,
  }
}

export async function getScoreDistribution(
  testIds,
  bands = DEFAULT_BANDS,
) {
  if (!testIds || testIds.length === 0) {
    return bands.map((band) => ({ label: band.label, count: 0 }))
  }

  const boundaries = bands.map((band) => band.min)
  boundaries.push(bands[bands.length - 1].max)

  const rows = await Mark.aggregate([
    ...scorePipeline(testIds),
    { $match: { percentageValue: { $ne: null } } },
    {
      $bucket: {
        groupBy: '$percentageValue',
        boundaries,
        default: 'other',
        output: { count: { $sum: 1 } },
      },
    },
  ])

  const byBoundary = new Map(
    rows.map((row) => [Number(row._id), row.count]),
  )

  return bands.map((band) => ({
    label: band.label,
    count: byBoundary.get(band.min) || 0,
  }))
}

export async function getFieldMedians(testIds, field) {
  if (!testIds || testIds.length === 0) return new Map()
  if (!['class', 'subject'].includes(field)) {
    throw new Error('Invalid median grouping field.')
  }

  const groupExpression =
    field === 'class'
      ? '$testDocument.class'
      : '$testDocument.subject'

  const rows = await Mark.aggregate([
    ...scorePipeline(testIds),
    { $match: { percentageValue: { $ne: null } } },
    {
      $group: {
        _id: groupExpression,
        values: { $push: '$percentageValue' },
      },
    },
  ])

  return new Map(
    rows.map((row) => [
      String(row._id ?? 'null'),
      median(row.values),
    ]),
  )
}

export async function countStudentsNeedingReview({
  testIds,
  threshold = REVIEW_AVERAGE_THRESHOLD,
  minimumAssessments = 2,
}) {
  if (!testIds || testIds.length === 0) return 0

  const rows = await Mark.aggregate([
    ...scorePipeline(testIds),
    { $match: { percentageValue: { $ne: null } } },
    {
      $group: {
        _id: '$student',
        scored: { $sum: 1 },
        averagePercentage: { $avg: '$percentageValue' },
      },
    },
    {
      $match: {
        scored: { $gte: minimumAssessments },
        averagePercentage: { $lt: threshold },
      },
    },
    { $count: 'count' },
  ])

  return rows[0]?.count || 0
}

export async function getStudentSupportSignals({
  testIds,
  supportThreshold = REVIEW_AVERAGE_THRESHOLD,
  changeThreshold = TREND_CHANGE_THRESHOLD,
  minimumAssessments = 2,
  trendAssessments = MIN_STUDENT_TREND_SAMPLE,
  limit = 12,
}) {
  const thresholds = {
    supportAverage: supportThreshold,
    changePoints: changeThreshold,
    minimumAssessments,
    trendAssessments,
  }

  if (!testIds || testIds.length === 0) {
    return {
      thresholds,
      counts: {
        needsSupport: 0,
        improving: 0,
        declining: 0,
        steady: 0,
        students: 0,
      },
      students: [],
    }
  }

  const rows = await Mark.aggregate([
    ...scorePipeline(testIds),
    { $match: { percentageValue: { $ne: null } } },
    {
      $lookup: {
        from: 'users',
        localField: 'student',
        foreignField: '_id',
        as: 'studentDocument',
      },
    },
    {
      $unwind: {
        path: '$studentDocument',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        resultDate: {
          $ifNull: [
            '$testDocument.scheduledAt',
            '$testDocument.resultsPublishedAt',
          ],
        },
      },
    },
    { $sort: { student: 1, resultDate: 1, _id: 1 } },
    {
      $group: {
        _id: '$student',
        name: { $first: '$studentDocument.name' },
        rollNumber: { $first: '$studentDocument.rollNumber' },
        values: { $push: '$percentageValue' },
        scored: { $sum: 1 },
        averagePercentage: { $avg: '$percentageValue' },
        firstPercentage: { $first: '$percentageValue' },
        latestPercentage: { $last: '$percentageValue' },
      },
    },
  ])

  const counts = {
    needsSupport: 0,
    improving: 0,
    declining: 0,
    steady: 0,
    students: rows.length,
  }

  const classified = rows.map((row) => {
    const averagePercentage = round2(row.averagePercentage)
    const change =
      row.scored >= trendAssessments
        ? round2(row.latestPercentage - row.firstPercentage)
        : null
    let signal = 'steady'

    if (
      row.scored >= minimumAssessments &&
      averagePercentage != null &&
      averagePercentage < supportThreshold
    ) {
      signal = 'needs_support'
      counts.needsSupport += 1
    } else if (change != null && change <= -changeThreshold) {
      signal = 'declining'
      counts.declining += 1
    } else if (change != null && change >= changeThreshold) {
      signal = 'improving'
      counts.improving += 1
    } else {
      counts.steady += 1
    }

    return {
      student: {
        id: String(row._id),
        name: row.name || 'Student',
        rollNumber: row.rollNumber || '',
      },
      scored: row.scored,
      averagePercentage,
      firstPercentage: round2(row.firstPercentage),
      latestPercentage: round2(row.latestPercentage),
      change,
      signal,
    }
  })

  const priority = {
    needs_support: 0,
    declining: 1,
    improving: 2,
    steady: 3,
  }

  return {
    thresholds,
    counts,
    students: classified
      .filter((row) => row.signal !== 'steady')
      .sort((left, right) => {
        const priorityDelta =
          priority[left.signal] - priority[right.signal]

        if (priorityDelta !== 0) return priorityDelta
        return (
          (left.averagePercentage ?? 101) -
          (right.averagePercentage ?? 101)
        )
      })
      .slice(0, limit),
  }
}

export async function findPreviousComparableTest(test) {
  const query = {
    _id: { $ne: test._id },
    class: test.class?._id || test.class,
    subject: test.subject?._id || test.subject || null,
  }

  const tests = await Test.find(query)
    .sort({ scheduledAt: -1, createdAt: -1 })
    .limit(10)
    .lean()

  const currentDate = new Date(
    test.scheduledAt || test.createdAt || 0,
  ).getTime()

  return (
    tests.find(
      (candidate) =>
        new Date(
          candidate.scheduledAt || candidate.createdAt || 0,
        ).getTime() < currentDate,
    ) || null
  )
}

export async function getTestSummaryById({
  testId,
  expectedStudents,
  bands = DEFAULT_BANDS,
}) {
  const result = await loadTestSummaries({
    filter: { _id: testId },
    limit: 1,
    bands,
  })

  const summary = result.tests[0]
  if (summary && expectedStudents != null) {
    summary.expectedStudents = expectedStudents
    summary.notEntered = Math.max(
      expectedStudents - summary.recordedStudents,
      0,
    )
    summary.pendingEvaluation =
      summary.notEntered + summary.missing + summary.invalidMarks
  }

  return summary || null
}
