
import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'

import HeroBanner from '../models/HeroBanner.js'
import {
  allowRoles,
  requireAuth,
} from '../middleware/authMiddleware.js'

const router = Router()

const bannerSchema = z.object({
  eyebrow: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(1000),
  imageUrl: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine((value) => {
      try {
        return ['http:', 'https:'].includes(
          new URL(value).protocol,
        )
      } catch {
        return false
      }
    }, 'Image URL must use HTTP or HTTPS.'),
  altText: z.string().trim().min(1).max(300),
})

const adminOnly = [
  requireAuth,
  allowRoles('admin'),
]

function validateBanner(req, res) {
  const result = bannerSchema.safeParse(req.body)

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: 'Please check the banner fields.',
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    })

    return null
  }

  return result.data
}

// GET: Published banners for the public homepage.
router.get('/', async (req, res, next) => {
  try {
    const banners = await HeroBanner.find({
      isPublished: true,
    })
      .sort({ order: 1, createdAt: 1 })
      .lean()

    res.json({
      success: true,
      count: banners.length,
      data: banners,
    })
  } catch (error) {
    next(error)
  }
})

// GET: All banners for Director/Admin.
router.get('/manage', ...adminOnly, async (req, res, next) => {
  try {
    const banners = await HeroBanner.find()
      .sort({ order: 1, createdAt: 1 })
      .lean()

    res.json({
      success: true,
      count: banners.length,
      data: banners,
    })
  } catch (error) {
    next(error)
  }
})

// POST: Create a banner.
router.post('/', ...adminOnly, async (req, res, next) => {
  try {
    const data = validateBanner(req, res)
    if (!data) return

    const lastBanner = await HeroBanner.findOne()
      .sort({ order: -1 })
      .select('order')
      .lean()

    const banner = await HeroBanner.create({
      ...data,
      order: (lastBanner?.order ?? -1) + 1,
      isPublished: true,
    })

    res.status(201).json({
      success: true,
      message: 'Hero banner created successfully.',
      data: banner,
    })
  } catch (error) {
    next(error)
  }
})

// PUT: Update a banner.
router.put('/:id', ...adminOnly, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid banner ID.',
      })
    }

    const data = validateBanner(req, res)
    if (!data) return

    const banner = await HeroBanner.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Hero banner not found.',
      })
    }

    res.json({
      success: true,
      message: 'Hero banner updated successfully.',
      data: banner,
    })
  } catch (error) {
    next(error)
  }
})

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
      data: { id: banner._id },
    })
  } catch (error) {
    next(error)
  }
})

export default router
