import { useEffect, useState } from 'react'

import SectionHeading from '../common/SectionHeading.jsx'
import TopperCarousel from '../toppers/TopperCarousel.jsx'
import { apiRequest } from '../../lib/api.js'

function TopperCarouselSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="h-3 w-36 animate-pulse rounded-full bg-slate-200" />
        <div className="flex gap-2">
          <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
          <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>

      <div className="flex gap-6 overflow-hidden py-1 pb-5">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="w-[88%] shrink-0 sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[4/3] animate-pulse bg-slate-200" />

              <div className="space-y-4 p-5 sm:p-6">
                <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-20 animate-pulse rounded-xl bg-blue-50" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TopStudents() {
  const [toppers, setToppers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchToppers() {
      try {
        setLoading(true)
        setError('')

        const result = await apiRequest('/api/v1/toppers', {
          signal: controller.signal,
          skipAuthEvent: true,
          cache: 'default',
        })

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error('The server returned an invalid response.')
        }

        setToppers(
          result.data.map((topper) => ({
            ...topper,
            id: topper._id,
            photo: topper.photoUrl || '',
            published: topper.isPublished,
          })),
        )
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Something went wrong.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchToppers()

    return () => controller.abort()
  }, [retryKey])

  return (
    <section
      id="toppers"
      className="scroll-mt-28 bg-slate-50 px-5 py-20"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Celebrating achievement"
          title="Our Star Performers"
          description="Recognising the dedication and hard work of our students."
        />

        {loading && (
          <div role="status">
            <span className="sr-only">Loading student achievements...</span>
            <TopperCarouselSkeleton />
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm"
          >
            <p className="text-sm leading-6 text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="mt-4 rounded-xl bg-[#19366e] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#122951] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && toppers.length > 0 && (
          <TopperCarousel toppers={toppers} />
        )}

        {!loading && !error && toppers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
            <p className="text-sm font-medium text-slate-600">
              Student achievements will appear here soon.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
