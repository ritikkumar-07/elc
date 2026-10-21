import { useEffect, useState } from 'react'

import SectionHeading from '../common/SectionHeading.jsx'
import { apiRequest } from '../../lib/api.js'

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadAnnouncements() {
      try {
        setLoading(true)
        setError('')

        const result = await apiRequest(
          '/api/v1/announcements/public?limit=6',
          {
            signal: controller.signal,
            skipAuthEvent: true,
            cache: 'default',
          },
        )

        setAnnouncements(
          Array.isArray(result.data) ? result.data : [],
        )
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(
            err.message || 'Unable to load announcements.',
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadAnnouncements()

    return () => controller.abort()
  }, [reloadKey])

  function formatDate(value) {
    if (!value) return ''

    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  }

  return (
    <section
      id="announcements"
      className="scroll-mt-28 bg-blue-50 px-5 py-20"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Stay informed"
          title="Latest Announcements"
          description="Important information for students and parents."
        />

        {loading && (
          <p role="status" className="text-center text-slate-500">
            Loading announcements...
          </p>
        )}

        {!loading && error && (
          <div className="text-center" role="alert">
            <p className="text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-3 rounded-xl bg-blue-900 px-4 py-2 font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && announcements.length === 0 && (
          <p className="text-center text-slate-500">
            There are no public announcements right now.
          </p>
        )}

        {!loading && !error && announcements.length > 0 && (
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
            {announcements.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-blue-100 bg-white p-6"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  Announcement
                </span>
                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 whitespace-pre-line leading-7 text-slate-600">
                  {item.content}
                </p>
                {(item.publishAt || item.createdAt) && (
                  <p className="mt-4 text-xs text-slate-500">
                    {formatDate(item.publishAt || item.createdAt)}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
