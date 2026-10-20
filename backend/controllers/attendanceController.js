import mongoose from 'mongoose'
import { z } from 'zod'

import Attendance from '../models/Attendance.js'
import Class from '../models/Class.js'
import User from '../models/User.js'
import {
  invalidId,
  notFound,
  paginationMeta,
  parsePagination,
  validationError,
} from '../utils/query.js'
import {
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

const attendanceSchema = z
  .object({
    classId: objectId,
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.'),
    session: z.string().trim().max(40).optional().default('full-day'),
    records: z
      .array(
        z
          .object({
            studentId: objectId,
            status: z.enum([
              'present',
              'absent',
              'late',
              'excused',
            ]),
            note: z.string().trim().max(200).optional().default(''),
          })
          .strict(),
      )
      .max(500),
  })
  .strict()

function isValidDateKey(value) {
  const date = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

function attendanceResponse(item, options = {}) {
  const { studentId = null } = options

  const records = item.records
    .filter(
      (record) =>
        !studentId ||
        String(record.student?._id || record.student) ===
          String(studentId),
    )
    .map((record) => ({
      student: record.student,
      status: record.status,
      note: record.note,
    }))

  const counts = records.reduce(
    (total, record) => {
      total[record.status] += 1
      return total
    },
    { present: 0, absent: 0, late: 0, excused: 0 },
  )

  return {
    id: String(item._id),
    class: item.class,
    date: item.dateKey,
    session: item.session,
    records,
    counts,
    markedBy: item.markedBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function dateFilter(query) {
  const filter = {}

  if (query.from) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.from)) {
      return { error: 'from date' }
    }
    filter.$gte = query.from
  }

  if (query.to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
      return { error: 'to date' }
    }
    filter.$lte = query.to
  }

  return {
    filter:
      Object.keys(filter).length > 0
        ? { dateKey: filter }
        : {},
  }
}

export async function listAttendance(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const filter = {}

    if (isStudent(req.user)) {
      filter['records.student'] = req.user._id

      if (req.query.classId) {
        if (!mongoose.isValidObjectId(req.query.classId)) {
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
      if (!mongoose.isValidObjectId(req.query.classId)) {
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

    const [total, records] = await Promise.all([
      Attendance.countDocuments(filter),
      Attendance.find(filter)
        .populate('class', 'name section academicYear')
        .populate('records.student', 'name email rollNumber')
        .populate('markedBy', 'name')
        .sort({ dateKey: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ])

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

    if (!isValidDateKey(parsed.data.date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance date.',
      })
    }

    const allowed = isTeacher(req.user)
      ? teacherOwnsClass(req.user, parsed.data.classId)
      : Boolean(
          await Class.exists({ _id: parsed.data.classId }),
        )

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You can only mark attendance for your classes.',
      })
    }

    const uniqueStudentIds = [
      ...new Set(parsed.data.records.map((item) => item.studentId)),
    ]

    if (uniqueStudentIds.length !== parsed.data.records.length) {
      return res.status(400).json({
        success: false,
        message: 'Each student can only appear once.',
      })
    }

    const students = await User.find({
      _id: { $in: uniqueStudentIds },
      role: 'student',
      status: 'active',
      class: parsed.data.classId,
    })
      .select('_id')
      .lean()

    if (students.length !== uniqueStudentIds.length) {
      return res.status(400).json({
        success: false,
        message:
          'One or more students are not active members of this class.',
      })
    }

    const attendance = await Attendance.findOneAndUpdate(
      {
        class: parsed.data.classId,
        dateKey: parsed.data.date,
        session: parsed.data.session,
      },
      {
        $set: {
          records: parsed.data.records.map((record) => ({
            student: record.studentId,
            status: record.status,
            note: record.note,
          })),
          markedBy: req.user._id,
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

    return res.status(200).json({
      success: true,
      message: 'Attendance saved successfully.',
      data: attendanceResponse(attendance),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'Attendance for this class, date, and session already exists. Please reload and try again.',
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

    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    }

    for (const item of summary) {
      counts[item._id] = item.count
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
