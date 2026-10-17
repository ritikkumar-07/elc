
import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import {
  signup,
  login,
  logout,
  getMe,
  changePassword,
} from '../controllers/authController.js'

import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

// Limit repeated signup/login attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again after 15 minutes.',
  },
})

router.post('/signup', authLimiter, signup)
router.post('/login', authLimiter, login)
router.post('/logout', logout)
router.get('/me', requireAuth, getMe)
router.post('/change-password', requireAuth, changePassword)

export default router
