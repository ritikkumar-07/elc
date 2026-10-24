import assert from 'node:assert/strict'
import test from 'node:test'

import jwt from 'jsonwebtoken'

import { csrfProtection } from '../middleware/csrfMiddleware.js'
import { createSessionToken } from '../utils/sessionToken.js'

const TEST_SECRET = 'test-csrf-secret-that-is-long-enough-1234567'

process.env.JWT_SECRET = TEST_SECRET

function user() {
  return {
    _id: '64b000000000000000000002',
    tokenVersion: 0,
  }
}

function request({
  method = 'POST',
  url = '/api/v1/students',
  token,
  csrf,
} = {}) {
  const headers = {}

  if (csrf !== undefined) {
    headers['x-csrf-token'] = csrf
  }

  return {
    method,
    originalUrl: url,
    cookies: token ? { elc_token: token } : {},
    get(name) {
      return headers[String(name).toLowerCase()]
    },
  }
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

function recorder() {
  const next = (error) => {
    next.called = true
    next.error = error
  }

  next.called = false
  next.error = undefined
  return next
}

test('valid session CSRF token allows a mutation', () => {
  const session = createSessionToken(user(), TEST_SECRET)
  const req = request({
    token: session.token,
    csrf: session.csrfToken,
  })
  const res = response()
  const next = recorder()

  csrfProtection(req, res, next)

  assert.equal(next.called, true)
  assert.equal(next.error, undefined)
  assert.equal(req.csrfToken, session.csrfToken)
})

test('missing or incorrect CSRF token rejects a mutation', () => {
  const session = createSessionToken(user(), TEST_SECRET)

  for (const csrf of [undefined, '', 'wrong-token']) {
    const res = response()
    const next = recorder()

    csrfProtection(
      request({ token: session.token, csrf }),
      res,
      next,
    )

    assert.equal(next.called, false)
    assert.equal(res.statusCode, 403)
    assert.equal(res.body.code, 'CSRF_INVALID')
  }
})

test('safe methods and auth bootstrap routes are exempt', () => {
  const session = createSessionToken(user(), TEST_SECRET)

  for (const [method, url] of [
    ['GET', '/api/v1/students'],
    ['HEAD', '/api/v1/students'],
    ['OPTIONS', '/api/v1/students'],
    ['POST', '/api/v1/auth/login'],
    ['POST', '/api/v1/auth/signup'],
    ['POST', '/api/v1/auth/logout'],
  ]) {
    const next = recorder()

    csrfProtection(request({ method, url }), response(), next)

    assert.equal(next.called, true)
  }

  const noCookieNext = recorder()
  csrfProtection(
    request({ token: session.token, csrf: undefined }),
    response(),
    noCookieNext,
  )
  assert.equal(noCookieNext.called, false)
})

test('requests without a session defer to normal authentication', () => {
  const next = recorder()

  csrfProtection(request(), response(), next)

  assert.equal(next.called, true)
})

test('legacy or malformed sessions defer to session validation', () => {
  const legacyToken = jwt.sign(
    { sub: user()._id },
    TEST_SECRET,
    { expiresIn: '1d', algorithm: 'HS256' },
  )
  const next = recorder()

  csrfProtection(
    request({ token: legacyToken, csrf: 'anything' }),
    response(),
    next,
  )

  assert.equal(next.called, true)
  assert.equal(next.error, undefined)
})
