import mongoose from 'mongoose'
import { z } from 'zod'

import Class from '../models/Class.js'
import Subject from '../models/Subject.js'
import User from '../models/User.js'
import {
  escapeRegex,
  invalidId,
  notFound,
  validationError,
} from '../utils/query.js'
import {
  isAdmin,
  isStudent,
  isTeacher,
  teacherClassIds,
} from '../utils/authorization.js'

const classSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    section: z.string().trim().max(20).optional().default(''),
    academicYear: z.string().trim().max(30).optional().default(''),
    description: z.string().trim().max(300).optional().default(''),
    isActive: z.boolean().optional(),
  })
  .strict()

const subjectSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    code: z.string().trim().max(30).optional().default(''),
    classId: z
      .string()
      .trim()
      .refine((value) => mongoose.isValidObjectId(value), 'Invalid class.'),
    description: z.string().trim().max(300).optional().default(''),
    isActive: z.boolean().optional(),
  })
  .strict()

function classLabel(item) {
  return [item.name, item.section].filter(Boolean).join(' - ')
}

function classResponse(item) {
  return {
    id: String(item._id),
    name: item.name,
    section: item.section,
    academicYear: item.academicYear,
    description: item.description,
    isActive: item.isActive,
    label: classLabel(item),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function subjectResponse(item) {
  return {
    id: String(item._id),
    name: item.name,
    code: item.code,
    class: item.class,
    description: item.description,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

async function ensureClassExists(classId) {
  return Class.exists({ _id: classId })
}

export async function listClasses(req, res, next) {
  try {
    const filter = {}
    const search = String(req.query.search || '').trim()

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i')
      filter.$or = [
        { name: regex },
        { section: regex },
        { academicYear: regex },
      ]
    }

    if (req.query.includeInactive !== 'true' || !isAdmin(req.user)) {
      filter.isActive = true
    }

    if (isTeacher(req.user)) {
      filter._id = { $in: teacherClassIds(req.user) }
    } else if (isStudent(req.user)) {
      filter._id = req.user.class || null
    }

    const classes = await Class.find(filter)
      .sort({ name: 1, section: 1 })
      .lean()

    return res.status(200).json({
      success: true,
      count: classes.length,
      data: classes.map(classResponse),
    })
  } catch (error) {
    return next(error)
  }
}

export async function getClass(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'class ID')
    }

    if (
      isTeacher(req.user) &&
      !teacherClassIds(req.user).includes(String(req.params.id))
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this class.',
      })
    }

    if (
      isStudent(req.user) &&
      String(req.user.class || '') !== String(req.params.id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this class.',
      })
    }

    const item = await Class.findById(req.params.id).lean()

    if (!item) {
      return notFound(res, 'Class not found.')
    }

    return res.status(200).json({
      success: true,
      data: classResponse(item),
    })
  } catch (error) {
    return next(error)
  }
}

export async function createClass(req, res, next) {
  try {
    const parsed = classSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(res, parsed.error)
    }

    const item = await Class.create(parsed.data)

    return res.status(201).json({
      success: true,
      message: 'Class created successfully.',
      data: classResponse(item),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This class already exists for the selected year.',
      })
    }

    return next(error)
  }
}

export async function updateClass(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'class ID')
    }

    const parsed = classSchema.partial().safeParse(req.body)

    if (!parsed.success) {
      return validationError(res, parsed.error)
    }

    const item = await Class.findById(req.params.id)

    if (!item) {
      return notFound(res, 'Class not found.')
    }

    Object.assign(item, parsed.data)
    await item.save()

    return res.status(200).json({
      success: true,
      message: 'Class updated successfully.',
      data: classResponse(item),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This class already exists for the selected year.',
      })
    }

    return next(error)
  }
}

export async function listSubjects(req, res, next) {
  try {
    const filter = {}
    const search = String(req.query.search || '').trim()

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i')
      filter.$or = [{ name: regex }, { code: regex }]
    }

    if (req.query.classId) {
      if (!mongoose.isValidObjectId(req.query.classId)) {
        return invalidId(res, 'class ID')
      }

      if (
        isTeacher(req.user) &&
        !teacherClassIds(req.user).includes(String(req.query.classId))
      ) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this class.',
        })
      }

      if (
        isStudent(req.user) &&
        String(req.user.class || '') !== String(req.query.classId)
      ) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this class.',
        })
      }

      filter.class = req.query.classId
    } else if (isTeacher(req.user)) {
      filter.class = { $in: teacherClassIds(req.user) }
    } else if (isStudent(req.user)) {
      filter.class = req.user.class || null
    }

    if (req.query.includeInactive !== 'true' || !isAdmin(req.user)) {
      filter.isActive = true
    }

    const subjects = await Subject.find(filter)
      .populate('class', 'name section academicYear')
      .sort({ name: 1 })
      .lean()

    return res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects.map(subjectResponse),
    })
  } catch (error) {
    return next(error)
  }
}

export async function createSubject(req, res, next) {
  try {
    const parsed = subjectSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(res, parsed.error)
    }

    const classExists = await ensureClassExists(parsed.data.classId)

    if (!classExists) {
      return res.status(400).json({
        success: false,
        message: 'The selected class does not exist.',
      })
    }

    const item = await Subject.create({
      name: parsed.data.name,
      code: parsed.data.code,
      class: parsed.data.classId,
      description: parsed.data.description,
      isActive: parsed.data.isActive ?? true,
    })

    return res.status(201).json({
      success: true,
      message: 'Subject created successfully.',
      data: subjectResponse(item),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This subject already exists for the selected class.',
      })
    }

    return next(error)
  }
}

export async function updateSubject(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'subject ID')
    }

    const parsed = subjectSchema.partial().safeParse(req.body)

    if (!parsed.success) {
      return validationError(res, parsed.error)
    }

    const item = await Subject.findById(req.params.id)

    if (!item) {
      return notFound(res, 'Subject not found.')
    }

    if (parsed.data.classId !== undefined) {
      const classExists = await ensureClassExists(
        parsed.data.classId,
      )

      if (!classExists) {
        return res.status(400).json({
          success: false,
          message: 'The selected class does not exist.',
        })
      }

      item.class = parsed.data.classId
    }

    if (parsed.data.name !== undefined) item.name = parsed.data.name
    if (parsed.data.code !== undefined) item.code = parsed.data.code
    if (parsed.data.description !== undefined) {
      item.description = parsed.data.description
    }
    if (parsed.data.isActive !== undefined) {
      item.isActive = parsed.data.isActive
    }

    await item.save()

    return res.status(200).json({
      success: true,
      message: 'Subject updated successfully.',
      data: subjectResponse(item),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This subject already exists for the selected class.',
      })
    }

    return next(error)
  }
}

export async function academicOverview(req, res, next) {
  try {
    const classFilter = isTeacher(req.user)
      ? { _id: { $in: teacherClassIds(req.user) } }
      : isStudent(req.user)
        ? { _id: req.user.class || null }
        : {}

    const classIds = await Class.find(classFilter).distinct('_id')

    const [classCount, activeClassCount, subjectCount, studentCount] =
      await Promise.all([
        Class.countDocuments(classFilter),
        Class.countDocuments({ ...classFilter, isActive: true }),
        Subject.countDocuments({ class: { $in: classIds } }),
        User.countDocuments({
          role: 'student',
          status: 'active',
          class: { $in: classIds },
        }),
      ])

    return res.status(200).json({
      success: true,
      data: {
        classes: classCount,
        activeClasses: activeClassCount,
        subjects: subjectCount,
        activeStudents: studentCount,
      },
    })
  } catch (error) {
    return next(error)
  }
}
