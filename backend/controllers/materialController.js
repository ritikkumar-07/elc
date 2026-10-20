import fs from 'fs'
import mongoose from 'mongoose'
import { z } from 'zod'

import Class from '../models/Class.js'
import StudyMaterial from '../models/StudyMaterial.js'
import Subject from '../models/Subject.js'
import {
  removeUploadedFile,
  uploadedFilePath,
} from '../middleware/uploadMiddleware.js'
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

const optionalObjectId = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || mongoose.isValidObjectId(value),
    'Invalid ID.',
  )

const materialCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(500).optional().default(''),
    type: z.enum([
      'notes',
      'question-paper',
      'solution',
      'syllabus',
      'other',
    ]),
    classId: objectId,
    subjectId: optionalObjectId,
    isPublished: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .optional(),
  })
  .strict()

const materialUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(500).optional(),
    type: z
      .enum([
        'notes',
        'question-paper',
        'solution',
        'syllabus',
        'other',
      ])
      .optional(),
    classId: objectId.optional(),
    subjectId: optionalObjectId,
    isPublished: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .strict()

function parseBoolean(value, fallback) {
  if (value === undefined) return fallback
  if (typeof value === 'boolean') return value
  return value === 'true'
}

function materialResponse(item) {
  const id = String(item._id)

  return {
    id,
    title: item.title,
    description: item.description,
    type: item.type,
    class: item.class,
    subject: item.subject,
    fileName: item.fileName,
    mimeType: item.mimeType,
    size: item.size,
    isPublished: item.isPublished,
    isArchived: item.isArchived,
    uploadedBy: item.uploadedBy,
    downloadUrl: `/api/v1/materials/${id}/file`,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

async function findSubjectForClass(subjectId, classId) {
  if (!subjectId) return null

  return Subject.findOne({
    _id: subjectId,
    class: classId,
  })
}

async function canWriteClass(user, classId) {
  if (!mongoose.isValidObjectId(classId)) return false
  if (isAdmin(user)) return Boolean(await Class.exists({ _id: classId }))
  return isTeacher(user) && teacherOwnsClass(user, classId)
}

function populateMaterial(query) {
  return query
    .populate('class', 'name section academicYear')
    .populate('subject', 'name code')
    .populate('uploadedBy', 'name role')
}

export async function listMaterials(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const filter = {}

    if (isStudent(req.user)) {
      filter.class = req.user.class || null
      filter.isPublished = true
      filter.isArchived = false
    } else if (isTeacher(req.user)) {
      filter.class = { $in: teacherClassIds(req.user) }
    }

    if (req.query.classId) {
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

    if (req.query.subjectId) {
      if (!mongoose.isValidObjectId(req.query.subjectId)) {
        return invalidId(res, 'subject ID')
      }

      filter.subject = req.query.subjectId
    }

    if (req.query.type) {
      const types = [
        'notes',
        'question-paper',
        'solution',
        'syllabus',
        'other',
      ]

      if (!types.includes(req.query.type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid material type.',
        })
      }

      filter.type = req.query.type
    }

    if (!isStudent(req.user)) {
      filter.isArchived =
        req.query.includeArchived === 'true' ? undefined : false

      if (filter.isArchived === undefined) {
        delete filter.isArchived
      }
    }

    const search = String(req.query.search || '').trim()
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i')
      filter.$or = [
        { title: regex },
        { description: regex },
        { fileName: regex },
      ]
    }

    const [total, materials] = await Promise.all([
      StudyMaterial.countDocuments(filter),
      populateMaterial(
        StudyMaterial.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
      ).lean(),
    ])

    return res.status(200).json({
      success: true,
      count: materials.length,
      data: materials.map(materialResponse),
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    return next(error)
  }
}

export async function createMaterial(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Choose a PDF file to upload.',
      })
    }

    const parsed = materialCreateSchema.safeParse(req.body)

    if (!parsed.success) {
      removeUploadedFile(req.file.filename)
      return validationError(
        res,
        parsed.error,
        'Please check the material details.',
      )
    }

    const allowed = await canWriteClass(
      req.user,
      parsed.data.classId,
    )

    if (!allowed) {
      removeUploadedFile(req.file.filename)
      return res.status(403).json({
        success: false,
        message: 'You can only upload materials for your classes.',
      })
    }

    const subject = await findSubjectForClass(
      parsed.data.subjectId,
      parsed.data.classId,
    )

    if (parsed.data.subjectId && !subject) {
      removeUploadedFile(req.file.filename)
      return res.status(400).json({
        success: false,
        message: 'The selected subject does not belong to this class.',
      })
    }

    const material = await StudyMaterial.create({
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      class: parsed.data.classId,
      subject: subject?._id || null,
      fileName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: 'application/pdf',
      size: req.file.size,
      uploadedBy: req.user._id,
      isPublished: parseBoolean(parsed.data.isPublished, true),
    })

    const created = await populateMaterial(
      StudyMaterial.findById(material._id),
    ).lean()

    return res.status(201).json({
      success: true,
      message: 'Study material uploaded successfully.',
      data: materialResponse(created),
    })
  } catch (error) {
    removeUploadedFile(req.file?.filename)
    return next(error)
  }
}

export async function updateMaterial(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'material ID')
    }

    const parsed = materialUpdateSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationError(res, parsed.error)
    }

    const material = await StudyMaterial.findById(req.params.id)

    if (!material) {
      return notFound(res, 'Study material not found.')
    }

    const currentAllowed = await canWriteClass(
      req.user,
      material.class,
    )

    if (!currentAllowed) {
      return res.status(403).json({
        success: false,
        message: 'You cannot manage this study material.',
      })
    }

    let classId = material.class

    if (parsed.data.classId !== undefined) {
      const newAllowed = await canWriteClass(
        req.user,
        parsed.data.classId,
      )

      if (!newAllowed) {
        return res.status(403).json({
          success: false,
          message: 'You can only move materials to your classes.',
        })
      }

      classId = parsed.data.classId
    }

    if (parsed.data.subjectId !== undefined) {
      if (parsed.data.subjectId) {
        const subject = await findSubjectForClass(
          parsed.data.subjectId,
          classId,
        )

        if (!subject) {
          return res.status(400).json({
            success: false,
            message:
              'The selected subject does not belong to this class.',
          })
        }

        material.subject = subject._id
      } else {
        material.subject = null
      }
    } else if (String(classId) !== String(material.class)) {
      material.subject = null
    }

    if (parsed.data.classId !== undefined) {
      material.class = classId
    }
    if (parsed.data.title !== undefined) {
      material.title = parsed.data.title
    }
    if (parsed.data.description !== undefined) {
      material.description = parsed.data.description
    }
    if (parsed.data.type !== undefined) {
      material.type = parsed.data.type
    }
    if (parsed.data.isPublished !== undefined) {
      material.isPublished = parsed.data.isPublished
    }
    if (parsed.data.isArchived !== undefined) {
      material.isArchived = parsed.data.isArchived
    }

    await material.save()

    const updated = await populateMaterial(
      StudyMaterial.findById(material._id),
    ).lean()

    return res.status(200).json({
      success: true,
      message: 'Study material updated successfully.',
      data: materialResponse(updated),
    })
  } catch (error) {
    return next(error)
  }
}

export async function downloadMaterial(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return invalidId(res, 'material ID')
    }

    const material = await StudyMaterial.findById(
      req.params.id,
    ).lean()

    if (!material) {
      return notFound(res, 'Study material not found.')
    }

    if (isStudent(req.user)) {
      if (
        String(material.class) !== String(req.user.class || '') ||
        !material.isPublished ||
        material.isArchived
      ) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this material.',
        })
      }
    } else if (
      isTeacher(req.user) &&
      !teacherOwnsClass(req.user, material.class)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this material.',
      })
    }

    const filePath = uploadedFilePath(material.storedName)

    try {
      await fs.promises.access(filePath, fs.constants.R_OK)
    } catch {
      return notFound(res, 'The stored PDF file is unavailable.')
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    return res.download(
      filePath,
      material.fileName,
      { headers: { 'Content-Type': 'application/pdf' } },
      (error) => {
        if (error && !res.headersSent) {
          next(error)
        }
      },
    )
  } catch (error) {
    return next(error)
  }
}
