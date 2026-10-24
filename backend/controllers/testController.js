import mongoose from 'mongoose'
import { z } from 'zod'

import Class from '../models/Class.js'
import Mark from '../models/Mark.js'
import Subject from '../models/Subject.js'
import Test from '../models/Test.js'
import User from '../models/User.js'
import { recordAudit } from '../utils/audit.js'
import {
  escapeRegex,
  invalidId,
  notFound,
  paginationMeta,
  parsePagination,
  validationError,
} from '../utils/query.js'
import {
  isAdmin,
  isStudent,
  isTeacher,
  teacherClassIds,
  teacherOwnsClass,
  userCanAccessClass,
} from '../utils/authorization.js'
import {
  DEFAULT_PASS_PERCENTAGE,
  effectivePassingMarks,
  normalizeAssessmentStatus,
  passState,
  percentageFor,
  round2,
} from '../utils/resultAnalytics.js'

const objectId = z
  .string()
  .trim()
  .refine((value) => mongoose.isValidObjectId(value), 'Invalid ID.')

const optionalObjectId = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || mongoose.isValidObjectId(value),
    'Invalid ID.',
  )

const dateField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.')
  .optional()
  .or(z.literal(''))

const passingMarksField = z
  .union([
    z.number().min(0).max(10000),
    z.null(),
  ])
  .optional()

const testCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(1000).optional().default(''),
    classId: objectId,
    subjectId: optionalObjectId,
    maxMarks: z.coerce.number().min(1).max(10000),
    passingMarks: passingMarksField,
    scheduledAt: dateField,
    status: z.enum(['draft', 'published', 'closed']).optional(),
  })
  .strict()

const testUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(1000).optional(),
    classId: objectId.optional(),
    subjectId: optionalObjectId,
    maxMarks: z.coerce.number().min(1).max(10000).optional(),
    passingMarks: passingMarksField,
    scheduledAt: dateField,
    status: z.enum(['draft', 'published', 'closed']).optional(),
  })
  .strict()

const markEntrySchema = z
  .object({
    studentId: objectId,
    marksObtained: z.number().min(0).max(10000).nullable().optional(),
    assessmentStatus: z
      .enum(['entered', 'absent', 'missing', 'exempt'])
      .optional(),
    clear: z.boolean().optional(),
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.clear) return

    const status = entry.assessmentStatus || 'entered'

    if (status === 'entered') {
      if (
        entry.marksObtained == null ||
        !Number.isFinite(entry.marksObtained)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['marksObtained'],
          message: 'Enter a valid mark for this student.',
        })
      }
      return
    }

    if (entry.marksObtained != null) {
      context.addIssue({
        code: 'custom',
        path: ['marksObtained'],
        message:
          'Marks must be empty for absent, missing, or exempt results.',
      })
    }
  })

const marksSchema = z
  .object({
    marks: z
      .array(markEntrySchema)
      .min(1, 'Add at least one mark.')
      .max(500, 'Too many marks in one request.'),
  })
  .strict()

function normalizeDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function testResponse(test, result = undefined) {
  return {
    id: String(test._id),
    title: test.title,
    description: test.description,
    class: test.class,
    subject: test.subject,
    maxMarks: test.maxMarks,
    passingMarks: test.passingMarks ?? null,
    effectivePassingMarks: effectivePassingMarks(test),
    scheduledAt: test.scheduledAt,
    status: test.status,
    createdBy: test.createdBy,
    publishedAt: test.publishedAt,
    resultsPublishedAt: test.resultsPublishedAt,
    resultsPublishedBy: test.resultsPublishedBy || null,
    createdAt: test.createdAt,
    updatedAt: test.updatedAt,
    ...(result !== undefined ? { result } : {}),
  }
}

function markResponse(mark, test = mark.test) {
  const assessmentStatus = normalizeAssessmentStatus(mark)
  const percentage = percentageFor(
    mark.marksObtained,
    mark.maxMarks ?? test?.maxMarks,
  )

  return {
    id: String(mark._id),
    test: mark.test,
    student: mark.student,
    class: mark.class,
    marksObtained:
      assessmentStatus === 'entered' ? mark.marksObtained : null,
    maxMarks: mark.maxMarks,
    passingMarks: test ? effectivePassingMarks(test) : null,
    percentage,
    assessmentStatus,
    pass:
      assessmentStatus === 'entered'
        ? passState(mark, test || { maxMarks: mark.maxMarks })
        : null,
    status: mark.status,
    enteredBy: mark.enteredBy,
    publishedBy: mark.publishedBy,
    publishedAt: mark.publishedAt,
    history: mark.history,
    createdAt: mark.createdAt,
    updatedAt: mark.updatedAt,
  }
}

function markPublicationPipeline(userId, at) {
  return [
    {
      $set: {
        status: 'published',
        publishedBy: new mongoose.Types.ObjectId(String(userId)),
        publishedAt: at,
        updatedAt: at,
        history: {
          $concatArrays: [
            { $ifNull: ['$history', []] },
            [
              {
                action: 'published',
                previousMarks: '$marksObtained',
                marksObtained: '$marksObtained',
                changedBy: new mongoose.Types.ObjectId(
                  String(userId),
                ),
                at,
              },
            ],
          ],
        },
      },
    },
  ]
}

function markUnpublicationPipeline(userId, at) {
  return [
    {
      $set: {
        status: 'draft',
        publishedBy: null,
        publishedAt: null,
        updatedAt: at,
        history: {
          $concatArrays: [
            { $ifNull: ['$history', []] },
            [
              {
                action: 'unpublished',
                previousMarks: '$marksObtained',
                marksObtained: '$marksObtained',
                changedBy: new mongoose.Types.ObjectId(
                  String(userId),
                ),
                at,
              },
            ],
          ],
        },
      },
    },
  ]
}

function getTestFilter(req) {
  const filter = {}

  if (isStudent(req.user)) {
    filter.class = req.user.class || null
    filter.status = { $in: ['published', 'closed'] }
  } else if (isTeacher(req.user)) {
    filter.class = { $in: teacherClassIds(req.user) }
  }

  if (req.query.classId) {
    if (!mongoose.isValidObjectId(req.query.classId)) {
      return { error: 'class ID' }
    }

    if (!userCanAccessClass(req.user, req.query.classId)) {
      return { forbidden: true }
    }

    filter.class = req.query.classId
  }

  if (req.query.subjectId) {
    if (!mongoose.isValidObjectId(req.query.subjectId)) {
      return { error: 'subject ID' }
    }

    filter.subject = req.query.subjectId
  }

  if (req.query.status && !isStudent(req.user)) {
    if (
      !['draft', 'published', 'closed'].includes(req.query.status)
    ) {
      return { error: 'test status' }
    }

    filter.status = req.query.status
  }

  const search = String(req.query.search || '').trim()
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ title: regex }, { description: regex }]
  }

  return { filter }
}

function populateTest(query) {
  return query
    .populate('class', 'name section academicYear')
    .populate('subject', 'name code')
    .populate('createdBy', 'name role')
}

async function canManageTest(user, test) {
  if (isAdmin(user)) return true

  const classId = test.class?._id || test.class
  return isTeacher(user) && teacherOwnsClass(user, classId)
}

async function validateClassAndSubject(req, classId, subjectId) {
  if (!mongoose.isValidObjectId(classId)) {
    return { message: 'Invalid class.' }
  }

  if (!userCanAccessClass(req.user, classId)) {
    return {
      status: 403,
      message: 'You can only manage tests for your classes.',
    }
  }

  const classExists = await Class.exists({ _id: classId })

  if (!classExists) {
    return { message: 'The selected class does not exist.' }
  }

  let subject = null

  if (subjectId) {
    subject = await Subject.findOne({
      _id: subjectId,
      class: classId,
    })

    if (!subject) {
      return {
        message: 'The selected subject does not belong to this class.',
      }
    }
  }

  return { subject }
}

export async function listTests(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const built = getTestFilter(req)

    if (built.error) return invalidId(res, built.error)
    if (built.forbidden) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this class.',
      })
    }

    const [total, tests] = await Promise.all([
      Test.countDocuments(built.filter),
      populateTest(
        Test.find(built.filter)
          .sort({ scheduledAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
      ).lean(),
    ])

    return res.status(200).json({
      success: true,
      count: tests.length,
      data: tests.map((test) => testResponse(test)),
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    return next(error)
  }
}

export async function getTest(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'test ID')
    }

    const test = await populateTest(
      Test.findById(req.params.id),
    ).lean()

    if (!test) {
      return notFound(res, 'Test not found.')
    }

    if (isStudent(req.user)) {
      if (
        String(test.class?._id || test.class) !==
          String(req.user.class || '') ||
        !['published', 'closed'].includes(test.status)
      ) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this test.',
        })
      }

      const mark = test.resultsPublishedAt
        ? await Mark.findOne({
            test: test._id,
            student: req.user._id,
            status: 'published',
          }).lean()
        : null

      const observation = mark
        ? markResponse(mark, test)
        : null

      return res.status(200).json({
        success: true,
        data: testResponse(test, observation),
      })
    }

    if (!(await canManageTest(req.user, test))) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this test.',
      })
    }

    return res.status(200).json({
      success: true,
      data: testResponse(test),
    })
  } catch (error) {
    return next(error)
  }
}

export async function createTest(req, res, next) {
  try {
    const parsed = testCreateSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(
        res,
        parsed.error,
        'Please check the test details.',
      )
    }

    const validated = await validateClassAndSubject(
      req,
      parsed.data.classId,
      parsed.data.subjectId,
    )

    if (validated.message) {
      return res.status(validated.status || 400).json({
        success: false,
        message: validated.message,
      })
    }

    const scheduledAt = normalizeDate(parsed.data.scheduledAt)

    if (scheduledAt === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scheduled date.',
      })
    }

    const status = parsed.data.status || 'draft'
    const passingMarks =
      parsed.data.passingMarks == null
        ? round2(
            parsed.data.maxMarks * (DEFAULT_PASS_PERCENTAGE / 100),
          )
        : parsed.data.passingMarks

    if (passingMarks > parsed.data.maxMarks) {
      return res.status(400).json({
        success: false,
        message: 'Passing marks cannot exceed maximum marks.',
      })
    }

    const test = await Test.create({
      title: parsed.data.title,
      description: parsed.data.description,
      class: parsed.data.classId,
      subject: validated.subject?._id || null,
      maxMarks: parsed.data.maxMarks,
      passingMarks,
      scheduledAt,
      status,
      createdBy: req.user._id,
      publishedAt: status === 'published' ? new Date() : null,
    })

    const created = await populateTest(
      Test.findById(test._id),
    ).lean()

    await recordAudit(req, {
      action: 'test.created',
      targetType: 'test',
      targetId: test._id,
      metadata: {
        status: test.status,
        classId: String(test.class),
        subjectScoped: Boolean(test.subject),
      },
    })

    return res.status(201).json({
      success: true,
      message: 'Test created successfully.',
      data: testResponse(created),
    })
  } catch (error) {
    return next(error)
  }
}

export async function updateTest(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'test ID')
    }

    const parsed = testUpdateSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(res, parsed.error)
    }

    const test = await Test.findById(req.params.id)

    if (!test) {
      return notFound(res, 'Test not found.')
    }

    if (!(await canManageTest(req.user, test))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot manage this test.',
      })
    }

    const marksExist = await Mark.exists({ test: test._id })
    const classChanged =
      parsed.data.classId !== undefined &&
      String(parsed.data.classId) !== String(test.class)
    const subjectChanged =
      parsed.data.subjectId !== undefined &&
      String(parsed.data.subjectId || '') !==
        String(test.subject || '')
    const maxMarksChanged =
      parsed.data.maxMarks !== undefined &&
      parsed.data.maxMarks !== test.maxMarks
    const passingMarksChanged =
      parsed.data.passingMarks !== undefined &&
      parsed.data.passingMarks !== (test.passingMarks ?? null)
    const changingAssessmentStructure =
      classChanged ||
      subjectChanged ||
      maxMarksChanged ||
      passingMarksChanged

    if (test.resultsPublishedAt && changingAssessmentStructure) {
      return res.status(409).json({
        success: false,
        message:
          'Unpublish results before changing the class, subject, maximum marks, or passing marks.',
      })
    }

    if (
      marksExist &&
      parsed.data.classId !== undefined &&
      String(parsed.data.classId) !== String(test.class)
    ) {
      return res.status(409).json({
        success: false,
        message: 'Remove existing marks before changing the class.',
      })
    }

    if (
      marksExist &&
      parsed.data.maxMarks !== undefined &&
      parsed.data.maxMarks !== test.maxMarks
    ) {
      return res.status(409).json({
        success: false,
        message:
          'Remove existing marks before changing the maximum marks.',
      })
    }

    const nextMaxMarks =
      parsed.data.maxMarks !== undefined
        ? parsed.data.maxMarks
        : test.maxMarks
    const nextPassingMarks =
      parsed.data.passingMarks !== undefined
        ? parsed.data.passingMarks
        : test.passingMarks

    if (
      nextPassingMarks != null &&
      nextPassingMarks > nextMaxMarks
    ) {
      return res.status(400).json({
        success: false,
        message: 'Passing marks cannot exceed maximum marks.',
      })
    }

    const classId = parsed.data.classId || test.class
    let subject = null

    if (
      parsed.data.classId !== undefined ||
      parsed.data.subjectId !== undefined
    ) {
      const subjectId =
        parsed.data.subjectId !== undefined
          ? parsed.data.subjectId
          : test.subject

      const validated = await validateClassAndSubject(
        req,
        classId,
        subjectId,
      )

      if (validated.message) {
        return res.status(validated.status || 400).json({
          success: false,
          message: validated.message,
        })
      }

      subject = validated.subject
    }

    if (parsed.data.scheduledAt !== undefined) {
      const scheduledAt = normalizeDate(parsed.data.scheduledAt)

      if (scheduledAt === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Invalid scheduled date.',
        })
      }

      test.scheduledAt = scheduledAt
    }

    if (parsed.data.classId !== undefined) {
      test.class = parsed.data.classId
    }

    if (
      parsed.data.classId !== undefined ||
      parsed.data.subjectId !== undefined
    ) {
      test.subject = subject?._id || null
    }

    if (parsed.data.title !== undefined) {
      test.title = parsed.data.title
    }
    if (parsed.data.description !== undefined) {
      test.description = parsed.data.description
    }
    if (parsed.data.maxMarks !== undefined) {
      test.maxMarks = parsed.data.maxMarks
    }

    if (parsed.data.passingMarks !== undefined) {
      test.passingMarks = parsed.data.passingMarks
    }

    if (
      parsed.data.maxMarks !== undefined &&
      parsed.data.passingMarks === undefined &&
      test.passingMarks == null
    ) {
      test.passingMarks = round2(
        parsed.data.maxMarks * (DEFAULT_PASS_PERCENTAGE / 100),
      )
    }

    if (parsed.data.status !== undefined) {
      const nextStatus = parsed.data.status

      if (
        nextStatus !== test.status &&
        nextStatus === 'closed' &&
        !test.resultsPublishedAt
      ) {
        return res.status(409).json({
          success: false,
          message: 'Publish results to close this test.',
        })
      }

      if (
        test.resultsPublishedAt &&
        nextStatus !== 'closed'
      ) {
        return res.status(409).json({
          success: false,
          message:
            'Unpublish results before changing the test status.',
        })
      }

      test.status = nextStatus

      if (nextStatus === 'published' && !test.publishedAt) {
        test.publishedAt = new Date()
      }
    }

    await test.save()

    const updated = await populateTest(
      Test.findById(test._id),
    ).lean()

    await recordAudit(req, {
      action: 'test.updated',
      targetType: 'test',
      targetId: test._id,
      metadata: {
        status: test.status,
        fields: Object.keys(parsed.data),
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Test updated successfully.',
      data: testResponse(updated),
    })
  } catch (error) {
    return next(error)
  }
}

export async function saveMarks(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'test ID')
    }

    const parsed = marksSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(
        res,
        parsed.error,
        'Please check the marks.',
      )
    }

    const test = await Test.findById(req.params.id)

    if (!test) {
      return notFound(res, 'Test not found.')
    }

    if (!(await canManageTest(req.user, test))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot enter marks for this test.',
      })
    }

    const studentIds = parsed.data.marks.map(
      (entry) => entry.studentId,
    )

    if (new Set(studentIds).size !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Each student can only appear once.',
      })
    }

    for (const entry of parsed.data.marks) {
      if (entry.clear) continue

      const status = entry.assessmentStatus || 'entered'

      if (
        status === 'entered' &&
        entry.marksObtained > test.maxMarks
      ) {
        return res.status(400).json({
          success: false,
          message: `Marks cannot exceed ${test.maxMarks}.`,
        })
      }
    }

    const [students, existingMarks] = await Promise.all([
      User.find({
        _id: { $in: studentIds },
        role: 'student',
        status: 'active',
        class: test.class,
      })
        .select('_id name rollNumber')
        .lean(),
      Mark.find({
        test: test._id,
        student: { $in: studentIds },
      }),
    ])

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message:
          'One or more students are not active members of this class.',
      })
    }

    if (existingMarks.some((mark) => mark.status === 'published')) {
      return res.status(409).json({
        success: false,
        message:
          'Results are already published. Unpublish them before editing marks.',
      })
    }

    const existingByStudent = new Map(
      existingMarks.map((mark) => [String(mark.student), mark]),
    )

    let saved = 0
    let cleared = 0

    for (const entry of parsed.data.marks) {
      const existing = existingByStudent.get(entry.studentId)

      if (entry.clear) {
        if (existing) {
          await existing.deleteOne()
          cleared += 1
        }

        continue
      }

      const assessmentStatus =
        entry.assessmentStatus || 'entered'
      const marksObtained =
        assessmentStatus === 'entered'
          ? entry.marksObtained
          : null
      const previous = existing?.marksObtained ?? null

      if (existing) {
        existing.marksObtained = marksObtained
        existing.assessmentStatus = assessmentStatus
        existing.maxMarks = test.maxMarks
        existing.enteredBy = req.user._id
        existing.status = 'draft'
        existing.publishedAt = null
        existing.publishedBy = null
        existing.history.push({
          action: 'updated',
          previousMarks: previous,
          marksObtained,
          changedBy: req.user._id,
          at: new Date(),
        })

        await existing.save()
        saved += 1
      } else {
        await Mark.create({
          test: test._id,
          student: entry.studentId,
          class: test.class,
          marksObtained,
          maxMarks: test.maxMarks,
          assessmentStatus,
          status: 'draft',
          enteredBy: req.user._id,
          history: [
            {
              action: 'created',
              previousMarks: null,
              marksObtained,
              changedBy: req.user._id,
              at: new Date(),
            },
          ],
        })

        saved += 1
      }
    }

    await recordAudit(req, {
      action: 'marks.saved',
      targetType: 'test',
      targetId: test._id,
      metadata: { saved, cleared },
    })

    return res.status(200).json({
      success: true,
      message:
        cleared > 0
          ? `Marks saved as drafts. ${cleared} cleared.`
          : 'Marks saved as drafts.',
      data: {
        saved,
        cleared,
        testId: String(test._id),
      },
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'These marks changed in another request. Reload the marks and try again.',
      })
    }

    return next(error)
  }
}

export async function listTestMarks(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'test ID')
    }

    const test = await Test.findById(req.params.id).lean()

    if (!test) {
      return notFound(res, 'Test not found.')
    }

    if (!(await canManageTest(req.user, test))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot view marks for this test.',
      })
    }

    const marks = await Mark.find({ test: test._id })
      .populate('student', 'name email rollNumber class')
      .populate('enteredBy', 'name')
      .populate('publishedBy', 'name')
      .sort({ createdAt: 1 })
      .lean()

    return res.status(200).json({
      success: true,
      count: marks.length,
      data: marks.map((mark) => markResponse(mark, test)),
    })
  } catch (error) {
    return next(error)
  }
}

export async function publishResults(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'test ID')
    }

    const test = await Test.findById(req.params.id)

    if (!test) {
      return notFound(res, 'Test not found.')
    }

    if (!(await canManageTest(req.user, test))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot publish results for this test.',
      })
    }

    const [marks, expectedStudents] = await Promise.all([
      Mark.find({ test: test._id }),
      User.find({
        role: 'student',
        status: 'active',
        class: test.class,
      })
        .select('_id')
        .lean(),
    ])

    if (marks.length === 0) {
      return res.status(409).json({
        success: false,
        message: 'Enter marks before publishing results.',
      })
    }

    const markedStudents = new Set(
      marks.map((mark) => String(mark.student)),
    )
    const missingStudents = expectedStudents.filter(
      (student) => !markedStudents.has(String(student._id)),
    )

    if (missingStudents.length > 0) {
      return res.status(409).json({
        success: false,
        message: `${missingStudents.length} active student${
          missingStudents.length === 1 ? ' has' : 's have'
        } no mark record. Record marks, absence, missing, or exemption before publishing.`,
      })
    }

    const enteredCount = marks.filter(
      (mark) => normalizeAssessmentStatus(mark) === 'entered',
    ).length

    if (enteredCount === 0) {
      return res.status(409).json({
        success: false,
        message:
          'Enter at least one scored mark before publishing results.',
      })
    }

    const now = new Date()

    if (test.resultsPublishedAt) {
      await Mark.updateMany(
        { test: test._id, status: { $ne: 'published' } },
        markPublicationPipeline(
          req.user._id,
          test.resultsPublishedAt,
        ),
      )

      await recordAudit(req, {
        action: 'results.published',
        targetType: 'test',
        targetId: test._id,
        metadata: {
          alreadyPublished: true,
          publishedCount: marks.length,
        },
      })

      return res.status(200).json({
        success: true,
        message: 'Results are already published.',
        data: {
          testId: String(test._id),
          published: marks.length,
          publishedAt: test.resultsPublishedAt,
        },
      })
    }

    const previousState = {
      status: test.status,
      resultsPublishedAt: test.resultsPublishedAt,
      resultsPublishedBy: test.resultsPublishedBy,
    }

    const claimed = await Test.findOneAndUpdate(
      {
        _id: test._id,
        resultsPublishedAt: null,
      },
      {
        $set: {
          status: 'closed',
          resultsPublishedAt: now,
          resultsPublishedBy: req.user._id,
        },
      },
      { new: true },
    ).lean()

    if (!claimed) {
      return res.status(409).json({
        success: false,
        message:
          'Results were changed by another request. Reload and try again.',
      })
    }

    try {
      await Mark.updateMany(
        { test: test._id, status: { $ne: 'published' } },
        markPublicationPipeline(req.user._id, now),
      )
    } catch (error) {
      await Test.updateOne(
        { _id: test._id, resultsPublishedAt: now },
        { $set: previousState },
      ).catch(() => {
        console.error('Unable to roll back result publication.')
      })

      throw error
    }

    await recordAudit(req, {
      action: 'results.published',
      targetType: 'test',
      targetId: test._id,
      metadata: {
        alreadyPublished: false,
        publishedCount: marks.length,
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Results published successfully.',
      data: {
        testId: String(test._id),
        published: marks.length,
        publishedAt: now,
      },
    })
  } catch (error) {
    return next(error)
  }
}

export async function unpublishResults(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'test ID')
    }

    const test = await Test.findById(req.params.id)

    if (!test) {
      return notFound(res, 'Test not found.')
    }

    if (!(await canManageTest(req.user, test))) {
      return res.status(403).json({
        success: false,
        message: 'You cannot unpublish results for this test.',
      })
    }

    if (!test.resultsPublishedAt) {
      return res.status(200).json({
        success: true,
        message: 'Results are already unpublished.',
        data: {
          testId: String(test._id),
          unpublished: 0,
        },
      })
    }

    const nextStatus =
      test.status === 'closed' ? 'published' : test.status
    const now = new Date()
    const previousState = {
      status: test.status,
      resultsPublishedAt: test.resultsPublishedAt,
      resultsPublishedBy: test.resultsPublishedBy,
    }

    const claimed = await Test.findOneAndUpdate(
      {
        _id: test._id,
        resultsPublishedAt: { $ne: null },
      },
      {
        $set: {
          resultsPublishedAt: null,
          resultsPublishedBy: null,
          status: nextStatus,
        },
      },
      { new: true },
    ).lean()

    if (!claimed) {
      return res.status(200).json({
        success: true,
        message: 'Results are already unpublished.',
        data: {
          testId: String(test._id),
          unpublished: 0,
        },
      })
    }

    let unpublished = 0

    try {
      const result = await Mark.updateMany(
        { test: test._id, status: 'published' },
        markUnpublicationPipeline(req.user._id, now),
      )
      unpublished = result.modifiedCount || 0
    } catch (error) {
      await Test.updateOne(
        { _id: test._id, resultsPublishedAt: null },
        { $set: previousState },
      ).catch(() => {
        console.error('Unable to roll back result unpublication.')
      })

      throw error
    }

    await recordAudit(req, {
      action: 'results.unpublished',
      targetType: 'test',
      targetId: test._id,
      metadata: { unpublishedCount: unpublished },
    })

    return res.status(200).json({
      success: true,
      message:
        'Results unpublished. Marks are now editable drafts.',
      data: {
        testId: String(test._id),
        unpublished,
      },
    })
  } catch (error) {
    return next(error)
  }
}

export async function listResults(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const filter = {}

    if (isStudent(req.user)) {
      filter.student = req.user._id
      filter.status = 'published'
    } else if (isTeacher(req.user)) {
      filter.class = { $in: teacherClassIds(req.user) }
    }

    if (req.query.testId) {
      if (!mongoose.isValidObjectId(req.query.testId)) {
        return invalidId(res, 'test ID')
      }

      filter.test = req.query.testId
    }

    if (req.query.studentId) {
      if (!mongoose.isValidObjectId(req.query.studentId)) {
        return invalidId(res, 'student ID')
      }

      if (
        isStudent(req.user) &&
        String(req.query.studentId) !== String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own results.',
        })
      }

      filter.student = req.query.studentId
    }

    if (isStudent(req.user)) {
      const publishedTests = await Test.find({
        class: req.user.class || null,
        resultsPublishedAt: { $ne: null },
      })
        .select('_id')
        .lean()

      const publishedIds = publishedTests.map((test) => test._id)

      if (req.query.testId) {
        filter.test = publishedIds.some(
          (id) => String(id) === String(req.query.testId),
        )
          ? req.query.testId
          : { $in: [] }
      } else {
        filter.test = { $in: publishedIds }
      }
    }

    const [total, results] = await Promise.all([
      Mark.countDocuments(filter),
      Mark.find(filter)
        .populate({
          path: 'test',
          select:
            'title maxMarks passingMarks scheduledAt status resultsPublishedAt',
        })
        .populate({
          path: 'student',
          select: 'name email rollNumber',
        })
        .populate({
          path: 'class',
          select: 'name section academicYear',
        })
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ])

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results.map(markResponse),
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    return next(error)
  }
}
