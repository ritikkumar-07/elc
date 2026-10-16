
import { Router } from 'express'
import Topper from '../models/Topper.js'

const router = Router()

// Public homepage: show only published toppers
router.get('/', async (req, res, next) => {
  try {
    const toppers = await Topper.find({ isPublished: true })
      .select(
        'name photoUrl className board session marks totalMarks percentage rank description createdAt'
      )
      .sort({ session: -1, rank: 1, name: 1 })
      .lean()

    res.status(200).json({
      success: true,
      count: toppers.length,
      data: toppers,
    })
  } catch (error) {
    next(error)
  }
})

export default router
