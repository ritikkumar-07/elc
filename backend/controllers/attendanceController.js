import mongoose from 'mongoose'
import { z } from 'zod'

import Attendance from '../models/Attendance.js'
import Class from '../models/Class.js'
import User from '../models/User.js'
import { recordAudit } from '../utils/audit.js'
import {
  ATTENDANCE_STATUSES,
  MAX_ATTENDANCE_BATCH,
  MAX_CLASS_ATTENDANCE_STUDENTS,
  MAX_ROSTER_FILTER_STUDENTS,
  attendanceRevision,
  attendanceStudentId,
  buildAttendanceRecordMap,
  isValidAttendanceDateKey,
  mergeAttendanceRecords,
  normalizeAttendanceSession,
  recordsForStudents,
  summarizeAttendanceRecords,
} from '../utils/attendance.js'
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

const objectId = z
  .string()
  .trim()
  .refine((value) => mongoose.isValidObjectId(value), 'Invalid ID.')

const sessionSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return 'full-day'
  }

  return typeof value === 'string'
    ? normalizeAttendanceSession(value)
    : value
}, z.string().min(1).max(40))

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.')

const noteSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .default('')

const attendanceRecordSchema = z
  .object({
    studentId: objectId,
    status: z.enum(ATTENDANCE_STATUSES),
    note: noteSchema,
  })
  .strict()

const expectedRevisionSchema = z.number().int().min(0)

const attendanceSchema = z
  .object({
    classId: objectId,
    date: dateSchema,
    session: sessionSchema,
    records: z.array(attendanceRecordSchema).max(500),
    expectedRevision: expectedRevisionSchema.optional(),
  })
  .strict()

const batchSchema = z
  .object({
    classId: objectId,
    date: dateSchema,
    session: sessionSchema,
    records: z
      .array(attendanceRecordSchema)
      .min(1)
      .max(MAX_ATTENDANCE_BATCH),
    expectedRevision: expectedRevisionSchema,
  })
  .strict()

const classActionSchema = z
  .object({
    classId: objectId,
    date: dateSchema,
    session: sessionSchema,
    status: z.enum(ATTENDANCE_STATUSES),
    expectedRevision: expectedRevisionSchema,
    onlyUnmarked: z.boolean().optional().default(false),
  })
  .strict()

function zeroCounts() {
  return { present: 0, absent: 0, late: 0, excused: 0 }
}

function attendanceResponse(item, options = {}) {
  const { studentId = null } = options
  const records = (item.records || [])
    .filter(
      (record) =>
        !studentId ||
        attendanceStudentId(record.student) === String(studentId),
    )
    .map((record) => ({
      student: record.student,
      status: record.status,
      note: record.note,
    }))

  const counts = zeroCounts()

  for (const record of records) {
    if (counts[record.status] !== undefined) {
      counts[record.status] += 1
    }
  }

  return {
    id: String(item._id),
    class: item.class,
    date: item.dateKey,
    session: item.session,
    records,
    counts,
    recordCount: records.length,
    markedBy: item.markedBy,
    revision: attendanceRevision(item.revision),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function sessionResponse(item) {
  if (!item) {
    return {
      id: null,
      revision: 0,
      markedBy: null,
      createdAt: null,
      updatedAt: null,
    }
  }

  let markedBy = null

  if (item.markedBy && typeof item.markedBy === 'object') {
    markedBy = {
      id: String(item.markedBy._id || item.markedBy),
      name: item.markedBy.name || '',
    }
  } else if (item.markedBy) {
    markedBy = { id: String(item.markedBy), name: '' }
  }

  return {
    id: String(item._id),
    revision: attendanceRevision(item.revision),
    markedBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function revisionMatch(revision) {
  return revision === 0
    ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] }
    : { revision }
}

function conflictResponse(res, item) {
  return res.status(409).json({
    success: false,
    code: 'ATTENDANCE_CONFLICT',
    message:
      'Attendance changed while you were editing it. Reload the latest records before saving again.',
    revision: item ? attendanceRevision(item.revision) : 0,
    updatedAt: item?.updatedAt || null,
  })
}

async function authorizeClassWrite(req, res, classId) {
  if (!isAdmin(req.user) && !isTeacher(req.user)) {
    res.status(403).json({
      success: false,
      message: 'You do not have permission to mark attendance.',
    })
    return false
  }

  if (isTeacher(req.user) && !teacherOwnsClass(req.user, classId)) {
    res.status(403).json({
      success: false,
      message: 'You can only mark attendance for your classes.',
    })
    return false
  }

  const exists = await Class.exists({ _id: classId })

  if (!exists) {
    notFound(res, 'Class not found.')
    return false
  }

  return true
}

async function activeStudentsForClass(classId, limit) {
  return User.find({
    role: 'student',
    status: 'active',
    class: classId,
  })
    .select('_id')
    .sort({ rollNumber: 1, name: 1, _id: 1 })
    .limit(limit)
    .lean()
}

async function validateActiveStudentIds(classId, studentIds) {
  const students = await User.find({
    _id: { $in: studentIds },
    role: 'student',
    status: 'active',
    class: classId,
  })
    .select('_id')
    .lean()

  return students.length === studentIds.length
}

async function applyAttendanceUpdates({
  classId,
  date,
  session,
  updates,
  expectedRevision,
  user,
  onlyUnmarked = false,
}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await Attendance.findOne({
      class: classId,
      dateKey: date,
      session,
    })
      .select('records markedBy revision createdAt updatedAt')
      .lean()
    const currentRevision = attendanceRevision(current?.revision)

    if (!current) {
      if (expectedRevision !== 0) {
        return { conflict: true, current: null }
      }

      const merged = mergeAttendanceRecords([], updates, {
        onlyUnmarked,
      })

      try {
        const created = await Attendance.create({
          class: classId,
          dateKey: date,
          session,
          records: merged.records,
          markedBy: user._id,
          revision: 1,
        })

        return {
          attendance: created,
          changedCount: merged.changedCount,
          revision: 1,
        }
      } catch (error) {
        if (error.code === 11000 && attempt === 0) {
          continue
        }

        if (error.code === 11000) {
          return { conflict: true, current: null }
        }

        throw error
      }
    }

    if (expectedRevision !== currentRevision) {
      return { conflict: true, current }
    }

    const merged = mergeAttendanceRecords(current.records, updates, {
      onlyUnmarked,
    })

    if (merged.changedCount === 0) {
      return {
        attendance: current,
        changedCount: 0,
        revision: currentRevision,
      }
    }

    const updated = await Attendance.findOneAndUpdate(
      { _id: current._id, ...revisionMatch(currentRevision) },
      {
        $set: {
          records: merged.records,
          markedBy: user._id,
          revision: currentRevision + 1,
        },
      },
      { new: true, runValidators: true },
    ).lean()

    if (!updated) {
      const latest = await Attendance.findById(current._id)
        .select('revision createdAt updatedAt')
        .lean()

      return { conflict: true, current: latest || current }
    }

    return {
      attendance: updated,
      changedCount: merged.changedCount,
      revision: currentRevision + 1,
    }
  }

  return { conflict: true, current: null }
}

function dateFilter(query) {
  const filter = {}

  if (query.from) {
    if (
      typeof query.from !== 'string' ||
      !isValidAttendanceDateKey(query.from)
    ) {
      return { error: 'from date' }
    }

    filter.$gte = query.from
  }

  if (query.to) {
    if (
      typeof query.to !== 'string' ||
      !isValidAttendanceDateKey(query.to)
    ) {
      return { error: 'to date' }
    }

    filter.$lte = query.to
  }

  if (filter.$gte && filter.$lte && filter.$gte > filter.$lte) {
    return { error: 'date range' }
  }

  return {
    filter:
      Object.keys(filter).length > 0
        ? { dateKey: filter }
        : {},
  }
}

function rosterSearchFilter(search) {
  if (!search) return null

  const regex = new RegExp(escapeRegex(search), 'i')

  return {
    $or: [
      { name: regex },
      { email: regex },
      { rollNumber: regex },
    ],
  }
}

function rosterRecord(student, savedById) {
  const saved = savedById.get(String(student._id))

  return {
    id: String(student._id),
    name: student.name,
    email: student.email,
    rollNumber: student.rollNumber || '',
    status: saved?.status || null,
    note: saved?.note || '',
    saved: Boolean(saved),
  }
}

function summaryPayload(summary) {
  return {
    counts: summary.counts,
    total: summary.total,
    marked: summary.marked,
    unmarked: summary.unmarked,
    present: summary.counts.present,
    absent: summary.counts.absent,
    late: summary.counts.late,
    excused: summary.counts.excused,
  }
}

export async function listAttendance(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const filter = {}

    if (isStudent(req.user)) {
      filter['records.student'] = req.user._id

      if (req.query.classId) {
        if (
          typeof req.query.classId !== 'string' ||
          !mongoose.isValidObjectId(req.query.classId)
        ) {
          return invalidId(res, 'class ID')
        }

        if (
          String(req.query.classId) !==
          String(req.user.class || '')
        ) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this class.',
          })
        }

        filter.class = req.query.classId
      }
    } else if (isTeacher(req.user)) {
      filter.class = { $in: teacherClassIds(req.user) }
    }

    if (req.query.classId && !isStudent(req.user)) {
      if (
        typeof req.query.classId !== 'string' ||
        !mongoose.isValidObjectId(req.query.classId)
      ) {
        return invalidId(res, 'class ID')
      }

      if (!userCanAccessClass(req.user, req.query.classId)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this class.',
        })
      }

      filter.class = req.query.classId
    }

    const dates = dateFilter(req.query)

    if (dates.error) {
      return invalidId(res, dates.error)
    }

    Object.assign(filter, dates.filter)

    if (req.query.session !== undefined) {
      if (
        typeof req.query.session !== 'string' ||
        req.query.session.length > 40
      ) {
        return invalidId(res, 'session')
      }

      filter.session = normalizeAttendanceSession(req.query.session)
    }

    const summaryOnly =
      req.query.summaryOnly === 'true' && !isStudent(req.user)
    const sessionListQuery = Attendance.find(filter)
      .populate('class', 'name section academicYear')
      .populate('markedBy', 'name')
      .sort({ dateKey: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)

    if (summaryOnly) {
      sessionListQuery.select('-records')
    } else {
      sessionListQuery.populate(
        'records.student',
        'name email rollNumber',
      )
    }

    const [total, records] = await Promise.all([
      Attendance.countDocuments(filter),
      sessionListQuery.lean(),
    ])

    if (summaryOnly) {
      const ids = records.map((item) => item._id)
      const grouped =
        ids.length > 0
          ? await Attendance.aggregate([
              { $match: { _id: { $in: ids } } },
              { $unwind: '$records' },
              {
                $group: {
                  _id: {
                    id: '$_id',
                    status: '$records.status',
                  },
                  count: { $sum: 1 },
                },
              },
            ])
          : []
      const countsById = new Map()

      for (const row of grouped) {
        const key = String(row._id.id)
        const counts = countsById.get(key) || zeroCounts()

        if (counts[row._id.status] !== undefined) {
          counts[row._id.status] = row.count
        }

        countsById.set(key, counts)
      }

      return res.status(200).json({
        success: true,
        count: records.length,
        data: records.map((item) => {
          const counts =
            countsById.get(String(item._id)) || zeroCounts()

          return {
            id: String(item._id),
            class: item.class,
            date: item.dateKey,
            session: item.session,
            counts,
            recordCount: Object.values(counts).reduce(
              (sum, value) => sum + value,
              0,
            ),
            markedBy: item.markedBy,
            revision: attendanceRevision(item.revision),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }
        }),
        pagination: paginationMeta(total, page, limit),
      })
    }

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records.map((item) =>
        attendanceResponse(
          item,
          isStudent(req.user) ? { studentId: req.user._id } : {},
        ),
      ),
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    return next(error)
  }
}

export async function getAttendanceRoster(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isTeacher(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view attendance.',
      })
    }

    const { page, limit, skip } = parsePagination(req.query)

    if (
      typeof req.query.classId !== 'string' ||
      !mongoose.isValidObjectId(req.query.classId)
    ) {
      return invalidId(res, 'class ID')
    }

    if (
      typeof req.query.date !== 'string' ||
      !isValidAttendanceDateKey(req.query.date)
    ) {
      return invalidId(res, 'attendance date')
    }

    if (
      req.query.session !== undefined &&
      (typeof req.query.session !== 'string' ||
        req.query.session.length > 40)
    ) {
      return invalidId(res, 'session')
    }

    if (
      req.query.search !== undefined &&
      typeof req.query.search !== 'string'
    ) {
      return invalidId(res, 'search')
    }

    const search = String(req.query.search || '').trim()

    if (search.length > 80) {
      return res.status(400).json({
        success: false,
        message: 'Search text must be 80 characters or fewer.',
      })
    }

    const status =
      typeof req.query.status === 'string'
        ? req.query.status.trim()
        : ''

    if (
      status &&
      status !== 'unmarked' &&
      !ATTENDANCE_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance status filter.',
      })
    }

    const classId = req.query.classId
    const date = req.query.date
    const session = normalizeAttendanceSession(req.query.session)

    if (!userCanAccessClass(req.user, classId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this class.',
      })
    }

    const classExists = await Class.exists({ _id: classId })

    if (!classExists) {
      return notFound(res, 'Class not found.')
    }

    const activeStudents = await activeStudentsForClass(
      classId,
      MAX_CLASS_ATTENDANCE_STUDENTS + 1,
    )

    if (activeStudents.length > MAX_CLASS_ATTENDANCE_STUDENTS) {
      return res.status(400).json({
        success: false,
        message:
          'This class has too many active students for attendance filtering.',
      })
    }

    const activeIds = activeStudents.map((student) =>
      String(student._id),
    )

    const sessionDoc = await Attendance.findOne({
      class: classId,
      dateKey: date,
      session,
    })
      .select('records markedBy revision createdAt updatedAt')
      .populate('markedBy', 'name')
      .lean()

    const savedById = buildAttendanceRecordMap(
      sessionDoc?.records || [],
    )
    const summary = summarizeAttendanceRecords(
      sessionDoc?.records || [],
      activeIds,
    )

    const baseFilter = {
      role: 'student',
      status: 'active',
      class: classId,
    }
    const searchFilter = rosterSearchFilter(search)

    if (searchFilter) {
      Object.assign(baseFilter, searchFilter)
    }

    let students
    let total

    if (status) {
      const candidates = await User.find(baseFilter)
        .select('name email rollNumber')
        .sort({ rollNumber: 1, name: 1, _id: 1 })
        .limit(MAX_ROSTER_FILTER_STUDENTS + 1)
        .lean()

      if (candidates.length > MAX_ROSTER_FILTER_STUDENTS) {
        return res.status(400).json({
          success: false,
          message:
            'Too many students match this filter. Narrow the search or filters.',
        })
      }

      const filtered = candidates.filter((student) => {
        const saved = savedById.get(String(student._id))

        return status === 'unmarked'
          ? !saved
          : saved?.status === status
      })

      total = filtered.length
      students = filtered.slice(skip, skip + limit)
    } else {
      const [count, list] = await Promise.all([
        User.countDocuments(baseFilter),
        User.find(baseFilter)
          .select('name email rollNumber')
          .sort({ rollNumber: 1, name: 1, _id: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      ])

      total = count
      students = list
    }

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students.map((student) =>
        rosterRecord(student, savedById),
      ),
      summary: summaryPayload(summary),
      session: sessionResponse(sessionDoc),
      filters: {
        classId,
        date,
        session,
        search,
        status,
      },
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    return next(error)
  }
}

export async function saveAttendance(req, res, next) {
  try {
    const parsed = attendanceSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(
        res,
        parsed.error,
        'Please check the attendance details.',
      )
    }

    if (!isValidAttendanceDateKey(parsed.data.date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance date.',
      })
    }

    const allowed = await authorizeClassWrite(
      req,
      res,
      parsed.data.classId,
    )

    if (!allowed) return undefined

    const uniqueStudentIds = [
      ...new Set(parsed.data.records.map((item) => item.studentId)),
    ]

    if (uniqueStudentIds.length !== parsed.data.records.length) {
      return res.status(400).json({
        success: false,
        message: 'Each student can only appear once.',
      })
    }

    const studentsAreValid = await validateActiveStudentIds(
      parsed.data.classId,
      uniqueStudentIds,
    )

    if (!studentsAreValid) {
      return res.status(400).json({
        success: false,
        message:
          'One or more students are not active members of this class.',
      })
    }

    const previousAttendance = await Attendance.findOne({
      class: parsed.data.classId,
      dateKey: parsed.data.date,
      session: parsed.data.session,
    })
      .select('records revision updatedAt createdAt')
      .lean()
    const previousRevision = attendanceRevision(
      previousAttendance?.revision,
    )

    if (
      parsed.data.expectedRevision !== undefined &&
      parsed.data.expectedRevision !== previousRevision
    ) {
      return conflictResponse(res, previousAttendance)
    }

    if (
      !previousAttendance &&
      parsed.data.expectedRevision !== undefined &&
      parsed.data.expectedRevision !== 0
    ) {
      return conflictResponse(res, null)
    }

    const previousCounts = zeroCounts()

    for (const record of previousAttendance?.records || []) {
      if (previousCounts[record.status] !== undefined) {
        previousCounts[record.status] += 1
      }
    }

    const filter = {
      class: parsed.data.classId,
      dateKey: parsed.data.date,
      session: parsed.data.session,
    }

    if (parsed.data.expectedRevision !== undefined) {
      Object.assign(filter, revisionMatch(previousRevision))
    }

    const attendance = await Attendance.findOneAndUpdate(
      filter,
      {
        $set: {
          records: parsed.data.records.map((record) => ({
            student: record.studentId,
            status: record.status,
            note: record.note,
          })),
          markedBy: req.user._id,
          revision: previousRevision + 1,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    )
      .populate('class', 'name section academicYear')
      .populate('records.student', 'name email rollNumber')
      .populate('markedBy', 'name')
      .lean()

    await recordAudit(req, {
      action: 'attendance.saved',
      targetType: 'attendance',
      targetId: attendance._id,
      metadata: {
        classId: String(parsed.data.classId),
        date: parsed.data.date,
        session: parsed.data.session,
        recordCount: parsed.data.records.length,
        overwritten: Boolean(previousAttendance),
        previousCounts,
        revision: attendanceRevision(attendance.revision),
      },
    })

    return res.status(200).json({
      success: true,
      message: 'Attendance saved successfully.',
      data: attendanceResponse(attendance),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 'ATTENDANCE_CONFLICT',
        message:
          'Attendance for this class, date, and session changed. Please reload and try again.',
      })
    }

    return next(error)
  }
}

export async function saveAttendanceBatch(req, res, next) {
  try {
    const parsed = batchSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(
        res,
        parsed.error,
        'Please check the attendance details.',
      )
    }

    if (!isValidAttendanceDateKey(parsed.data.date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance date.',
      })
    }

    const allowed = await authorizeClassWrite(
      req,
      res,
      parsed.data.classId,
    )

    if (!allowed) return undefined

    const studentIds = parsed.data.records.map(
      (record) => record.studentId,
    )
    const uniqueStudentIds = [...new Set(studentIds)]

    if (uniqueStudentIds.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Each student can only appear once in a batch.',
      })
    }

    const studentsAreValid = await validateActiveStudentIds(
      parsed.data.classId,
      uniqueStudentIds,
    )

    if (!studentsAreValid) {
      return res.status(400).json({
        success: false,
        message:
          'One or more students are not active members of this class.',
      })
    }

    const updates = parsed.data.records.map((record) => ({
      studentId: record.studentId,
      status: record.status,
      note: record.note,
    }))
    const result = await applyAttendanceUpdates({
      classId: parsed.data.classId,
      date: parsed.data.date,
      session: parsed.data.session,
      updates,
      expectedRevision: parsed.data.expectedRevision,
      user: req.user,
    })

    if (result.conflict) {
      return conflictResponse(res, result.current)
    }

    const savedRecords = recordsForStudents(
      result.attendance.records,
      uniqueStudentIds,
    )

    if (result.changedCount > 0) {
      await recordAudit(req, {
        action: 'attendance.batch_saved',
        targetType: 'attendance',
        targetId: result.attendance._id,
        metadata: {
          classId: String(parsed.data.classId),
          date: parsed.data.date,
          session: parsed.data.session,
          batchSize: parsed.data.records.length,
          changedCount: result.changedCount,
          revision: result.revision,
        },
      })
    }

    return res.status(200).json({
      success: true,
      message:
        result.changedCount > 0
          ? 'Attendance updates saved successfully.'
          : 'Attendance is already up to date.',
      data: {
        session: {
          ...sessionResponse(result.attendance),
          revision: result.revision,
        },
        revision: result.revision,
        changedCount: result.changedCount,
        records: savedRecords,
      },
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 'ATTENDANCE_CONFLICT',
        message:
          'Attendance for this class, date, and session changed. Please reload and try again.',
      })
    }

    return next(error)
  }
}

export async function runClassAttendanceAction(req, res, next) {
  try {
    const parsed = classActionSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(
        res,
        parsed.error,
        'Please check the attendance details.',
      )
    }

    if (!isValidAttendanceDateKey(parsed.data.date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance date.',
      })
    }

    const allowed = await authorizeClassWrite(
      req,
      res,
      parsed.data.classId,
    )

    if (!allowed) return undefined

    const students = await activeStudentsForClass(
      parsed.data.classId,
      MAX_CLASS_ATTENDANCE_STUDENTS + 1,
    )

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'There are no active students in this class.',
      })
    }

    if (students.length > MAX_CLASS_ATTENDANCE_STUDENTS) {
      return res.status(400).json({
        success: false,
        message: 'This class has too many active students.',
      })
    }

    const activeIds = students.map((student) => String(student._id))
    const current = await Attendance.findOne({
      class: parsed.data.classId,
      dateKey: parsed.data.date,
      session: parsed.data.session,
    })
      .select('records revision')
      .lean()
    const savedById = buildAttendanceRecordMap(current?.records || [])
    const updates = activeIds.map((studentId) => ({
      studentId,
      status: parsed.data.status,
      note: savedById.get(studentId)?.note || '',
    }))
    const result = await applyAttendanceUpdates({
      classId: parsed.data.classId,
      date: parsed.data.date,
      session: parsed.data.session,
      updates,
      expectedRevision: parsed.data.expectedRevision,
      user: req.user,
      onlyUnmarked: parsed.data.onlyUnmarked,
    })

    if (result.conflict) {
      return conflictResponse(res, result.current)
    }

    const summary = summarizeAttendanceRecords(
      result.attendance.records,
      activeIds,
    )

    if (result.changedCount > 0) {
      await recordAudit(req, {
        action: 'attendance.class_marked',
        targetType: 'attendance',
        targetId: result.attendance._id,
        metadata: {
          classId: String(parsed.data.classId),
          date: parsed.data.date,
          session: parsed.data.session,
          status: parsed.data.status,
          onlyUnmarked: parsed.data.onlyUnmarked,
          changedCount: result.changedCount,
          revision: result.revision,
        },
      })
    }

    return res.status(200).json({
      success: true,
      message:
        result.changedCount > 0
          ? 'Class attendance updated successfully.'
          : 'Class attendance is already up to date.',
      data: {
        session: {
          ...sessionResponse(result.attendance),
          revision: result.revision,
        },
        revision: result.revision,
        changedCount: result.changedCount,
        summary: summaryPayload(summary),
      },
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: 'ATTENDANCE_CONFLICT',
        message:
          'Attendance for this class, date, and session changed. Please reload and try again.',
      })
    }

    return next(error)
  }
}

export async function getMyAttendance(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const filter = { 'records.student': req.user._id }
    const dates = dateFilter(req.query)

    if (dates.error) {
      return invalidId(res, dates.error)
    }

    Object.assign(filter, dates.filter)

    const [total, records] = await Promise.all([
      Attendance.countDocuments(filter),
      Attendance.find(filter)
        .populate('class', 'name section academicYear')
        .sort({ dateKey: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ])

    const summary = await Attendance.aggregate([
      { $match: { 'records.student': req.user._id } },
      { $unwind: '$records' },
      { $match: { 'records.student': req.user._id } },
      {
        $group: {
          _id: '$records.status',
          count: { $sum: 1 },
        },
      },
    ])

    const counts = zeroCounts()

    for (const item of summary) {
      if (counts[item._id] !== undefined) {
        counts[item._id] = item.count
      }
    }

    const totalDays = Object.values(counts).reduce(
      (sum, value) => sum + value,
      0,
    )
    const attended =
      counts.present + counts.late + counts.excused

    return res.status(200).json({
      success: true,
      count: records.length,
      data: records.map((item) =>
        attendanceResponse(item, { studentId: req.user._id }),
      ),
      summary: {
        ...counts,
        totalDays,
        percentage:
          totalDays > 0
            ? Number(((attended / totalDays) * 100).toFixed(2))
            : null,
      },
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    return next(error)
  }
}

export async function getClassAttendanceSummary(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isTeacher(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view attendance.',
      })
    }

    if (!mongoose.isValidObjectId(req.params.classId)) {
      return invalidId(res, 'class ID')
    }

    if (!userCanAccessClass(req.user, req.params.classId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this class.',
      })
    }

    const classExists = await Class.exists({
      _id: req.params.classId,
    })

    if (!classExists) {
      return notFound(res, 'Class not found.')
    }

    const dates = dateFilter(req.query)

    if (dates.error) {
      return invalidId(res, dates.error)
    }

    const match = {
      class: new mongoose.Types.ObjectId(req.params.classId),
    }

    if (dates.filter.dateKey) {
      match.dateKey = dates.filter.dateKey
    }

    if (req.query.session !== undefined) {
      if (
        typeof req.query.session !== 'string' ||
        req.query.session.length > 40
      ) {
        return invalidId(res, 'session')
      }

      match.session = normalizeAttendanceSession(req.query.session)
    }

    const summary = await Attendance.aggregate([
      { $match: match },
      { $unwind: '$records' },
      {
        $group: {
          _id: '$records.status',
          count: { $sum: 1 },
        },
      },
    ])

    const counts = zeroCounts()

    for (const item of summary) {
      if (counts[item._id] !== undefined) {
        counts[item._id] = item.count
      }
    }

    const totalRecords = Object.values(counts).reduce(
      (sum, value) => sum + value,
      0,
    )
    const attended =
      counts.present + counts.late + counts.excused

    return res.status(200).json({
      success: true,
      data: {
        classId: req.params.classId,
        ...counts,
        totalRecords,
        percentage:
          totalRecords > 0
            ? Number(((attended / totalRecords) * 100).toFixed(2))
            : null,
      },
    })
  } catch (error) {
    return next(error)
  }
}
