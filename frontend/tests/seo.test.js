import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getPageSeo,
  normalizeSiteUrl,
  pageSeoDefaults,
  resolveSiteUrl,
} from '../src/config/seo.js'
import { LEGAL_PATHS } from '../src/config/legal.js'

test('public pages are indexable with stable canonicals', () => {
  assert.equal(getPageSeo('/').canonicalPath, '/')
  assert.equal(getPageSeo('/contact').canonicalPath, '/contact')
  assert.equal(getPageSeo(LEGAL_PATHS.privacy).canonicalPath, LEGAL_PATHS.privacy)
  assert.equal(getPageSeo(LEGAL_PATHS.terms).canonicalPath, LEGAL_PATHS.terms)

  for (const path of ['/', '/contact', LEGAL_PATHS.privacy, LEGAL_PATHS.terms]) {
    assert.equal(getPageSeo(path).robots, 'index, follow')
  }
})

test('course pages use course metadata and unknown courses stay out of search', () => {
  const courseSeo = getPageSeo('/courses/course-1')

  assert.match(courseSeo.title, /Foundation Courses/)
  assert.equal(courseSeo.canonicalPath, '/courses/course-1')
  assert.equal(courseSeo.robots, 'index, follow')

  const missingCourse = getPageSeo('/courses/does-not-exist')
  assert.equal(missingCourse.robots, 'noindex, nofollow')
  assert.equal(missingCourse.canonicalPath, null)
})

test('private and unknown routes are not indexable', () => {
  for (const path of [
    '/login',
    '/register',
    '/admin',
    '/teacher/results',
    '/student/notes',
    '/demo/toppers',
    '/not-a-real-page',
  ]) {
    const seo = getPageSeo(path)
    assert.equal(seo.robots, 'noindex, nofollow', path)
    assert.equal(seo.canonicalPath, null, path)
  }

  assert.equal(pageSeoDefaults.notFound.robots, 'noindex, nofollow')
})

test('site URL normalization only accepts safe HTTPS origins', () => {
  assert.equal(normalizeSiteUrl('example.com'), 'https://example.com')
  assert.equal(
    normalizeSiteUrl('https://example.com/path/'),
    'https://example.com',
  )
  assert.equal(normalizeSiteUrl('http://example.com'), '')
  assert.equal(normalizeSiteUrl('https://localhost:5173'), '')
  assert.equal(normalizeSiteUrl('https://user:pass@example.com'), '')
  assert.equal(normalizeSiteUrl(''), '')
})

test('site URL resolution only falls back to Vercel when explicitly allowed', () => {
  assert.equal(
    resolveSiteUrl(
      { VITE_SITE_URL: 'https://elc.example.com' },
      { allowVercelFallback: true },
    ),
    'https://elc.example.com',
  )
  assert.equal(
    resolveSiteUrl(
      { VERCEL_PROJECT_PRODUCTION_URL: 'elc.vercel.app' },
      { allowVercelFallback: true },
    ),
    'https://elc.vercel.app',
  )
  assert.equal(
    resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'elc.vercel.app' }),
    '',
  )
  assert.equal(
    resolveSiteUrl(
      {
        VITE_SITE_URL: 'https://localhost:5173',
        VERCEL_PROJECT_PRODUCTION_URL: 'elc.vercel.app',
      },
      { allowVercelFallback: true },
    ),
    'https://elc.vercel.app',
  )
})
