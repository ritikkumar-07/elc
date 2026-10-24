import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

const SESSION_ALGORITHM = 'HS256'
const SESSION_EXPIRES_IN = '1d'
const MINIMUM_SECRET_LENGTH = 32

function sessionSecret(secret) {
  const value = secret ?? process.env.JWT_SECRET

  if (!value || value.length < MINIMUM_SECRET_LENGTH) {
    throw new Error('JWT_SECRET must contain at least 32 characters.')
  }

  return value
}

function normalizedTokenVersion(user) {
  const version = Number(user?.tokenVersion ?? 0)
  return Number.isInteger(version) && version >= 0 ? version : 0
}

export function createSessionToken(user, secret, options = {}) {
  if (!user?._id) {
    throw new Error('A user is required to create a session token.')
  }

  const tokenVersion = normalizedTokenVersion(user)
  const csrfToken =
    typeof options.csrfToken === 'string' && options.csrfToken
      ? options.csrfToken
      : crypto.randomBytes(32).toString('hex')
  const jti = crypto.randomUUID()

  const token = jwt.sign(
    {
      sub: user._id.toString(),
      ver: tokenVersion,
      jti,
      csrf: csrfToken,
    },
    sessionSecret(secret),
    {
      expiresIn: SESSION_EXPIRES_IN,
      algorithm: SESSION_ALGORITHM,
    },
  )

  return { token, csrfToken, tokenVersion }
}

export function verifySessionToken(token, secret) {
  if (typeof token !== 'string' || !token) {
    throw new jwt.JsonWebTokenError('Session token is required.')
  }

  const decoded = jwt.verify(token, sessionSecret(secret), {
    algorithms: [SESSION_ALGORITHM],
  })

  if (
    !decoded ||
    typeof decoded !== 'object' ||
    typeof decoded.sub !== 'string' ||
    !decoded.sub ||
    !Number.isInteger(decoded.ver) ||
    decoded.ver < 0 ||
    typeof decoded.jti !== 'string' ||
    !decoded.jti ||
    typeof decoded.csrf !== 'string' ||
    !decoded.csrf
  ) {
    throw new jwt.JsonWebTokenError('Session token claims are invalid.')
  }

  return decoded
}

export function csrfTokensMatch(expected, provided) {
  if (
    typeof expected !== 'string' ||
    typeof provided !== 'string' ||
    !expected ||
    !provided
  ) {
    return false
  }

  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

export function sessionExpiry(decoded) {
  if (Number.isInteger(decoded?.exp)) {
    return new Date(decoded.exp * 1000)
  }

  return new Date(Date.now() + 24 * 60 * 60 * 1000)
}

export function isJwtError(error) {
  return (
    error?.name === 'JsonWebTokenError' ||
    error?.name === 'TokenExpiredError' ||
    error?.name === 'NotBeforeError'
  )
}
