import mongoose from 'mongoose'
import { z } from 'zod'

import Announcement from '../models/Announcement.js'
import Class from '../models/Class.js'
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
} from '../utils/authorization.js'

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

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))

const announcementCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    content: z.string().trim().min(1).max(5000),
    audience: z.enum(['all', 'students', 'teachers']).optional(),
    classId: optionalObjectId,
    isPublic: z.boolean().optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    publishAt: optionalDate,
    expiresAt: optionalDate,
  })
  .strict()

const announcementUpdateSchema =
  announcementCreateSchema.partial()

function normalizeDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function announcementResponse(item) {
  return {
    id: String(item._id),
    title: item.title,
    content: item.content,
    audience: item.audience,
    class: item.class,
    isPublic: item.isPublic,
    status: item.status,
    publishAt: item.publishAt,
    expiresAt: item.expiresAt,
    createdBy: item.createdBy,
    updatedBy: item.updatedBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function populateAnnouncement(query) {
  return query
    .populate('class', 'name section academicYear')
    .populate('createdBy', 'name role')
    .populate('updatedBy', 'name role')
}

function publicVisibilityFilter() {
  const now = new Date()

  return {
    status: 'published',
    isPublic: true,
    $and: [
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
  }
}

function studentVisibilityFilter(student) {
  const now = new Date()

  return {
    status: 'published',
    audience: { $in: ['all', 'students'] },
    $and: [
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
      {
        $or: [
          { class: null },
          { class: { $exists: false } },
          { class: student.class || null },
        ],
      },
    ],
  }
}

async function validateDates(publishAtValue, expiresAtValue) {
  const publishAt = normalizeDate(publishAtValue)
  const expiresAt = normalizeDate(expiresAtValue)

  if (publishAt === undefined || expiresAt === undefined) {
    return { message: 'Invalid announcement date.' }
  }

  if (publishAt && expiresAt && expiresAt <= publishAt) {
    return {
      message: 'The expiry date must be after the publish date.',
    }
  }

  return { publishAt, expiresAt }
}

async function validateTeacherScope(
  user,
  classId,
  audience,
  isPublic,
) {
  if (!classId) {
    return {
      message: 'Choose one of your assigned classes.',
    }
  }

  if (!teacherOwnsClass(user, classId)) {
    return {
      status: 403,
      message: 'You can only announce to your assigned classes.',
    }
  }

  if (audience && audience !== 'students') {
    return {
      message: 'Teacher announcements can only target students.',
    }
  }

  if (isPublic) {
    return {
      message: 'Only administrators can publish public announcements.',
    }
  }

  const classExists = await Class.exists({ _id: classId })

  if (!classExists) {
    return { message: 'The selected class does not exist.' }
  }

  return {}
}

export async function listPublicAnnouncements(req, res, next) {
  try {
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 6, 1),
      20,
    )

    const announcements = await Announcement.find(
      publicVisibilityFilter(),
    )
      .sort({ publishAt: -1, createdAt: -1 })
      .limit(limit)
      .select('title content publishAt createdAt')
      .lean()

    res.set(
      'Cache-Control',
      'public, max-age=60, stale-while-revalidate=300',
    )

    return res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements.map((item) => ({
        id: String(item._id),
        title: item.title,
        content: item.content,
        publishAt: item.publishAt,
        createdAt: item.createdAt,
      })),
    })
  } catch (error) {
    return next(error)
  }
}

export async function listAnnouncements(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    let filter = {}

    if (isStudent(req.user)) {
      filter = studentVisibilityFilter(req.user)
    } else if (isTeacher(req.user)) {
      filter = {
        $or: [
          { createdBy: req.user._id },
          { class: { $in: teacherClassIds(req.user) } },
        ],
      }
    }

    if (req.query.status && !isStudent(req.user)) {
      if (
        !['draft', 'published', 'archived'].includes(
          req.query.status,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid announcement status.',
        })
      }

      filter.status = req.query.status
    }

    if (req.query.audience) {
      if (
        !['all', 'students', 'teachers'].includes(
          req.query.audience,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid audience.',
        })
      }

      filter.audience = req.query.audience
    }

    if (req.query.classId) {
      if (!mongoose.isValidObjectId(req.query.classId)) {
        return invalidId(res, 'class ID')
      }

      if (
        isTeacher(req.user) &&
        !teacherClassIds(req.user).includes(
          String(req.query.classId),
        )
      ) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this class.',
        })
      }

      filter.class = req.query.classId
    }

    const search = String(req.query.search || '').trim()
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i')
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [{ title: regex }, { content: regex }],
        },
      ]
    }

    const [total, announcements] = await Promise.all([
      Announcement.countDocuments(filter),
      populateAnnouncement(
        Announcement.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
      ).lean(),
    ])

    return res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements.map(announcementResponse),
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    return next(error)
  }
}

export async function getAnnouncement(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'announcement ID')
    }

    const announcement = await populateAnnouncement(
      Announcement.findById(req.params.id),
    ).lean()

    if (!announcement) {
      return notFound(res, 'Announcement not found.')
    }

    const isOwner =
      String(announcement.createdBy?._id) === String(req.user._id)
    const isClassTeacher =
      isTeacher(req.user) &&
      announcement.class &&
      teacherOwnsClass(req.user, announcement.class._id)

    if (isStudent(req.user)) {
      const now = new Date()
      const visible =
        announcement.status === 'published' &&
        ['all', 'students'].includes(announcement.audience) &&
        (!announcement.publishAt ||
          new Date(announcement.publishAt) <= now) &&
        (!announcement.expiresAt ||
          new Date(announcement.expiresAt) > now) &&
        (!announcement.class ||
          String(announcement.class._id) ===
            String(req.user.class || ''))

      if (!visible) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this announcement.',
        })
      }
    } else if (
      !isAdmin(req.user) &&
      !isOwner &&
      !isClassTeacher
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this announcement.',
      })
    }

    return res.status(200).json({
      success: true,
      data: announcementResponse(announcement),
    })
  } catch (error) {
    return next(error)
  }
}

export async function createAnnouncement(req, res, next) {
  try {
    const parsed = announcementCreateSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(
        res,
        parsed.error,
        'Please check the announcement details.',
      )
    }

    if (isTeacher(req.user)) {
      const scope = await validateTeacherScope(
        req.user,
        parsed.data.classId,
        parsed.data.audience,
        parsed.data.isPublic,
      )

      if (scope.message) {
        return res.status(scope.status || 400).json({
          success: false,
          message: scope.message,
        })
      }
    } else if (parsed.data.classId) {
      const classExists = await Class.exists({
        _id: parsed.data.classId,
      })

      if (!classExists) {
        return res.status(400).json({
          success: false,
          message: 'The selected class does not exist.',
        })
      }
    }

    const dates = await validateDates(
      parsed.data.publishAt,
      parsed.data.expiresAt,
    )

    if (dates.message) {
      return res.status(400).json({
        success: false,
        message: dates.message,
      })
    }

    const status = parsed.data.status || 'draft'
    const audience =
      isTeacher(req.user)
        ? 'students'
        : parsed.data.audience || 'all'

    const announcement = await Announcement.create({
      title: parsed.data.title,
      content: parsed.data.content,
      audience,
      class: parsed.data.classId || null,
      isPublic: isTeacher(req.user)
        ? false
        : Boolean(parsed.data.isPublic),
      status,
      publishAt:
        status === 'published'
          ? dates.publishAt || new Date()
          : dates.publishAt,
      expiresAt: dates.expiresAt,
      createdBy: req.user._id,
    })

    const created = await populateAnnouncement(
      Announcement.findById(announcement._id),
    ).lean()

    return res.status(201).json({
      success: true,
      message: 'Announcement created successfully.',
      data: announcementResponse(created),
    })
  } catch (error) {
    return next(error)
  }
}

export async function updateAnnouncement(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'announcement ID')
    }

    const parsed = announcementUpdateSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(res, parsed.error)
    }

    const announcement = await Announcement.findById(req.params.id)

    if (!announcement) {
      return notFound(res, 'Announcement not found.')
    }

    const isOwner =
      String(announcement.createdBy) === String(req.user._id)

    if (!isAdmin(req.user) && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You cannot manage this announcement.',
      })
    }

    const nextClassId =
      parsed.data.classId !== undefined
        ? parsed.data.classId
        : announcement.class

    if (isTeacher(req.user)) {
      const scope = await validateTeacherScope(
        req.user,
        nextClassId,
        parsed.data.audience || announcement.audience,
        parsed.data.isPublic ?? announcement.isPublic,
      )

      if (scope.message) {
        return res.status(scope.status || 400).json({
          success: false,
          message: scope.message,
        })
      }
    } else if (
      parsed.data.classId &&
      !(await Class.exists({ _id: parsed.data.classId }))
    ) {
      return res.status(400).json({
        success: false,
        message: 'The selected class does not exist.',
      })
    }

    const publishAtValue =
      parsed.data.publishAt !== undefined
        ? parsed.data.publishAt
        : announcement.publishAt
    const expiresAtValue =
      parsed.data.expiresAt !== undefined
        ? parsed.data.expiresAt
        : announcement.expiresAt

    const dates = await validateDates(
      publishAtValue,
      expiresAtValue,
    )

    if (dates.message) {
      return res.status(400).json({
        success: false,
        message: dates.message,
      })
    }

    if (parsed.data.title !== undefined) {
      announcement.title = parsed.data.title
    }
    if (parsed.data.content !== undefined) {
      announcement.content = parsed.data.content
    }
    if (parsed.data.audience !== undefined) {
      announcement.audience = isTeacher(req.user)
        ? 'students'
        : parsed.data.audience
    }
    if (parsed.data.classId !== undefined) {
      announcement.class = parsed.data.classId || null
    }
    if (parsed.data.isPublic !== undefined) {
      announcement.isPublic = isTeacher(req.user)
        ? false
        : parsed.data.isPublic
    }
    if (parsed.data.status !== undefined) {
      announcement.status = parsed.data.status
    }

    announcement.publishAt = dates.publishAt
    announcement.expiresAt = dates.expiresAt

    if (
      announcement.status === 'published' &&
      !announcement.publishAt
    ) {
      announcement.publishAt = new Date()
    }

    announcement.updatedBy = req.user._id
    await announcement.save()

    const updated = await populateAnnouncement(
      Announcement.findById(announcement._id),
    ).lean()

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully.',
      data: announcementResponse(updated),
    })
  } catch (error) {
    return next(error)
  }
}
