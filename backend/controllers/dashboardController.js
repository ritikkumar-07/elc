import Attendance from '../models/Attendance.js'
import Announcement from '../models/Announcement.js'
import AuditLog from '../models/AuditLog.js'
import Class from '../models/Class.js'
import Mark from '../models/Mark.js'
import StudyMaterial from '../models/StudyMaterial.js'
import Subject from '../models/Subject.js'
import Test from '../models/Test.js'
import User from '../models/User.js'
import { isStudent } from '../utils/authorization.js'
import {
  normalizeAssessmentStatus,
  passState,
  percentageFor,
  round2,
} from '../utils/resultAnalytics.js'

async function attendanceSummary(studentId) {
  const summary = await Attendance.aggregate([
    { $match: { 'records.student': studentId } },
    { $unwind: '$records' },
    { $match: { 'records.student': studentId } },
    {
      $group: {
        _id: '$records.status',
        count: { $sum: 1 },
      },
    },
  ])

  const counts = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  }

  for (const item of summary) {
    counts[item._id] = item.count
  }

  const totalDays = Object.values(counts).reduce(
    (sum, value) => sum + value,
    0,
  )
  const attended = counts.present + counts.late + counts.excused

  return {
    ...counts,
    totalDays,
    percentage:
      totalDays > 0
        ? Number(((attended / totalDays) * 100).toFixed(2))
        : null,
  }
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function upcomingTestFilter(classIds) {
  const today = startOfToday()

  return {
    class: { $in: classIds },
    status: 'published',
    $or: [
      { scheduledAt: null },
      { scheduledAt: { $exists: false } },
      { scheduledAt: { $gte: today } },
    ],
  }
}

async function adminDashboard() {
  const [
    activeStudents,
    activeTeachers,
    pendingRegistrations,
    classes,
    subjects,
    materials,
    tests,
    announcements,
    recentRegistrations,
    upcomingTests,
    recentAnnouncements,
    recentActivity,
  ] = await Promise.all([
    User.countDocuments({ role: 'student', status: 'active' }),
    User.countDocuments({ role: 'teacher', status: 'active' }),
    User.countDocuments({
      role: { $in: ['student', 'teacher'] },
      status: 'pending',
    }),
    Class.countDocuments({ isActive: true }),
    Subject.countDocuments({ isActive: true }),
    StudyMaterial.countDocuments({
      isPublished: true,
      isArchived: false,
    }),
    Test.countDocuments(),
    Announcement.countDocuments({ status: 'published' }),
    User.find({
      role: { $in: ['student', 'teacher'] },
      status: 'pending',
    })
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Test.find({
      status: 'published',
      $or: [
        { scheduledAt: null },
        { scheduledAt: { $exists: false } },
        { scheduledAt: { $gte: startOfToday() } },
      ],
    })
      .populate('class', 'name section')
      .populate('subject', 'name')
      .sort({ scheduledAt: 1 })
      .limit(5)
      .lean(),
    Announcement.find({ status: 'published' })
      .select('title audience publishAt createdAt')
      .sort({ publishAt: -1, createdAt: -1 })
      .limit(5)
      .lean(),
    AuditLog.find({})
      .select(
        'actor actorRole action targetType targetId outcome createdAt',
      )
      .populate('actor', 'name role')
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .lean(),
  ])

  return {
    stats: {
      activeStudents,
      activeTeachers,
      pendingRegistrations,
      classes,
      subjects,
      materials,
      tests,
      announcements,
    },
    recentRegistrations,
    upcomingTests,
    recentAnnouncements,
    recentActivity: recentActivity.map((entry) => ({
      id: String(entry._id),
      action: entry.action,
      actorRole: entry.actorRole,
      actor: entry.actor
        ? {
            id: String(entry.actor._id),
            name: entry.actor.name,
            role: entry.actor.role,
          }
        : null,
      targetType: entry.targetType,
      targetId: entry.targetId || null,
      outcome: entry.outcome,
      createdAt: entry.createdAt,
    })),
  }
}

async function teacherDashboard(user) {
  const classIds = user.assignedClasses || []

  if (classIds.length === 0) {
    return {
      classes: [],
      stats: {
        assignedClasses: 0,
        activeStudents: 0,
        materials: 0,
        tests: 0,
        publishedResults: 0,
      },
      upcomingTests: [],
      recentMaterials: [],
      recentAnnouncements: [],
    }
  }

  const now = new Date()

  const [
    classes,
    activeStudents,
    materials,
    tests,
    publishedResults,
    upcomingTests,
    recentMaterials,
    recentAnnouncements,
  ] = await Promise.all([
    Class.find({ _id: { $in: classIds } })
      .select('name section academicYear isActive')
      .sort({ name: 1 })
      .lean(),
    User.countDocuments({
      role: 'student',
      status: 'active',
      class: { $in: classIds },
    }),
    StudyMaterial.countDocuments({
      class: { $in: classIds },
      isArchived: false,
    }),
    Test.countDocuments({ class: { $in: classIds } }),
    Mark.countDocuments({
      class: { $in: classIds },
      status: 'published',
    }),
    Test.find(upcomingTestFilter(classIds))
      .populate('class', 'name section')
      .populate('subject', 'name')
      .sort({ scheduledAt: 1 })
      .limit(5)
      .lean(),
    StudyMaterial.find({
      class: { $in: classIds },
      isArchived: false,
    })
      .populate('class', 'name section')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Announcement.find({
      status: 'published',
      $and: [
        {
          $or: [
            { class: { $in: classIds } },
            { class: null },
            { class: { $exists: false } },
          ],
        },
        {
          $or: [
            { publishAt: null },
            { publishAt: { $exists: false } },
            { publishAt: { $lte: now } },
          ],
        },
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: now } },
          ],
        },
      ],
    })
      .select('title audience publishAt createdAt')
      .sort({ publishAt: -1, createdAt: -1 })
      .limit(5)
      .lean(),
  ])

  return {
    classes,
    stats: {
      assignedClasses: classes.length,
      activeStudents,
      materials,
      tests,
      publishedResults,
    },
    upcomingTests,
    recentMaterials,
    recentAnnouncements,
  }
}

async function studentDashboard(user) {
  const classId = user.class || null
  const now = new Date()

  if (!classId) {
    return {
      class: null,
      stats: {
        materials: 0,
        tests: 0,
        announcements: 0,
        averageResult: null,
        bestResult: null,
        publishedResults: 0,
      },
      attendance: await attendanceSummary(user._id),
      upcomingTests: [],
      recentResults: [],
      recentMaterials: [],
      recentAnnouncements: [],
    }
  }

  const publishedResults = await Test.find({
    class: classId,
    resultsPublishedAt: { $ne: null },
  })
    .select('_id')
    .lean()
  const publishedTestIds = publishedResults.map(
    (test) => test._id,
  )

  const [
    classInfo,
    materials,
    tests,
    announcements,
    attendance,
    upcomingTests,
    recentResults,
    recentMaterials,
    recentAnnouncements,
    resultSummary,
  ] = await Promise.all([
    Class.findById(classId)
      .select('name section academicYear')
      .lean(),
    StudyMaterial.countDocuments({
      class: classId,
      isPublished: true,
      isArchived: false,
    }),
    Test.countDocuments({
      class: classId,
      status: { $in: ['published', 'closed'] },
    }),
    Announcement.countDocuments({
      status: 'published',
      audience: { $in: ['all', 'students'] },
      $and: [
        {
          $or: [
            { class: null },
            { class: { $exists: false } },
            { class: classId },
          ],
        },
        {
          $or: [
            { publishAt: null },
            { publishAt: { $exists: false } },
            { publishAt: { $lte: now } },
          ],
        },
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: now } },
          ],
        },
      ],
    }),
    attendanceSummary(user._id),
    Test.find(upcomingTestFilter([classId]))
      .populate('subject', 'name')
      .sort({ scheduledAt: 1 })
      .limit(5)
      .lean(),
    Mark.find({
      student: user._id,
      test: { $in: publishedTestIds },
      status: 'published',
    })
        .populate(
          'test',
          'title maxMarks passingMarks scheduledAt status resultsPublishedAt',
        )
        .populate('class', 'name section')
        .sort({ publishedAt: -1 })
      .limit(5)
      .lean(),
    StudyMaterial.find({
      class: classId,
      isPublished: true,
      isArchived: false,
    })
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Announcement.find({
      status: 'published',
      audience: { $in: ['all', 'students'] },
      $and: [
        {
          $or: [
            { class: null },
            { class: { $exists: false } },
            { class: classId },
          ],
        },
        {
          $or: [
            { publishAt: null },
            { publishAt: { $exists: false } },
            { publishAt: { $lte: now } },
          ],
        },
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: now } },
          ],
        },
      ],
    })
      .select('title content publishAt createdAt')
      .sort({ publishAt: -1, createdAt: -1 })
      .limit(5)
      .lean(),
    Mark.aggregate([
      {
        $match: {
          student: user._id,
          test: { $in: publishedTestIds },
          status: 'published',
          $or: [
            { assessmentStatus: 'entered' },
            {
              assessmentStatus: { $exists: false },
              marksObtained: { $type: 'number' },
            },
          ],
        },
      },
      {
        $group: {
          _id: null,
          average: {
            $avg: {
              $multiply: [
                { $divide: ['$marksObtained', '$maxMarks'] },
                100,
              ],
            },
          },
          best: {
            $max: {
              $multiply: [
                { $divide: ['$marksObtained', '$maxMarks'] },
                100,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ])

  return {
    class: classInfo,
    stats: {
      materials,
      tests,
      announcements,
      averageResult:
        resultSummary.length > 0
          ? round2(resultSummary[0].average)
          : null,
      bestResult:
        resultSummary.length > 0
          ? round2(resultSummary[0].best)
          : null,
      publishedResults:
        resultSummary.length > 0 ? resultSummary[0].count : 0,
    },
    attendance,
    upcomingTests,
    recentResults: recentResults.map((mark) => {
      const assessmentStatus = normalizeAssessmentStatus(mark)
      const percentage =
        assessmentStatus === 'entered'
          ? percentageFor(mark.marksObtained, mark.maxMarks)
          : null

      return {
        id: String(mark._id),
        test: mark.test,
        class: mark.class,
        marksObtained:
          assessmentStatus === 'entered' ? mark.marksObtained : null,
        maxMarks: mark.maxMarks,
        percentage,
        assessmentStatus,
        pass:
          assessmentStatus === 'entered'
            ? passState(mark, mark.test || { maxMarks: mark.maxMarks })
            : null,
        publishedAt: mark.publishedAt,
      }
    }),
    recentMaterials,
    recentAnnouncements,
  }
}

export async function getDashboard(req, res, next) {
  try {
    let data

    if (req.user.role === 'admin') {
      data = await adminDashboard()
    } else if (isStudent(req.user)) {
      data = await studentDashboard(req.user)
    } else {
      data = await teacherDashboard(req.user)
    }

    return res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    return next(error)
  }
}
