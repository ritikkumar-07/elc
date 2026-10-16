
import { useEffect, useState } from 'react'
import SectionHeading from '../common/SectionHeading.jsx'
import TopperCard from '../toppers/TopperCard.jsx'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export default function TopStudents() {
  const [toppers, setToppers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function fetchToppers() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `${API_BASE_URL}/api/v1/toppers`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error('Unable to load student achievements.')
        }

        const result = await response.json()

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error('The server returned an invalid response.')
        }

        // Adapt the database fields to the existing TopperCard component.
        const publishedToppers = result.data.map((topper) => ({
          ...topper,
          id: topper._id,
          photo: topper.photoUrl || '',
          published: topper.isPublished,
        }))

        setToppers(publishedToppers)
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
  }, [])

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
          <p role="status" className="text-center text-slate-500">
            Loading student achievements...
          </p>
        )}

        {!loading && error && (
          <div className="text-center" role="alert">
            <p className="text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-xl bg-blue-900 px-4 py-2 font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && toppers.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {toppers.map((topper) => (
              <TopperCard
                key={topper.id}
                topper={topper}
              />
            ))}
          </div>
        )}

        {!loading && !error && toppers.length === 0 && (
          <p className="text-center text-slate-500">
            Student achievements will appear here soon.
          </p>
        )}
      </div>
    </section>
  )
}
