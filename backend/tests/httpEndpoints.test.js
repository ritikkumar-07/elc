import assert from 'node:assert/strict'
import http from 'node:http'
import test, { after } from 'node:test'

process.env.NODE_ENV = 'test'
process.env.FRONTEND_URL = 'https://elc-eta.vercel.app'
process.env.JWT_SECRET =
  'http-endpoint-test-secret-that-is-long-enough'

const { app } = await import('../server.js')

const server = http.createServer(app)
await new Promise((resolve) =>
  server.listen(0, '127.0.0.1', resolve),
)
const { port } = server.address()
const baseUrl = `http://127.0.0.1:${port}`
const allowedOrigin = 'https://elc-eta.vercel.app'

after(async () => {
  server.closeAllConnections()
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
})

function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options)
}

test('health responds with JSON and CORS headers for the allowed origin', async () => {
  const response = await request('/api/v1/health', {
    headers: { Origin: allowedOrigin },
  })

  assert.equal(response.status, 503)
  assert.match(
    response.headers.get('content-type') || '',
    /^application\/json/,
  )
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    allowedOrigin,
  )
  assert.equal(
    response.headers.get('access-control-allow-credentials'),
    'true',
  )
  assert.match(response.headers.get('vary') || '', /Origin/i)
  assert.ok(response.headers.get('x-request-id'))
  assert.equal(
    response.headers.get('cache-control'),
    'private, no-store, max-age=0',
  )

  const body = await response.json()
  assert.equal(body.success, false)
  assert.equal(body.database, 'disconnected')
})

test('preflight allows the configured frontend and requested headers', async () => {
  const response = await request('/api/v1/hero-banners', {
    method: 'OPTIONS',
    headers: {
      Origin: allowedOrigin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers':
        'content-type,x-csrf-token',
    },
  })

  assert.equal(response.status, 204)
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    allowedOrigin,
  )
  assert.equal(
    response.headers.get('access-control-allow-credentials'),
    'true',
  )
  assert.match(
    response.headers.get('access-control-allow-methods') || '',
    /GET/,
  )
  assert.match(
    response.headers.get('access-control-allow-headers') || '',
    /x-csrf-token/i,
  )
})

test('preflight does not grant a lookalike origin', async () => {
  const response = await request('/api/v1/hero-banners', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://elc-eta.vercel.app.evil.example',
      'Access-Control-Request-Method': 'GET',
    },
  })

  assert.equal(response.status, 200)
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    null,
  )
})

test('protected auth route stays 401 without a session and keeps CORS', async () => {
  const response = await request('/api/v1/auth/me', {
    headers: { Origin: allowedOrigin },
  })

  assert.equal(response.status, 401)
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    allowedOrigin,
  )

  const body = await response.json()
  assert.equal(body.success, false)
  assert.equal(body.code, 'AUTH_REQUIRED')
})

test('unknown routes return sanitized JSON with CORS headers', async () => {
  const response = await request('/api/v1/not-a-real-route', {
    headers: { Origin: allowedOrigin },
  })

  assert.equal(response.status, 404)
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    allowedOrigin,
  )

  const body = await response.json()
  assert.deepEqual(body, {
    success: false,
    message: 'API route not found.',
  })
})

test('the Capacitor origin remains explicitly allowed', async () => {
  const response = await request('/api/v1/health', {
    headers: { Origin: 'https://localhost' },
  })

  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'https://localhost',
  )
})

test('a disallowed origin receives no CORS grant on normal requests', async () => {
  const response = await request('/api/v1/health', {
    headers: { Origin: 'https://attacker.example' },
  })

  assert.equal(response.status, 503)
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    null,
  )
})

test('the frontend origin is matched exactly, including scheme', async () => {
  const response = await request('/api/v1/health', {
    headers: { Origin: 'http://elc-eta.vercel.app' },
  })

  assert.equal(
    response.headers.get('access-control-allow-origin'),
    null,
  )
})

test('malformed JSON returns a controlled error with CORS headers', async () => {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      Origin: allowedOrigin,
      'Content-Type': 'application/json',
    },
    body: '{"email":',
  })

  assert.equal(response.status, 400)
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    allowedOrigin,
  )

  const body = await response.json()
  assert.equal(body.success, false)
})

test('mutating requests from an untrusted origin are rejected', async () => {
  const response = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      Origin: 'https://attacker.example',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'student@example.com',
      password: 'irrelevant-password',
    }),
  })

  assert.equal(response.status, 403)
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    null,
  )

  const body = await response.json()
  assert.equal(body.success, false)
  assert.equal(body.code, 'ORIGIN_NOT_ALLOWED')
})
