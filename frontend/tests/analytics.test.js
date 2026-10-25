import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAnalyticsPageUrl,
  isPublicAnalyticsPath,
  normalizeAnalyticsPath,
  trackEvent,
  trackPageview,
} from '../src/lib/analytics.js'

test('only indexable public routes are eligible for analytics', () => {
  for (const path of [
    '/',
    '/contact',
    '/privacy-policy',
    '/terms-and-conditions',
    '/courses/course-1',
    '/contact/',
    '/contact?source=footer',
  ]) {
    assert.equal(isPublicAnalyticsPath(path), true, path)
  }

  for (const path of [
    '/admin',
    '/admin/students?search=student@example.com',
    '/teacher/results',
    '/student/notes',
    '/login',
    '/register',
    '/courses',
    '/not-a-real-page',
  ]) {
    assert.equal(isPublicAnalyticsPath(path), false, path)
  }
})

test('analytics paths are normalized without query strings', () => {
  assert.equal(normalizeAnalyticsPath('/contact/?ref=test'), '/contact')
  assert.equal(normalizeAnalyticsPath(''), '/')
  assert.equal(normalizeAnalyticsPath('/'), '/')
  assert.equal(
    buildAnalyticsPageUrl('/contact', 'https://elc.example.com'),
    'https://elc.example.com/contact',
  )
  assert.equal(buildAnalyticsPageUrl('/admin', 'https://elc.example.com'), '')
})

test('pageviews are sent only for public routes', () => {
  const calls = []
  const plausible = (...args) => calls.push(args)

  assert.equal(
    trackPageview('/contact', {
      origin: 'https://elc.example.com',
      plausible,
    }),
    true,
  )
  assert.equal(
    trackPageview('/student/notes', {
      origin: 'https://elc.example.com',
      plausible,
    }),
    false,
  )
  assert.deepEqual(calls, [
    [
      'pageview',
      { u: 'https://elc.example.com/contact' },
    ],
  ])
})

test('CTA events include only primitive, non-sensitive properties', () => {
  const calls = []
  const plausible = (...args) => calls.push(args)

  assert.equal(
    trackEvent(
      'CTA: Admission Enquiry',
      { location: 'hero', count: 1, nested: { email: 'x@example.com' } },
      { plausible },
    ),
    true,
  )
  assert.equal(trackEvent('', {}, { plausible }), false)
  assert.equal(
    trackEvent('CTA: Call', {}, { plausible, pathname: '/admin' }),
    false,
  )
  assert.equal(
    trackEvent('CTA: Call', {}, {
      plausible,
      pathname: '/contact',
      consent: false,
    }),
    false,
  )
  assert.deepEqual(calls, [
    [
      'CTA: Admission Enquiry',
      { props: { location: 'hero', count: 1 } },
    ],
  ])
})
