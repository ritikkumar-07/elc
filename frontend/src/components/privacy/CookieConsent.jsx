import { useCallback, useEffect, useRef, useState } from 'react'
import { Cookie, ShieldCheck, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { LEGAL_PATHS } from '../../config/legal.js'
import {
  clearConsent,
  CONSENT_CHANGED_EVENT,
  OPEN_COOKIE_PREFERENCES_EVENT,
  readConsent,
  resolveAnalyticsConfig,
  writeConsent,
} from '../../lib/consent.js'

const config = resolveAnalyticsConfig(import.meta.env, {
  production: import.meta.env.PROD,
})

function consentStatus(consent) {
  if (!consent) return 'Not chosen'
  return consent.analytics ? 'Optional analytics allowed' : 'Optional analytics rejected'
}

export default function CookieConsent() {
  const [consent, setConsent] = useState(() => readConsent())
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)

  const closePreferences = useCallback(() => {
    setPreferencesOpen(false)
  }, [])

  useEffect(() => {
    function syncConsent() {
      setConsent(readConsent())
    }

    function openPreferences() {
      setPreferencesOpen(true)
    }

    window.addEventListener(CONSENT_CHANGED_EVENT, syncConsent)
    window.addEventListener('storage', syncConsent)
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, openPreferences)

    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, syncConsent)
      window.removeEventListener('storage', syncConsent)
      window.removeEventListener(
        OPEN_COOKIE_PREFERENCES_EVENT,
        openPreferences,
      )
    }
  }, [])

  useEffect(() => {
    if (!preferencesOpen) return undefined

    const previouslyFocused = document.activeElement
    const originalOverflow = document.body.style.overflow
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closePreferences()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = Array.from(
        panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0)

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [preferencesOpen, closePreferences])

  function chooseAnalytics(allowed) {
    const nextConsent = writeConsent(allowed)

    if (nextConsent) {
      setConsent(nextConsent)
      setPreferencesOpen(false)
    }
  }

  function resetChoice() {
    clearConsent()
    setConsent(null)
  }

  return (
    <>
      {config.enabled && !consent && !preferencesOpen && (
        <section
          aria-label="Optional analytics consent"
          aria-describedby="cookie-consent-description"
          className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-4"
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-18px_rgba(15,23,42,0.45)] sm:flex-row sm:items-center sm:gap-5 sm:p-5">
            <span
              aria-hidden="true"
              className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#19366e] sm:grid"
            >
              <Cookie size={22} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-950">
                Optional website analytics
              </p>
              <p
                id="cookie-consent-description"
                className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6"
              >
                Help the institute understand which public pages are useful.
                Analytics is off unless you allow it. The secure login cookie
                needed for the portal is always used.{' '}
                <Link
                  to={LEGAL_PATHS.privacy}
                  className="font-semibold text-blue-800 underline underline-offset-2 hover:text-blue-950"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>

            <div className="flex flex-col gap-2 min-[420px]:flex-row sm:shrink-0">
              <button
                type="button"
                onClick={() => chooseAnalytics(true)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#19366e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#122951] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
              >
                Allow analytics
              </button>
              <button
                type="button"
                onClick={() => chooseAnalytics(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
              >
                Reject optional
              </button>
            </div>
          </div>
        </section>
      )}

      {preferencesOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-3 sm:items-center sm:p-5"
          onClick={closePreferences}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-preferences-title"
            aria-describedby="cookie-preferences-description"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <span
                aria-hidden="true"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#19366e]"
              >
                <ShieldCheck size={22} />
              </span>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={closePreferences}
                aria-label="Close cookie preferences"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e]"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <h2
              id="cookie-preferences-title"
              className="mt-4 text-xl font-bold text-slate-950"
            >
              Cookie preferences
            </h2>

            <p
              id="cookie-preferences-description"
              className="mt-2 text-sm leading-6 text-slate-600"
            >
              The portal always uses the essential{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-900">
                elc_token
              </code>{' '}
              authentication cookie when you log in. Optional analytics is
              separate and never includes portal records or form contents.
            </p>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Current choice
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {consentStatus(consent)}
              </p>

              {config.enabled ? (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Provider: Plausible Analytics for{' '}
                  <span className="font-semibold text-slate-700">
                    {config.domain}
                  </span>
                  . Read the{' '}
                  <Link
                    to={LEGAL_PATHS.privacy}
                    className="font-semibold text-blue-800 underline underline-offset-2"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              ) : (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  No optional analytics provider is configured for this
                  deployment. Only the essential login cookie is used.
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {config.enabled && (
                <>
                  <button
                    type="button"
                    onClick={() => chooseAnalytics(true)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#19366e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#122951] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
                  >
                    Allow analytics
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseAnalytics(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
                  >
                    Reject optional
                  </button>
                </>
              )}

              {consent && (
                <button
                  type="button"
                  onClick={resetChoice}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
                >
                  Clear saved choice
                </button>
              )}

              {!config.enabled && !consent && (
                <button
                  type="button"
                  onClick={closePreferences}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#19366e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#122951] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
