
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import User from '../models/User.js'
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  clearAuthCookie,
} from '../utils/authCookie.js'
import {
  createSessionToken,
  isJwtError,
  sessionExpiry,
  verifySessionToken,
} from '../utils/sessionToken.js'
import { revokeSession } from '../utils/sessionRevocation.js'
import { recordAudit } from '../utils/audit.js'

const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
  role: z.enum(['student', 'teacher']).default('student'),
})

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
})

const SIGNUP_RESPONSE_MESSAGE =
  'Registration received. If the email is not already registered, an administrator will review the request.'

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  }
}

// POST /api/v1/auth/signup
// Students and teachers must be approved by an admin before login.
export async function signup(req, res, next) {
  try {
    const parsed = signupSchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signup details.',
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const name = parsed.data.name
    const email = parsed.data.email.toLowerCase()
    const password = parsed.data.password
    const role = parsed.data.role
    const hashedPassword = await bcrypt.hash(password, 12)
    const existingUser = await User.exists({ email })

    if (!existingUser) {
      try {
        await User.create({
          name,
          email,
          password: hashedPassword,
          role,
          status: 'pending',
        })
      } catch (error) {
        if (error.code !== 11000) throw error
      }
    }

    // The response is intentionally identical for new and existing emails.
    return res.status(201).json({
      success: true,
      message: SIGNUP_RESPONSE_MESSAGE,
    })
  } catch (error) {
    return next(error)
  }
}

// POST /api/v1/auth/login
export async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email and password.',
      })
    }

    const email = parsed.data.email.toLowerCase()

    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      await bcrypt.compare(parsed.data.password, DUMMY_PASSWORD_HASH)

      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      })
    }

    const passwordMatches = await bcrypt.compare(
      parsed.data.password,
      user.password
    )

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      })
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_PENDING',
        message:
          'Admin approval has not been granted yet. Please contact the admin.',
      })
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_REJECTED',
        message:
          'Your registration was not approved. Please contact the admin.',
      })
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'This account is not active. Please contact the admin.',
      })
    }

    const { token, csrfToken } = createSessionToken(user)

    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions())

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: publicUser(user),
      csrfToken,
    })
  } catch (error) {
    return next(error)
  }
}

// POST /api/v1/auth/logout
export async function logout(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME]

  if (token) {
    try {
      const decoded = verifySessionToken(token)

      await revokeSession(decoded.jti, sessionExpiry(decoded))
    } catch (error) {
      if (!isJwtError(error)) {
        return next(error)
      }
    }
  }

  clearAuthCookie(res)

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  })
}

// GET /api/v1/auth/me
export function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: publicUser(req.user),
    csrfToken: req.csrfToken,
  })
}

// POST /api/v1/auth/change-password
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {}

    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      !currentPassword ||
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Enter your current password and a new password of 8–72 characters.',
      })
    }

    const user = await User.findById(req.user._id).select('+password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      })
    }

    const matches = await bcrypt.compare(
      currentPassword,
      user.password
    )

    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'Your current password is incorrect.',
      })
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.password
    )

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message:
          'Choose a password different from your current password.',
      })
    }

    user.password = await bcrypt.hash(newPassword, 12)
    user.tokenVersion = Number(user.tokenVersion || 0) + 1
    await user.save()

    await recordAudit(req, {
      action: 'account.password.changed',
      targetType: 'user',
      targetId: user._id,
      metadata: { sessionsInvalidated: true },
    })

    const { token, csrfToken } = createSessionToken(
      user,
      undefined,
      { csrfToken: req.csrfToken },
    )
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions())

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      csrfToken,
    })
  } catch (error) {
    return next(error)
  }
}
