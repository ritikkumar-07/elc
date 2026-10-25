import publicPages from '../data/publicPages.js'
import {
  consentAllowsAnalytics,
  readConsent,
} from './consent.js'

const publicAnalyticsPaths = new Set(
  publicPages.map((page) => page.path),
)

export function normalizeAnalyticsPath(pathname = '/') {
  const raw = String(pathname || '/').trim() || '/'
  const path = raw.split(/[?#]/, 1)[0]
  if (path.length <= 1) return '/'
  return path.replace(/\/+$/, '') || '/'
}

export function isPublicAnalyticsPath(pathname) {
  return publicAnalyticsPaths.has(
    normalizeAnalyticsPath(pathname),
  )
}

export function buildAnalyticsPageUrl(pathname, origin = '') {
  const path = normalizeAnalyticsPath(pathname)

  if (!isPublicAnalyticsPath(path)) return ''

  const base = String(origin || '').trim()
  if (!base) return path

  try {
    return new URL(path, base).toString()
  } catch {
    return ''
  }
}

function resolveTracker(plausible) {
  if (typeof plausible === 'function') return plausible
  if (
    typeof window !== 'undefined' &&
    typeof window.plausible === 'function'
  ) {
    return window.plausible
  }
  return null
}

export function trackPageview(
  pathname,
  { origin = '', plausible } = {},
) {
  const resolvedOrigin =
    origin ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : '')
  const url = buildAnalyticsPageUrl(pathname, resolvedOrigin)
  const tracker = resolveTracker(plausible)

  if (!url || !tracker) return false

  tracker('pageview', { u: url })
  return true
}

export function trackEvent(
  name,
  props = {},
  { plausible, pathname, consent } = {},
) {
  const eventName = String(name || '').trim()
  if (!eventName || eventName.length > 80) return false

  const currentPath =
    pathname ??
    (typeof window !== 'undefined'
      ? window.location.pathname
      : '/')
  const analyticsAllowed =
    consent !== undefined
      ? Boolean(consent)
      : typeof window !== 'undefined'
        ? consentAllowsAnalytics(readConsent())
        : true

  if (
    !isPublicAnalyticsPath(currentPath) ||
    !analyticsAllowed
  ) {
    return false
  }

  const tracker = resolveTracker(plausible)
  if (!tracker) return false

  const cleanProps = {}

  for (const [key, value] of Object.entries(props)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      cleanProps[key] = value
    }
  }

  if (Object.keys(cleanProps).length > 0) {
    tracker(eventName, { props: cleanProps })
  } else {
    tracker(eventName)
  }

  return true
}
