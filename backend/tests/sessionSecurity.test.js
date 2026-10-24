import assert from 'node:assert/strict'
import test, { mock } from 'node:test'

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import {
  changePassword,
  logout,
} from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import RevokedSession from '../models/RevokedSession.js'
import User from '../models/User.js'
import {
  createSessionToken,
  csrfTokensMatch,
  verifySessionToken,
} from '../utils/sessionToken.js'

const TEST_SECRET = 'test-session-secret-that-is-long-enough-123456'

process.env.JWT_SECRET = TEST_SECRET

function testUser(overrides = {}) {
  return {
    _id: '64b000000000000000000001',
    name: 'Test User',
    email: 'test@example.com',
    role: 'student',
    status: 'active',
    tokenVersion: 0,
    ...overrides,
  }
}

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    clearedCookie: false,
    cookie: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
    clearCookie() {
      this.clearedCookie = true
      return this
    },
    cookie(name, value, options) {
      this.cookie = { name, value, options }
      return this
    },
  }
}

function mockNext() {
  const next = (error) => {
    next.called = true
    next.error = error
  }

  next.called = false
  next.error = undefined
  return next
}

function mockRequest({ token, body, user } = {}) {
  return {
    cookies: token ? { elc_token: token } : {},
    body: body || {},
    user: user || null,
    get() {
      return undefined
    },
  }
}

test('session tokens include a version, jti, and CSRF secret', (t) => {
  t.after(() => mock.restoreAll())

  const user = testUser({ tokenVersion: 4 })
  const session = createSessionToken(user, TEST_SECRET)
  const decoded = verifySessionToken(session.token, TEST_SECRET)

  assert.equal(decoded.sub, user._id)
  assert.equal(decoded.ver, 4)
  assert.equal(typeof decoded.jti, 'string')
  assert.ok(decoded.jti.length > 10)
  assert.equal(decoded.csrf, session.csrfToken)
  assert.equal(session.tokenVersion, 4)
})

test('legacy session tokens without security claims are rejected', () => {
  const legacyToken = jwt.sign(
    { sub: testUser()._id },
    TEST_SECRET,
    { expiresIn: '1d', algorithm: 'HS256' },
  )

  assert.throws(
    () => verifySessionToken(legacyToken, TEST_SECRET),
    /claims are invalid/,
  )
})

test('CSRF comparison accepts only equal non-empty values', () => {
  assert.equal(csrfTokensMatch('abc123', 'abc123'), true)
  assert.equal(csrfTokensMatch('abc123', 'abc124'), false)
  assert.equal(csrfTokensMatch('abc', 'abcd'), false)
  assert.equal(csrfTokensMatch('', ''), false)
  assert.equal(csrfTokensMatch(null, 'abc'), false)
})

test('requireAuth accepts a current, unrevoked session', async (t) => {
  t.after(() => mock.restoreAll())

  const user = testUser({ tokenVersion: 2 })
  const session = createSessionToken(user, TEST_SECRET)
  const req = mockRequest({ token: session.token })
  const res = mockResponse()
  const next = mockNext()

  mock.method(User, 'findById', async () => user)
  mock.method(RevokedSession, 'exists', async () => null)

  await requireAuth(req, res, next)

  assert.equal(next.called, true)
  assert.equal(next.error, undefined)
  assert.equal(req.user, user)
  assert.equal(req.csrfToken, session.csrfToken)
  assert.equal(res.clearedCookie, false)
})

test('requireAuth rejects sessions after a token version change', async (t) => {
  t.after(() => mock.restoreAll())

  const session = createSessionToken(
    testUser({ tokenVersion: 1 }),
    TEST_SECRET,
  )
  const req = mockRequest({ token: session.token })
  const res = mockResponse()
  const next = mockNext()

  mock.method(User, 'findById', async () =>
    testUser({ tokenVersion: 2 }),
  )
  mock.method(RevokedSession, 'exists', async () => null)

  await requireAuth(req, res, next)

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.code, 'SESSION_REVOKED')
  assert.equal(res.clearedCookie, true)
})

test('requireAuth rejects denylisted sessions', async (t) => {
  t.after(() => mock.restoreAll())

  const user = testUser()
  const session = createSessionToken(user, TEST_SECRET)
  const req = mockRequest({ token: session.token })
  const res = mockResponse()
  const next = mockNext()

  mock.method(User, 'findById', async () => user)
  mock.method(RevokedSession, 'exists', async () => ({ _id: 'revoked' }))

  await requireAuth(req, res, next)

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.code, 'SESSION_REVOKED')
})

test('requireAuth rejects legacy tokens and inactive accounts', async (t) => {
  t.after(() => mock.restoreAll())

  const legacyToken = jwt.sign(
    { sub: testUser()._id },
    TEST_SECRET,
    { expiresIn: '1d', algorithm: 'HS256' },
  )
  const legacyResponse = mockResponse()
  const legacyNext = mockNext()

  await requireAuth(
    mockRequest({ token: legacyToken }),
    legacyResponse,
    legacyNext,
  )

  assert.equal(legacyNext.called, false)
  assert.equal(legacyResponse.body.code, 'SESSION_INVALID')

  const suspended = testUser({ status: 'suspended' })
  const suspendedSession = createSessionToken(
    suspended,
    TEST_SECRET,
  )
  const suspendedResponse = mockResponse()
  const suspendedNext = mockNext()

  mock.method(User, 'findById', async () => suspended)
  mock.method(RevokedSession, 'exists', async () => null)

  await requireAuth(
    mockRequest({ token: suspendedSession.token }),
    suspendedResponse,
    suspendedNext,
  )

  assert.equal(suspendedNext.called, false)
  assert.equal(suspendedResponse.body.code, 'ACCOUNT_INACTIVE')
})

test('logout adds the current jti to the denylist before clearing', async (t) => {
  t.after(() => mock.restoreAll())

  const session = createSessionToken(testUser(), TEST_SECRET)
  const req = mockRequest({ token: session.token })
  const res = mockResponse()
  const next = mockNext()
  let revocation = null

  mock.method(
    RevokedSession,
    'updateOne',
    async (filter, update, options) => {
      revocation = { filter, update, options }
      return { acknowledged: true }
    },
  )

  await logout(req, res, next)

  const decoded = verifySessionToken(session.token, TEST_SECRET)

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 200)
  assert.equal(res.clearedCookie, true)
  assert.equal(revocation.filter.jti, decoded.jti)
  assert.equal(revocation.update.$setOnInsert.jti, decoded.jti)
  assert.equal(revocation.options.upsert, true)
})

test('logout does not report success when revocation fails', async (t) => {
  t.after(() => mock.restoreAll())

  const session = createSessionToken(testUser(), TEST_SECRET)
  const req = mockRequest({ token: session.token })
  const res = mockResponse()
  const next = mockNext()

  mock.method(RevokedSession, 'updateOne', async () => {
    throw new Error('database unavailable')
  })

  await logout(req, res, next)

  assert.equal(next.called, true)
  assert.match(next.error.message, /database unavailable/)
  assert.equal(res.clearedCookie, false)
})

test('password change rotates the token version and reissues the cookie', async (t) => {
  t.after(() => mock.restoreAll())

  const user = {
    ...testUser({ tokenVersion: 0 }),
    password: 'old-hash',
    save: async () => {
      user.saved = true
    },
  }
  const req = mockRequest({
    user,
    body: {
      currentPassword: 'current-password',
      newPassword: 'new-password-123',
    },
  })
  req.csrfToken = 'current-session-csrf-token'
  const res = mockResponse()
  const next = mockNext()

  mock.method(User, 'findById', () => ({
    select: async () => user,
  }))
  mock.method(
    bcrypt,
    'compare',
    async (plain) => plain === 'current-password',
  )
  mock.method(bcrypt, 'hash', async () => 'new-hash')

  await changePassword(req, res, next)

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 200)
  assert.equal(user.tokenVersion, 1)
  assert.equal(user.password, 'new-hash')
  assert.equal(user.saved, true)
  assert.equal(res.cookie.name, 'elc_token')
  assert.equal(res.body.csrfToken, 'current-session-csrf-token')

  const reissued = verifySessionToken(
    res.cookie.value,
    TEST_SECRET,
  )
  assert.equal(reissued.ver, 1)
  assert.equal(reissued.csrf, 'current-session-csrf-token')
})
