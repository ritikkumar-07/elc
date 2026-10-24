
import { Router } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

import {
  signup,
  login,
  logout,
  getMe,
  changePassword,
} from '../controllers/authController.js'

import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

function loginRateLimitKey(req) {
  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase().slice(0, 254)
      : 'unknown-email'

  return `${ipKeyGenerator(req.ip || '')}:${email}`
}

// Independent rate limit for registration
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
  },
})

// Limit failed attempts per source and account so credential stuffing
// cannot spread across many email addresses from one address.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: loginRateLimitKey,
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
