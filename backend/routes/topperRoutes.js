import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'

import Topper from '../models/Topper.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'

const router = Router()

const baseFields = {
  name: z.string().trim().min(1).max(100),
  photoUrl: z.string().trim().max(1000).optional().default(''),
  className: z.string().trim().min(1).max(50),
  board: z.string().trim().min(1).max(100),
  session: z.string().trim().min(1).max(30),
  description: z.string().trim().max(500).optional().default(''),
  rank: z.coerce.number().int().min(1).max(10000).optional(),
  isPublished: z.boolean().optional(),
}

const createSchema = z
  .object({
    ...baseFields,
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

const updateSchema = z
  .object({
    ...baseFields,
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
router.post('/', ...adminOnly, async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationResponse(
        res,
        parsed.error,
        'Please check the topper details.',
      )
    }

    const topper = await Topper.create({
      name: parsed.data.name,
      photoUrl: parsed.data.photoUrl,
      className: parsed.data.className,
      board: parsed.data.board,
      session: parsed.data.session,
      description: parsed.data.description,
      rank: parsed.data.rank,
      isPublished: parsed.data.isPublished ?? false,
      ...scoreFields(parsed.data),
    })

    res.status(201).json({
      success: true,
      message: 'Topper created successfully.',
      data: topperResponse(topper.toObject()),
    })
  } catch (error) {
    next(error)
  }
})

// PUT/PATCH: Update a topper record.
async function updateTopper(req, res, next) {
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

    const fields = [
      'name',
      'photoUrl',
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

    res.json({
      success: true,
      message: 'Topper updated successfully.',
      data: topperResponse(topper.toObject()),
    })
  } catch (error) {
    next(error)
  }
}

router.put('/:id', ...adminOnly, updateTopper)
router.patch('/:id', ...adminOnly, updateTopper)

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
