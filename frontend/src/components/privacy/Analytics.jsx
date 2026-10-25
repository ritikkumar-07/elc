import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import {
  CONSENT_CHANGED_EVENT,
  consentAllowsAnalytics,
  readConsent,
  resolveAnalyticsConfig,
} from '../../lib/consent.js'
import {
  isPublicAnalyticsPath,
  trackPageview,
} from '../../lib/analytics.js'

const config = resolveAnalyticsConfig(import.meta.env, {
  production: import.meta.env.PROD,
})

function removeAnalyticsScript() {
  document
    .querySelectorAll('script[data-elc-analytics="true"]')
    .forEach((script) => script.remove())

  if (typeof window !== 'undefined') {
    window.plausible = undefined
  }
}

function ensureAnalyticsQueue() {
  if (
    typeof window !== 'undefined' &&
    typeof window.plausible !== 'function'
  ) {
    window.plausible = function plausibleQueue() {
      window.plausible.q = window.plausible.q || []
      window.plausible.q.push(arguments)
    }
  }
}

function addAnalyticsScript() {
  if (
    document.querySelector('script[data-elc-analytics="true"]')
  ) {
    return
  }

  ensureAnalyticsQueue()

  const script = document.createElement('script')
  script.async = true
  script.defer = true
  script.src = config.scriptSrc
  script.dataset.domain = config.domain
  script.dataset.elcAnalytics = 'true'
  document.head.appendChild(script)
}

export default function Analytics() {
  const { pathname } = useLocation()
  const [analyticsAllowed, setAnalyticsAllowed] = useState(
    () =>
      config.enabled && consentAllowsAnalytics(readConsent()),
  )
  const lastTrackedPath = useRef('')

  useEffect(() => {
    if (!config.enabled) return undefined

    function syncAnalytics() {
      const allowed = consentAllowsAnalytics(readConsent())
      setAnalyticsAllowed(allowed)

      if (allowed) {
        addAnalyticsScript()
      } else {
        removeAnalyticsScript()
      }
    }

    syncAnalytics()

    window.addEventListener(CONSENT_CHANGED_EVENT, syncAnalytics)
    window.addEventListener('storage', syncAnalytics)

    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, syncAnalytics)
      window.removeEventListener('storage', syncAnalytics)
    }
  }, [])

  useEffect(() => {
    if (!config.enabled || !analyticsAllowed) {
      lastTrackedPath.current = ''
      return
    }

    if (!isPublicAnalyticsPath(pathname)) {
      lastTrackedPath.current = ''
      return
    }

    if (lastTrackedPath.current === pathname) return

    if (trackPageview(pathname)) {
      lastTrackedPath.current = pathname
    }
  }, [analyticsAllowed, pathname])

  return null
}
