import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearConsent,
  consentAllowsAnalytics,
  CONSENT_STORAGE_KEY,
  normalizeAnalyticsDomain,
  readConsent,
  resolveAnalyticsConfig,
  writeConsent,
} from '../src/lib/consent.js'

function memoryStorage() {
  const values = new Map()

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}

test('consent is absent until explicitly recorded', () => {
  const storage = memoryStorage()

  assert.equal(readConsent(storage), null)
  assert.equal(consentAllowsAnalytics(null), false)
})

test('consent records the analytics choice and can be cleared', () => {
  const storage = memoryStorage()
  const consent = writeConsent(true, storage, new Date('2026-10-25T10:00:00Z'))

  assert.equal(consent.analytics, true)
  assert.equal(consentAllowsAnalytics(consent), true)
  assert.equal(readConsent(storage).analytics, true)
  assert.equal(
    JSON.parse(storage.getItem(CONSENT_STORAGE_KEY)).updatedAt,
    '2026-10-25T10:00:00.000Z',
  )

  clearConsent(storage)
  assert.equal(readConsent(storage), null)
})

test('invalid or outdated consent data is ignored', () => {
  const storage = memoryStorage()

  storage.setItem(CONSENT_STORAGE_KEY, '{bad json')
  assert.equal(readConsent(storage), null)

  storage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ analytics: true, version: 999 }),
  )
  assert.equal(readConsent(storage), null)
})

test('analytics requires production, an explicit flag, and a valid domain', () => {
  const env = {
    VITE_ANALYTICS_ENABLED: 'true',
    VITE_ANALYTICS_DOMAIN: 'elc.example.com',
  }

  assert.equal(
    resolveAnalyticsConfig(env, { production: false }).enabled,
    false,
  )
  const enabled = resolveAnalyticsConfig(env, { production: true })
  assert.equal(enabled.enabled, true)
  assert.equal(
    enabled.scriptSrc,
    'https://plausible.io/js/script.manual.js',
  )
  assert.equal(
    resolveAnalyticsConfig(
      { VITE_ANALYTICS_ENABLED: 'true' },
      { production: true },
    ).enabled,
    false,
  )
  assert.equal(
    resolveAnalyticsConfig(
      {
        VITE_ANALYTICS_ENABLED: 'true',
        VITE_SITE_URL: 'https://elc.example.com',
      },
      { production: true },
    ).domain,
    'elc.example.com',
  )
})

test('analytics domains reject credentials and non-web protocols', () => {
  assert.equal(normalizeAnalyticsDomain('elc.example.com'), 'elc.example.com')
  assert.equal(
    normalizeAnalyticsDomain('https://elc.example.com/path'),
    'elc.example.com',
  )
  assert.equal(normalizeAnalyticsDomain('javascript:alert(1)'), '')
  assert.equal(normalizeAnalyticsDomain('https://user:pass@example.com'), '')
})
