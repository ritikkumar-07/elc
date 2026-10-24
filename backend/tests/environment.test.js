import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseTrustProxy,
  validateEnvironment,
} from '../utils/environment.js'

const VALID_SECRET = 'environment-test-secret-that-is-long-enough'

function productionEnvironment(overrides = {}) {
  return {
    NODE_ENV: 'production',
    MONGODB_URI:
      'mongodb+srv://cluster.example.com/elc?retryWrites=true',
    JWT_SECRET: VALID_SECRET,
    FRONTEND_URL: 'https://elc.example.com',
    CLOUDINARY_CLOUD_NAME: 'elc-test-cloud',
    CLOUDINARY_API_KEY: 'test-api-key',
    CLOUDINARY_API_SECRET: 'test-api-secret',
    ...overrides,
  }
}

test('accepts a complete production environment', () => {
  const result = validateEnvironment(productionEnvironment())

  assert.equal(result.nodeEnvironment, 'production')
  assert.equal(result.production, true)
  assert.equal(result.hasDatabaseName, true)
})

test('requires a recognized NODE_ENV', () => {
  assert.throws(
    () =>
      validateEnvironment(
        productionEnvironment({ NODE_ENV: undefined }),
      ),
    /NODE_ENV is required/,
  )

  assert.throws(
    () =>
      validateEnvironment(
        productionEnvironment({ NODE_ENV: 'staging' }),
      ),
    /NODE_ENV must be development, test, or production/,
  )
})

test('requires secure, valid frontend origins in production', () => {
  assert.throws(
    () =>
      validateEnvironment(
        productionEnvironment({ FRONTEND_URL: '' }),
      ),
    /FRONTEND_URL is required in production/,
  )

  assert.throws(
    () =>
      validateEnvironment(
        productionEnvironment({
          FRONTEND_URL: 'http://elc.example.com',
        }),
      ),
    /must use https in production/,
  )

  assert.throws(
    () =>
      validateEnvironment(
        productionEnvironment({ FRONTEND_URL: 'not a url' }),
      ),
    /invalid origin/,
  )

  const multiple = validateEnvironment(
    productionEnvironment({
      FRONTEND_URL:
        'https://elc.example.com, https://www.elc.example.com',
    }),
  )
  assert.equal(multiple.production, true)
})

test('requires a database name and strong JWT secret in production', () => {
  assert.throws(
    () =>
      validateEnvironment(
        productionEnvironment({
          MONGODB_URI:
            'mongodb+srv://cluster.example.com/?retryWrites=true',
        }),
      ),
    /database name in production/,
  )

  assert.throws(
    () =>
      validateEnvironment(
        productionEnvironment({ JWT_SECRET: 'short' }),
      ),
    /JWT_SECRET must contain at least 32 characters/,
  )
})

test('requires complete Cloudinary credentials in production', () => {
  assert.throws(
    () =>
      validateEnvironment(
        productionEnvironment({
          CLOUDINARY_CLOUD_NAME: '',
          CLOUDINARY_API_KEY: '',
          CLOUDINARY_API_SECRET: '',
        }),
      ),
    /CLOUDINARY.*required in production/,
  )

  assert.throws(
    () =>
      validateEnvironment(
        productionEnvironment({
          CLOUDINARY_API_KEY: '',
        }),
      ),
    /must include all of/,
  )
})

test('development defaults remain usable without production-only values', () => {
  const result = validateEnvironment({
    NODE_ENV: 'development',
    MONGODB_URI: 'mongodb://localhost:27017',
    JWT_SECRET: VALID_SECRET,
  })

  assert.equal(result.production, false)
  assert.equal(result.hasDatabaseName, false)
})

test('trust proxy accepts only bounded hop counts', () => {
  assert.equal(parseTrustProxy(undefined), 1)
  assert.equal(parseTrustProxy('0'), 0)
  assert.equal(parseTrustProxy('2'), 2)
  assert.equal(parseTrustProxy('false'), false)
  assert.equal(parseTrustProxy('FALSE'), false)

  for (const value of ['true', '-1', '1.5', '11', 'proxy']) {
    assert.throws(
      () => parseTrustProxy(value),
      /TRUST_PROXY must be false or an integer/,
    )
  }
})

test('rejects unsupported database URI schemes', () => {
  assert.throws(
    () =>
      validateEnvironment(
        productionEnvironment({
          MONGODB_URI: 'postgres://example.com/elc',
        }),
      ),
    /must start with mongodb/,
  )
})
