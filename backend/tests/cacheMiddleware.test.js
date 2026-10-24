import assert from 'node:assert/strict'
import test from 'node:test'

import {
  noStore,
  setPublicCache,
} from '../middleware/cacheMiddleware.js'

function responseHarness() {
  const headers = new Map()

  return {
    headers,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), String(value))
    },
    removeHeader(name) {
      headers.delete(name.toLowerCase())
    },
  }
}

test('noStore marks sensitive API responses as uncacheable', () => {
  const res = responseHarness()
  let called = false

  noStore({}, res, () => {
    called = true
  })

  assert.equal(called, true)
  assert.match(res.headers.get('cache-control'), /no-store/)
  assert.equal(res.headers.get('pragma'), 'no-cache')
  assert.equal(res.headers.get('expires'), '0')
  assert.equal(res.headers.get('surrogate-control'), 'no-store')
})

test('public cache overrides private no-store defaults', () => {
  const res = responseHarness()

  noStore({}, res, () => {})
  setPublicCache(res)

  assert.match(res.headers.get('cache-control'), /^public/)
  assert.equal(res.headers.has('pragma'), false)
  assert.equal(res.headers.has('expires'), false)
  assert.equal(res.headers.has('surrogate-control'), false)
})
