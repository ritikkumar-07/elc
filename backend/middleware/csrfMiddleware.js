import { AUTH_COOKIE_NAME } from '../utils/authCookie.js'
import {
  csrfTokensMatch,
  isJwtError,
  verifySessionToken,
} from '../utils/sessionToken.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const EXEMPT_PATHS = new Set([
  '/api/v1/auth/signup',
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
])

function requestPath(req) {
  const path = String(req.originalUrl || req.url || '').split('?')[0]
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(requestPath(req))) {
    return next()
  }

  const token = req.cookies?.[AUTH_COOKIE_NAME]

  if (!token) {
    return next()
  }

  let decoded

  try {
    decoded = verifySessionToken(token)
  } catch (error) {
    if (isJwtError(error)) {
      return next()
    }

    return next(error)
  }

  const provided = req.get('x-csrf-token')

  if (!csrfTokensMatch(decoded.csrf, provided)) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID',
      message: 'The request could not be verified. Refresh and try again.',
    })
  }

  req.csrfToken = decoded.csrf
  req.session = decoded
  return next()
}
