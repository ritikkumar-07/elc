import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'

import Topper from '../models/Topper.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'
import {
  removeUploadedFile,
  uploadTopperPhoto,
  uploadTopperPhotoToCloudinary,
} from '../middleware/uploadMiddleware.js'

const router = Router()

const photoUrlField = z.string().trim().max(1000).optional()

const booleanField = z.preprocess((value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}, z.boolean().optional())

const baseFields = {
  name: z.string().trim().min(1).max(100),
  photoUrl: photoUrlField,
  className: z.string().trim().min(1).max(50),
  board: z.string().trim().min(1).max(100),
  session: z.string().trim().min(1).max(30),
  description: z.string().trim().max(500).optional().default(''),
  rank: z.coerce.number().int().min(1).max(10000).optional(),
  isPublished: booleanField,
}

export const createSchema = z
  .object({
    ...baseFields,
    photoUrl: photoUrlField.default(''),
    marks: z.coerce.number().min(0).optional(),
    totalMarks: z.coerce.number().min(1).optional(),
    percentage: z.coerce.number().min(0).max(100).optional(),
  })
  .strict()
  .refine(
    (data) =>
      (data.percentage !== undefined &&
        data.marks === undefined &&
        data.totalMarks === undefined) ||
      (data.marks !== undefined && data.totalMarks !== undefined),
    {
      message:
        'Provide either percentage or both marks and total marks.',
      path: ['percentage'],
    },
  )
  .refine(
    (data) =>
      data.marks === undefined ||
      data.totalMarks === undefined ||
      data.marks <= data.totalMarks,
    {
      message: 'Marks cannot exceed total marks.',
      path: ['marks'],
    },
  )

export const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    photoUrl: photoUrlField,
    className: z.string().trim().min(1).max(50).optional(),
    board: z.string().trim().min(1).max(100).optional(),
    session: z.string().trim().min(1).max(30).optional(),
    description: z.string().trim().max(500).optional(),
    rank: z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .optional(),
    isPublished: booleanField,
    marks: z.coerce.number().min(0).optional(),
    totalMarks: z.coerce.number().min(1).optional(),
    percentage: z.coerce.number().min(0).max(100).optional(),
  })
  .strict()
  .refine(
    (data) =>
      (data.marks === undefined) === (data.totalMarks === undefined),
    {
      message: 'Provide both marks and total marks together.',
      path: ['marks'],
    },
  )
  .refine(
    (data) =>
      data.marks === undefined ||
      data.totalMarks === undefined ||
      data.marks <= data.totalMarks,
    {
      message: 'Marks cannot exceed total marks.',
      path: ['marks'],
    },
  )

const adminOnly = [requireAuth, allowRoles('admin')]

function validationResponse(res, error, message) {
  return res.status(400).json({
    success: false,
    message,
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  })
}

function scoreFields(data) {
  if (data.marks !== undefined && data.totalMarks !== undefined) {
    return {
      marks: data.marks,
      totalMarks: data.totalMarks,
    }
  }

  if (data.percentage !== undefined) {
    return {
      marks: data.percentage,
      totalMarks: 100,
    }
  }

  return {}
}

export function selectPhotoUrl(uploadedAsset, submittedUrl) {
  return uploadedAsset?.secure_url || submittedUrl
}

function topperResponse(item) {
  return {
    ...item,
    id: String(item._id),
  }
}

// GET: Published toppers for the public homepage.
router.get('/', async (req, res, next) => {
  try {
    const filter = { isPublished: true }

    if (req.query.session) {
      filter.session = String(req.query.session).trim()
    }

    if (req.query.className) {
      filter.className = String(req.query.className).trim()
    }

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 24, 1),
      100,
    )

    const toppers = await Topper.find(filter)
      .select(
        'name photoUrl className board session marks totalMarks percentage rank description isPublished createdAt',
      )
      .sort({ session: -1, rank: 1, percentage: -1, name: 1 })
      .limit(limit)
      .lean()

    res.set(
      'Cache-Control',
      'public, max-age=60, stale-while-revalidate=300',
    )

    res.status(200).json({
      success: true,
      count: toppers.length,
      data: toppers.map(topperResponse),
    })
  } catch (error) {
    next(error)
  }
})

// GET: All toppers for administrators.
router.get('/manage', ...adminOnly, async (req, res, next) => {
  try {
    const filter = {}

    if (req.query.session) {
      filter.session = String(req.query.session).trim()
    }

    if (req.query.search) {
      const escaped = String(req.query.search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')
      filter.$or = [
        { name: regex },
        { className: regex },
        { board: regex },
      ]
    }

    const toppers = await Topper.find(filter)
      .sort({ session: -1, rank: 1, name: 1 })
      .lean()

    res.json({
      success: true,
      count: toppers.length,
      data: toppers.map(topperResponse),
    })
  } catch (error) {
    next(error)
  }
})

// POST: Create a topper record.
router.post('/', ...adminOnly, uploadTopperPhoto, async (req, res, next) => {
  let uploadedAsset = null
  let persisted = false

  try {
    const parsed = createSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationResponse(
        res,
        parsed.error,
        'Please check the topper details.',
      )
    }

    if (req.file) {
      uploadedAsset = await uploadTopperPhotoToCloudinary(req.file)
    }

    const topper = await Topper.create({
      name: parsed.data.name,
      photoUrl: selectPhotoUrl(
        uploadedAsset,
        parsed.data.photoUrl,
      ),
      className: parsed.data.className,
      board: parsed.data.board,
      session: parsed.data.session,
      description: parsed.data.description,
      rank: parsed.data.rank,
      isPublished: parsed.data.isPublished ?? false,
      ...scoreFields(parsed.data),
    })
    persisted = true

    res.status(201).json({
      success: true,
      message: 'Topper created successfully.',
      data: topperResponse(topper.toObject()),
    })
  } catch (error) {
    if (!persisted && uploadedAsset?.public_id) {
      await removeUploadedFile(uploadedAsset.public_id, 'image')
    }
    next(error)
  }
})

// PUT/PATCH: Update a topper record.
async function updateTopper(req, res, next) {
  let uploadedAsset = null
  let persisted = false

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid topper ID.',
      })
    }

    const parsed = updateSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationResponse(
        res,
        parsed.error,
        'Please check the topper details.',
      )
    }

    const topper = await Topper.findById(req.params.id)

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper not found.',
      })
    }

    if (req.file) {
      uploadedAsset = await uploadTopperPhotoToCloudinary(req.file)
      topper.photoUrl = selectPhotoUrl(uploadedAsset, topper.photoUrl)
    } else if (parsed.data.photoUrl !== undefined) {
      topper.photoUrl = parsed.data.photoUrl
    }

    const fields = [
      'name',
      'className',
      'board',
      'session',
      'description',
      'rank',
      'isPublished',
    ]

    for (const field of fields) {
      if (parsed.data[field] !== undefined) {
        topper[field] = parsed.data[field]
      }
    }

    const scores = scoreFields(parsed.data)

    if (scores.marks !== undefined) {
      topper.marks = scores.marks
      topper.totalMarks = scores.totalMarks
    }

    await topper.save()
    persisted = true

    res.json({
      success: true,
      message: 'Topper updated successfully.',
      data: topperResponse(topper.toObject()),
    })
  } catch (error) {
    if (!persisted && uploadedAsset?.public_id) {
      await removeUploadedFile(uploadedAsset.public_id, 'image')
    }
    next(error)
  }
}

router.put('/:id', ...adminOnly, uploadTopperPhoto, updateTopper)
router.patch('/:id', ...adminOnly, uploadTopperPhoto, updateTopper)

// DELETE: Remove a topper record.
router.delete('/:id', ...adminOnly, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid topper ID.',
      })
    }

    const topper = await Topper.findByIdAndDelete(req.params.id)

    if (!topper) {
      return res.status(404).json({
        success: false,
        message: 'Topper not found.',
      })
    }

    res.json({
      success: true,
      message: 'Topper deleted successfully.',
      data: { id: String(topper._id) },
    })
  } catch (error) {
    next(error)
  }
})

export default router
