import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'

import HeroBanner from '../models/HeroBanner.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'
import { setPublicCache } from '../middleware/cacheMiddleware.js'

const router = Router()

const urlField = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol)
    } catch {
      return false
    }
  }, 'Image URL must use HTTP or HTTPS.')

const bannerFields = {
  eyebrow: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(1000),
  imageUrl: urlField,
  altText: z.string().trim().min(1).max(300),
  order: z.coerce.number().int().min(0).max(100000).optional(),
  isPublished: z.boolean().optional(),
}

const createSchema = z.object(bannerFields).strict()
const updateSchema = z.object(bannerFields).partial().strict()

const adminOnly = [requireAuth, allowRoles('admin')]

function validationResponse(res, error) {
  return res.status(400).json({
    success: false,
    message: 'Please check the banner fields.',
    errors: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  })
}

function bannerResponse(banner) {
  return {
    ...banner,
    id: String(banner._id),
  }
}

// GET: Published banners for the public homepage.
router.get('/', async (req, res, next) => {
  try {
    const banners = await HeroBanner.find({
      isPublished: true,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean()

    setPublicCache(res)

    res.json({
      success: true,
      count: banners.length,
      data: banners.map(bannerResponse),
    })
  } catch (error) {
    next(error)
  }
})

// GET: All banners for administrators.
router.get('/manage', ...adminOnly, async (req, res, next) => {
  try {
    const banners = await HeroBanner.find()
      .sort({ order: 1, createdAt: 1 })
      .lean()

    res.json({
      success: true,
      count: banners.length,
      data: banners.map(bannerResponse),
    })
  } catch (error) {
    next(error)
  }
})

// POST: Create a banner.
router.post('/', ...adminOnly, async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body)

    if (!parsed.success) {
      return validationResponse(res, parsed.error)
    }

    let order = parsed.data.order

    if (order === undefined) {
      const lastBanner = await HeroBanner.findOne()
        .sort({ order: -1 })
        .select('order')
        .lean()

      order = (lastBanner?.order ?? -1) + 1
    }

    const banner = await HeroBanner.create({
      ...parsed.data,
      order,
      isPublished: parsed.data.isPublished ?? true,
    })

    res.status(201).json({
      success: true,
      message: 'Hero banner created successfully.',
      data: bannerResponse(banner.toObject()),
    })
  } catch (error) {
    next(error)
  }
})

// PUT/PATCH: Update a banner, including publishing state and order.
async function updateBanner(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid banner ID.',
      })
    }

    const schema = req.method === 'PUT' ? createSchema : updateSchema
    const parsed = schema.safeParse(req.body)

    if (!parsed.success) {
      return validationResponse(res, parsed.error)
    }

    const banner = await HeroBanner.findByIdAndUpdate(
      req.params.id,
      { $set: parsed.data },
      {
        new: true,
        runValidators: true,
      },
    ).lean()

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Hero banner not found.',
      })
    }

    res.json({
      success: true,
      message: 'Hero banner updated successfully.',
      data: bannerResponse(banner),
    })
  } catch (error) {
    next(error)
  }
}

router.put('/:id', ...adminOnly, updateBanner)
router.patch('/:id', ...adminOnly, updateBanner)

// DELETE: Remove a banner.
router.delete('/:id', ...adminOnly, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid banner ID.',
      })
    }

    const banner = await HeroBanner.findByIdAndDelete(
      req.params.id,
    )

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Hero banner not found.',
      })
    }

    res.json({
      success: true,
      message: 'Hero banner deleted successfully.',
      data: { id: String(banner._id) },
    })
  } catch (error) {
    next(error)
  }
})

export default router
