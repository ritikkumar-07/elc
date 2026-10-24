
import User from '../models/User.js'
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
} from '../utils/authCookie.js'
import {
  isJwtError,
  verifySessionToken,
} from '../utils/sessionToken.js'
import { isSessionRevoked } from '../utils/sessionRevocation.js'

// Verify login cookie and load the active user
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME]

    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Please log in to continue.',
      })
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      return res.status(500).json({
        success: false,
        message: 'Authentication is not configured correctly.',
      })
    }

    const decoded = verifySessionToken(token)
    const [user, revoked] = await Promise.all([
      User.findById(decoded.sub),
      isSessionRevoked(decoded.jti),
    ])

    if (!user || user.status !== 'active') {
      clearAuthCookie(res)

      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Your account is unavailable. Please log in again.',
      })
    }

    if (
      revoked ||
      Number(user.tokenVersion || 0) !== decoded.ver
    ) {
      clearAuthCookie(res)

      return res.status(401).json({
        success: false,
        code: 'SESSION_REVOKED',
        message: 'Your session has been revoked. Please log in again.',
      })
    }

    req.user = user
    req.session = decoded
    req.csrfToken = decoded.csrf
    next()
  } catch (error) {
    if (isJwtError(error)) {
      clearAuthCookie(res)

      return res.status(401).json({
        success: false,
        code: 'SESSION_INVALID',
        message: 'Your session is invalid or expired. Please log in again.',
      })
    }

    next(error)
  }
}

// Restrict routes to specific roles
export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Please log in to continue.',
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      })
    }

    next()
  }
}
