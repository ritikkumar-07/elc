export const CONSENT_STORAGE_KEY = 'elc:optional-analytics:v1'
export const CONSENT_VERSION = 1
export const CONSENT_CHANGED_EVENT = 'elc:consent-changed'
export const OPEN_COOKIE_PREFERENCES_EVENT = 'elc:open-cookie-preferences'

function browserStorage() {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function notifyConsentChanged(consent) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent(CONSENT_CHANGED_EVENT, {
      detail: consent,
    }),
  )
}

export function readConsent(storage = browserStorage()) {
  if (!storage) return null

  try {
    const raw = storage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)

    if (
      !parsed ||
      parsed.version !== CONSENT_VERSION ||
      typeof parsed.analytics !== 'boolean'
    ) {
      return null
    }

    return {
      analytics: parsed.analytics,
      version: CONSENT_VERSION,
      updatedAt:
        typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  } catch {
    return null
  }
}

export function writeConsent(
  analyticsAllowed,
  storage = browserStorage(),
  now = new Date(),
) {
  const consent = {
    analytics: Boolean(analyticsAllowed),
    version: CONSENT_VERSION,
    updatedAt: now.toISOString(),
  }

  if (!storage) {
    notifyConsentChanged(consent)
    return consent
  }

  try {
    storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent))
    notifyConsentChanged(consent)
    return consent
  } catch {
    return null
  }
}

export function clearConsent(storage = browserStorage()) {
  if (!storage) {
    notifyConsentChanged(null)
    return
  }

  try {
    storage.removeItem(CONSENT_STORAGE_KEY)
  } catch {
    return
  }

  notifyConsentChanged(null)
}

export function consentAllowsAnalytics(consent) {
  return Boolean(consent?.analytics)
}

export function normalizeAnalyticsDomain(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`,
    )

    if (!['http:', 'https:'].includes(url.protocol)) return ''
    if (url.username || url.password) return ''
    if (!/^[a-z\d.-]+(?::\d+)?$/i.test(url.host)) return ''

    return url.host
  } catch {
    return ''
  }
}

export function resolveAnalyticsConfig(
  env = {},
  { production = false } = {},
) {
  const configured =
    production && String(env.VITE_ANALYTICS_ENABLED || '').toLowerCase() === 'true'
  const domain = normalizeAnalyticsDomain(
    env.VITE_ANALYTICS_DOMAIN || env.VITE_SITE_URL,
  )

  return {
    enabled: Boolean(configured && domain),
    domain,
    scriptSrc: 'https://plausible.io/js/script.manual.js',
  }
}

export function openCookiePreferences() {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))
}
