
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

// Independent rate limit for registration
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
  },
})

// Independent rate limit for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
})

router.post('/signup', signupLimiter, signup)
router.post('/login', loginLimiter, login)
router.post('/logout', logout)
router.get('/me', requireAuth, getMe)
router.post('/change-password', requireAuth, changePassword)

export default router
