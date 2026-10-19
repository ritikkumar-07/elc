
import { Router } from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import { requireAuth, allowRoles } from '../middleware/authMiddleware.js'

const router = Router()
const adminOnly = [requireAuth, allowRoles('admin')]

// GET /api/v1/admin/registrations/pending
router.get('/registrations/pending', ...adminOnly, async (req, res, next) => {
  try {
    const registrations = await User.find({
      role: { $in: ['student', 'teacher'] },
      status: 'pending',
    })
      .select('name email role status createdAt')
      .sort({ createdAt: 1 })
      .lean()

    return res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations,
    })
  } catch (error) {
    return next(error)
  }
})

// PATCH /api/v1/admin/registrations/:id/approve
router.patch(
  '/registrations/:id/approve',
  ...adminOnly,
  async (req, res, next) => {
    try {
      const { id } = req.params

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid registration ID.',
        })
      }

      const user = await User.findOneAndUpdate(
        {
          _id: id,
          role: { $in: ['student', 'teacher'] },
          status: 'pending',
        },
        { $set: { status: 'active' } },
        { new: true, runValidators: true }
      )
        .select('name email role status createdAt')
        .lean()

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Pending student or teacher registration not found.',
        })
      }

      return res.status(200).json({
        success: true,
        message: `${user.role === 'student' ? 'Student' : 'Teacher'} approved successfully.`,
        data: user,
      })
    } catch (error) {
      return next(error)
    }
  }
)

// PATCH /api/v1/admin/registrations/:id/reject
router.patch(
  '/registrations/:id/reject',
  ...adminOnly,
  async (req, res, next) => {
    try {
      const { id } = req.params

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid registration ID.',
        })
      }

      const user = await User.findOneAndUpdate(
        {
          _id: id,
          role: { $in: ['student', 'teacher'] },
          status: 'pending',
        },
        { $set: { status: 'rejected' } },
        { new: true, runValidators: true }
      )
        .select('name email role status createdAt')
        .lean()

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Pending student or teacher registration not found.',
        })
      }

      return res.status(200).json({
        success: true,
        message: `${user.role === 'student' ? 'Student' : 'Teacher'} registration rejected.`,
        data: user,
      })
    } catch (error) {
      return next(error)
    }
  }
)

// Backwards-compatible teacher-only endpoints.

// GET /api/v1/admin/teachers/pending
router.get('/teachers/pending', ...adminOnly, async (req, res, next) => {
  try {
    const teachers = await User.find({
      role: 'teacher',
      status: 'pending',
    })
      .select('name email role status createdAt')
      .sort({ createdAt: 1 })
      .lean()

    return res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers,
    })
  } catch (error) {
    return next(error)
  }
})

// PATCH /api/v1/admin/teachers/:id/approve
router.patch(
  '/teachers/:id/approve',
  ...adminOnly,
  async (req, res, next) => {
    try {
      const { id } = req.params

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid teacher ID.',
        })
      }

      const teacher = await User.findOneAndUpdate(
        { _id: id, role: 'teacher', status: 'pending' },
        { $set: { status: 'active' } },
        { new: true, runValidators: true }
      )
        .select('name email role status createdAt')
        .lean()

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Pending teacher not found.',
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Teacher approved successfully.',
        data: teacher,
      })
    } catch (error) {
      return next(error)
    }
  }
)

export default router
