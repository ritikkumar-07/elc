import mongoose from 'mongoose'

import Class from '../models/Class.js'
import Mark from '../models/Mark.js'
import Subject from '../models/Subject.js'
import Test from '../models/Test.js'
import User from '../models/User.js'
import {
  countStudentsNeedingReview,
  findPreviousComparableTest,
  getFieldMedians,
  getScoreDistribution,
  getStudentSupportSignals,
  loadTestSummaries,
} from '../services/resultAnalyticsService.js'
import {
  isAdmin,
  isStudent,
  isTeacher,
  teacherClassIds,
  userCanAccessClass,
} from '../utils/authorization.js'
import { csvFileName, toCsv } from '../utils/csv.js'
import {
  analyticsMethodology,
  buildAssessmentTrend,
  buildStudentPerformance,
  effectivePassingMarks,
  groupTestSummaries,
  normalizeAssessmentStatus,
  parseBands,
  passState,
  percentageFor,
  round2,
  summarizeTestRecords,
} from '../utils/resultAnalytics.js'
import {
  invalidId,
  parsePagination,
  paginationMeta,
} from '../utils/query.js'

function parseObjectId(value, label) {
  if (!mongoose.isValidObjectId(value)) {
    return {
      error: `Invalid ${label}.`,
    }
  }

  return { value }
}

function parseDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    return null
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null
  }

  return date
}

function classLabel(item) {
  if (!item) return ''
  return [item.name, item.section].filter(Boolean).join(' - ')
}

function subjectLabel(item) {
  return item?.subject?.name || 'General'
}

function classFilterValues(filter) {
  if (typeof filter.class === 'string') return [filter.class]
  if (filter.class?.$in) {
    return filter.class.$in.map((id) => String(id))
  }
  return null
}

function setClassFilterValues(filter, values) {
  filter.class = { $in: values }
}

async function buildTestScope(req) {
  const user = req.user
  const query = req.query
  const filter = {}
  let role

  if (isAdmin(user)) {
    role = 'admin'
  } else if (isTeacher(user)) {
    role = 'teacher'
    filter.class = { $in: teacherClassIds(user) }
  } else if (isStudent(user)) {
    role = 'student'
    filter.class = user.class || { $in: [] }
    filter.resultsPublishedAt = { $ne: null }
  } else {
    return {
      status: 403,
      message: 'You do not have access to result analytics.',
    }
  }

  if (query.classId) {
    const parsed = parseObjectId(query.classId, 'class ID')
    if (parsed.error) return { status: 400, message: parsed.error }

    if (!userCanAccessClass(user, query.classId)) {
      return {
        status: 403,
        message: 'You do not have access to this class.',
      }
    }

    filter.class = query.classId
  }

  if (query.subjectId) {
    const parsed = parseObjectId(query.subjectId, 'subject ID')
    if (parsed.error) return { status: 400, message: parsed.error }
    filter.subject = query.subjectId
  }

  if (query.testId) {
    const parsed = parseObjectId(query.testId, 'test ID')
    if (parsed.error) return { status: 400, message: parsed.error }
    filter._id = query.testId
  }

  if (query.status && role !== 'student') {
    if (!['draft', 'published', 'closed'].includes(query.status)) {
      return { status: 400, message: 'Invalid test status.' }
    }

    filter.status = query.status
  }

  const academicYear = String(query.academicYear || '').trim()
  if (academicYear) {
    if (academicYear.length > 30) {
      return { status: 400, message: 'Invalid academic year.' }
    }

    const classes = await Class.find({ academicYear })
      .select('_id')
      .lean()
    const allowed = new Set(classes.map((item) => String(item._id)))
    const current = classFilterValues(filter)

    if (current) {
      setClassFilterValues(
        filter,
        current.filter((id) => allowed.has(id)),
      )
    } else {
      setClassFilterValues(filter, [...allowed])
    }
  }

  const from = query.from ? parseDateKey(query.from) : null
  const to = query.to ? parseDateKey(query.to) : null

  if (query.from && !from) {
    return { status: 400, message: 'Invalid from date.' }
  }

  if (query.to && !to) {
    return { status: 400, message: 'Invalid to date.' }
  }

  if (from && to && from > to) {
    return {
      status: 400,
      message: 'The from date cannot be after the to date.',
    }
  }

  if (from || to) {
    filter.scheduledAt = {}

    if (from) filter.scheduledAt.$gte = from
    if (to) {
      filter.scheduledAt.$lte = new Date(
        `${query.to}T23:59:59.999Z`,
      )
    }
  }

  return {
    role,
    filter,
    classIds: classFilterValues(filter),
  }
}

async function filterOptions(role, user) {
  if (role === 'student') {
    return { classes: [], subjects: [], academicYears: [] }
  }

  const classQuery =
    role === 'admin'
      ? {}
      : { _id: { $in: teacherClassIds(user) } }

  const classes = await Class.find(classQuery)
    .select('name section academicYear isActive')
    .sort({ name: 1, section: 1 })
    .limit(1000)
    .lean()

  const classIds = classes.map((item) => item._id)
  const subjects = await Subject.find({
    class: { $in: classIds },
  })
    .select('name code class')
    .sort({ name: 1 })
    .limit(2000)
    .lean()

  return {
    classes: classes.map((item) => ({
      id: String(item._id),
      label: classLabel(item),
      academicYear: item.academicYear || '',
      isActive: item.isActive,
    })),
    subjects: subjects.map((item) => ({
      id: String(item._id),
      name: item.name,
      code: item.code || '',
      classId: String(item.class),
    })),
    academicYears: [
      ...new Set(
        classes
          .map((item) => item.academicYear)
          .filter(Boolean),
      ),
    ].sort(),
  }
}

function weightedSummary(summaries) {
  let scoredCount = 0
  let weightedAverage = 0
  let passCount = 0
  let failCount = 0
  let expectedStudents = 0
  let entered = 0
  let recordedStudents = 0
  let notEntered = 0
  let pendingEvaluation = 0
  let absent = 0
  let missing = 0
  let exempt = 0
  let invalidMarks = 0

  for (const summary of summaries) {
    scoredCount += summary.scoredCount || 0
    passCount += summary.passCount || 0
    failCount += summary.failCount || 0
    expectedStudents += summary.expectedStudents || 0
    entered += summary.entered || 0
    recordedStudents += summary.recordedStudents || 0
    notEntered += summary.notEntered || 0
    pendingEvaluation += summary.pendingEvaluation || 0
    absent += summary.absent || 0
    missing += summary.missing || 0
    exempt += summary.exempt || 0
    invalidMarks += summary.invalidMarks || 0

    if (summary.averagePercentage != null) {
      weightedAverage +=
        summary.averagePercentage * (summary.scoredCount || 0)
    }
  }

  return {
    scoredCount,
    averagePercentage:
      scoredCount > 0 ? round2(weightedAverage / scoredCount) : null,
    passCount,
    failCount,
    passPercentage:
      passCount + failCount > 0
        ? round2((passCount / (passCount + failCount)) * 100)
        : null,
    expectedStudents,
    entered,
    present: entered,
    recordedStudents,
    notEntered,
    pendingEvaluation,
    absent,
    missing,
    exempt,
    invalidMarks,
  }
}

function recentAssessments(summaries, count = 5) {
  return [...summaries]
    .sort((a, b) => {
      const left = new Date(
        a.scheduledAt || a.lastUpdated || 0,
      ).getTime()
      const right = new Date(
        b.scheduledAt || b.lastUpdated || 0,
      ).getTime()
      return right - left
    })
    .slice(0, count)
}

function recentPublications(summaries, count = 5) {
  return summaries
    .filter((summary) => summary.resultsPublishedAt)
    .sort(
      (a, b) =>
        new Date(b.resultsPublishedAt) -
        new Date(a.resultsPublishedAt),
    )
    .slice(0, count)
}

function testPayload(test) {
  return {
    id: String(test._id),
    title: test.title,
    class: test.class,
    subject: test.subject,
    maxMarks: test.maxMarks,
    passingMarks: test.passingMarks ?? null,
    effectivePassingMarks: effectivePassingMarks(test),
    scheduledAt: test.scheduledAt,
    status: test.status,
    resultsPublishedAt: test.resultsPublishedAt || null,
    resultsPublishedBy: test.resultsPublishedBy || null,
    createdAt: test.createdAt,
    updatedAt: test.updatedAt,
  }
}

function rowFromMark(mark, test, expected) {
  const assessmentStatus = normalizeAssessmentStatus(mark)
  const percentage = percentageFor(
    mark?.marksObtained,
    mark?.maxMarks ?? test.maxMarks,
  )
  const pass =
    assessmentStatus === 'entered'
      ? passState(mark, test)
      : null

  return {
    id: mark ? String(mark._id) : null,
    student: {
      id: String(mark?.student?._id || mark?.student || ''),
      name: mark?.student?.name || 'Student',
      rollNumber: mark?.student?.rollNumber || '',
    },
    expected,
    marksObtained:
      assessmentStatus === 'entered' ? mark?.marksObtained : null,
    maxMarks: mark?.maxMarks ?? test.maxMarks,
    percentage,
    assessmentStatus,
    pass,
    resultStatus: mark?.status || 'not_entered',
    publishedAt: mark?.publishedAt || null,
    updatedAt: mark?.updatedAt || null,
  }
}

function emptyStudentRow(test, student) {
  return {
    id: null,
    student: {
      id: String(student._id),
      name: student.name || 'Student',
      rollNumber: student.rollNumber || '',
    },
    expected: true,
    marksObtained: null,
    maxMarks: test.maxMarks,
    percentage: null,
    assessmentStatus: 'not_entered',
    pass: null,
    resultStatus: 'not_entered',
    publishedAt: null,
    updatedAt: null,
  }
}

function buildRows({ test, marks, expectedStudents }) {
  const marksByStudent = new Map(
    marks.map((mark) => [
      String(mark.student?._id || mark.student),
      mark,
    ]),
  )
  const expectedIds = new Set(
    expectedStudents.map((student) => String(student._id)),
  )

  const rows = expectedStudents.map((student) => {
    const mark = marksByStudent.get(String(student._id))
    return mark
      ? rowFromMark(mark, test, true)
      : emptyStudentRow(test, student)
  })

  for (const mark of marks) {
    const studentId = String(mark.student?._id || mark.student)
    if (!expectedIds.has(studentId)) {
      rows.push(rowFromMark(mark, test, false))
    }
  }

  return rows.sort((a, b) =>
    `${a.student.name} ${a.student.rollNumber}`.localeCompare(
      `${b.student.name} ${b.student.rollNumber}`,
    ),
  )
}

async function expectedStudentsForTest(test) {
  return User.find({
    role: 'student',
    status: 'active',
    class: test.class?._id || test.class,
  })
    .select('name rollNumber')
    .sort({ name: 1 })
    .lean()
}

async function testDetailData(test, bands) {
  const [marks, expectedStudents, previousTest] = await Promise.all([
    Mark.find({ test: test._id })
      .populate('student', 'name rollNumber')
      .lean(),
    expectedStudentsForTest(test),
    findPreviousComparableTest(test),
  ])

  const summary = summarizeTestRecords({
    test,
    marks,
    expectedStudents: expectedStudents.length,
    bands,
  })

  let comparison = null

  if (previousTest) {
    const [previousMarks, previousExpected] = await Promise.all([
      Mark.find({ test: previousTest._id }).lean(),
      User.countDocuments({
        role: 'student',
        status: 'active',
        class: previousTest.class,
      }),
    ])
    const previousSummary = summarizeTestRecords({
      test: previousTest,
      marks: previousMarks,
      expectedStudents: previousExpected,
      bands,
    })

    comparison = {
      test: {
        id: String(previousTest._id),
        title: previousTest.title,
        scheduledAt: previousTest.scheduledAt,
        maxMarks: previousTest.maxMarks,
        passingMarks: previousSummary.passingMarks,
        averagePercentage: previousSummary.averagePercentage,
        passPercentage: previousSummary.passPercentage,
        scoredCount: previousSummary.scoredCount,
      },
      averageDelta:
        summary.averagePercentage != null &&
        previousSummary.averagePercentage != null
          ? round2(
              summary.averagePercentage -
                previousSummary.averagePercentage,
            )
          : null,
      passDelta:
        summary.passPercentage != null &&
        previousSummary.passPercentage != null
          ? round2(
              summary.passPercentage -
                previousSummary.passPercentage,
            )
          : null,
    }
  }

  return {
    test: testPayload(test),
    summary,
    comparison,
    bands,
    rows: buildRows({ test, marks, expectedStudents }),
  }
}

export async function getAnalyticsOverview(req, res, next) {
  try {
    let bands

    try {
      bands = parseBands(req.query.bands)
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    const scope = await buildTestScope(req)

    if (scope.status) {
      return res.status(scope.status).json({
        success: false,
        message: scope.message,
      })
    }

    if (scope.role === 'student') {
      const publishedMarks = await Mark.find({
        student: req.user._id,
        status: 'published',
      })
        .populate({
          path: 'test',
          select:
            'title maxMarks passingMarks scheduledAt status resultsPublishedAt class subject',
          populate: [
            { path: 'class', select: 'name section academicYear' },
            { path: 'subject', select: 'name code' },
          ],
        })
        .populate('class', 'name section academicYear')
        .sort({ publishedAt: -1 })
        .lean()

      const safeMarks = publishedMarks.filter(
        (mark) =>
          mark.test && mark.test.resultsPublishedAt != null,
      )

      const upcomingTests = await Test.find({
        class: req.user.class || null,
        status: 'published',
        $or: [
          { scheduledAt: null },
          { scheduledAt: { $exists: false } },
          { scheduledAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        ],
      })
        .populate('class', 'name section')
        .populate('subject', 'name')
        .sort({ scheduledAt: 1 })
        .limit(5)
        .lean()

      const analytics = buildStudentPerformance({
        marks: safeMarks,
        upcomingTests: upcomingTests.map((test) => ({
          id: String(test._id),
          title: test.title,
          class: test.class,
          subject: test.subject,
          scheduledAt: test.scheduledAt,
          maxMarks: test.maxMarks,
        })),
        bands,
      })

      return res.status(200).json({
        success: true,
        data: {
          role: 'student',
          ...analytics,
          methodology: analyticsMethodology(bands),
          generatedAt: new Date(),
        },
      })
    }

    const [totalTests, publishedTests, summariesPage] =
      await Promise.all([
        Test.countDocuments(scope.filter),
        Test.countDocuments({
          ...scope.filter,
          resultsPublishedAt: { $ne: null },
        }),
        loadTestSummaries({
          filter: scope.filter,
          limit: 500,
          bands,
        }),
      ])

    const summaries = summariesPage.tests
    const totals = weightedSummary(summaries)
    const testIds = summaries.map((item) => item.testId)
    const [distribution, reviewCount, options] = await Promise.all([
      getScoreDistribution(testIds, bands),
      countStudentsNeedingReview({ testIds }),
      filterOptions(scope.role, req.user),
    ])

    const classComparison = groupTestSummaries(
      summaries,
      (item) => classLabel(item.class),
    )
    const subjectComparison = groupTestSummaries(
      summaries,
      (item) => subjectLabel(item),
    )

    return res.status(200).json({
      success: true,
      data: {
        role: scope.role,
        kpis: {
          assessments: totalTests,
          publishedAssessments: publishedTests,
          draftAssessments: totalTests - publishedTests,
          pendingEvaluation: totals.pendingEvaluation,
          expectedStudents: totals.expectedStudents,
          enteredMarks: totals.entered,
          recordedStudents: totals.recordedStudents,
          scoredResults: totals.scoredCount,
          averagePercentage: totals.averagePercentage,
          passPercentage: totals.passPercentage,
          passCount: totals.passCount,
          failCount: totals.failCount,
          studentsNeedingReview: reviewCount,
        },
        tests: summaries,
        recentAssessments: recentAssessments(summaries),
        recentPublications: recentPublications(summaries),
        classComparison,
        subjectComparison,
        trend: buildAssessmentTrend(summaries),
        distribution,
        passFail: {
          passCount: totals.passCount,
          failCount: totals.failCount,
          passPercentage: totals.passPercentage,
        },
        filterOptions: options,
        bounded: {
          loadedTests: summaries.length,
          totalTests,
          truncated: summaries.length < totalTests,
          limit: 500,
        },
        methodology: analyticsMethodology(bands),
        generatedAt: new Date(),
      },
    })
  } catch (error) {
    return next(error)
  }
}

export async function listAnalyticsTests(req, res, next) {
  try {
    if (isStudent(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Use the student analytics overview.',
      })
    }

    let bands
    try {
      bands = parseBands(req.query.bands)
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    const scope = await buildTestScope(req)
    if (scope.status) {
      return res.status(scope.status).json({
        success: false,
        message: scope.message,
      })
    }

    const { page, limit, skip } = parsePagination(req.query, 20)
    const [total, summaries] = await Promise.all([
      Test.countDocuments(scope.filter),
      loadTestSummaries({
        filter: scope.filter,
        limit,
        skip,
        bands,
      }),
    ])

    return res.status(200).json({
      success: true,
      count: summaries.tests.length,
      data: summaries.tests,
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    return next(error)
  }
}

export async function getAnalyticsTest(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'test ID')
    }

    let bands
    try {
      bands = parseBands(req.query.bands)
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      })
    }

    const test = await Test.findById(req.params.id)
      .populate('class', 'name section academicYear')
      .populate('subject', 'name code')
      .populate('createdBy', 'name role')
      .populate('resultsPublishedBy', 'name')
      .lean()

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found.',
      })
    }

    if (isStudent(req.user)) {
      const classId = test.class?._id || test.class

      if (
        String(classId) !== String(req.user.class || '') ||
        !test.resultsPublishedAt
      ) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this test.',
        })
      }

      const [ownMark, expectedStudents, allMarks] = await Promise.all([
        Mark.findOne({
          test: test._id,
          student: req.user._id,
          status: 'published',
        })
          .populate('student', 'name rollNumber')
          .lean(),
        expectedStudentsForTest(test),
        Mark.find({ test: test._id, status: 'published' }).lean(),
      ])
      const summary = summarizeTestRecords({
        test,
        marks: allMarks,
        expectedStudents: expectedStudents.length,
        bands,
      })

      return res.status(200).json({
        success: true,
        data: {
          scope: 'student',
          test: testPayload(test),
          summary,
          ownResult: ownMark
            ? rowFromMark(ownMark, test, true)
            : null,
          bands,
          methodology: analyticsMethodology(bands),
          generatedAt: new Date(),
        },
      })
    }

    const classId = test.class?._id || test.class

    if (
      !isAdmin(req.user) &&
      !(isTeacher(req.user) && userCanAccessClass(req.user, classId))
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this test.',
      })
    }

    const detail = await testDetailData(test, bands)

    return res.status(200).json({
      success: true,
      data: {
        scope: 'staff',
        ...detail,
        methodology: analyticsMethodology(bands),
        generatedAt: new Date(),
      },
    })
  } catch (error) {
    return next(error)
  }
}

function studentExportRows(marks) {
  return marks.map((mark) => {
    const test = mark.test
    const status = normalizeAssessmentStatus(mark)
    const percentage = percentageFor(
      mark.marksObtained,
      mark.maxMarks ?? test?.maxMarks,
    )
    const pass =
      status === 'entered' ? passState(mark, test) : null

    return [
      test?.title || 'Test',
      test?.subject?.name || 'General',
      classLabel(test?.class),
      test?.scheduledAt
        ? new Date(test.scheduledAt).toISOString().slice(0, 10)
        : '',
      status,
      status === 'entered' ? mark.marksObtained : '',
      mark.maxMarks ?? test?.maxMarks ?? '',
      percentage ?? '',
      pass == null ? '' : pass ? 'Pass' : 'Fail',
      mark.publishedAt
        ? new Date(mark.publishedAt).toISOString()
        : '',
    ]
  })
}

function staffExportRows(rows) {
  return rows.map((row) => [
    row.student.name,
    row.student.rollNumber,
    row.assessmentStatus,
    row.marksObtained ?? '',
    row.maxMarks,
    row.percentage ?? '',
    row.pass == null ? '' : row.pass ? 'Pass' : 'Fail',
    row.resultStatus,
    row.publishedAt
      ? new Date(row.publishedAt).toISOString()
      : '',
  ])
}

export async function exportAnalytics(req, res, next) {
  try {
    const testId = req.query.testId

    if (testId && !mongoose.isValidObjectId(testId)) {
      return invalidId(res, 'test ID')
    }

    if (isStudent(req.user)) {
      const query = {
        student: req.user._id,
        status: 'published',
      }

      if (testId) query.test = testId

      const marks = await Mark.find(query)
        .populate({
          path: 'test',
          select:
            'title maxMarks passingMarks scheduledAt resultsPublishedAt class subject',
          populate: [
            { path: 'class', select: 'name section' },
            { path: 'subject', select: 'name' },
          ],
        })
        .sort({ publishedAt: -1 })
        .lean()

      const safeMarks = marks.filter(
        (mark) =>
          mark.test && mark.test.resultsPublishedAt != null,
      )
      const csv = toCsv(
        [
          'Test',
          'Subject',
          'Class',
          'Test date',
          'Assessment status',
          'Marks obtained',
          'Maximum marks',
          'Percentage',
          'Pass/fail',
          'Published at',
        ],
        studentExportRows(safeMarks),
      )

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${csvFileName('my-results')}"`,
      )
      return res.send(csv)
    }

    if (!testId) {
      return res.status(400).json({
        success: false,
        message: 'Select a test to export results.',
      })
    }

    const test = await Test.findById(testId).lean()

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found.',
      })
    }

    if (
      !isAdmin(req.user) &&
      !(isTeacher(req.user) && userCanAccessClass(req.user, test.class))
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this test.',
      })
    }

    const [marks, expectedStudents] = await Promise.all([
      Mark.find({ test: test._id })
        .populate('student', 'name rollNumber')
        .lean(),
      expectedStudentsForTest(test),
    ])
    const rows = buildRows({ test, marks, expectedStudents })
    const csv = toCsv(
      [
        'Student',
        'Roll number',
        'Assessment status',
        'Marks obtained',
        'Maximum marks',
        'Percentage',
        'Pass/fail',
        'Publication status',
        'Published at',
      ],
      staffExportRows(rows),
    )

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${csvFileName(
        `${test.title}-results`,
      )}"`,
    )
    return res.send(csv)
  } catch (error) {
    return next(error)
  }
}
