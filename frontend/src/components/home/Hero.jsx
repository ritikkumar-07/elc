
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const defaultSlides = [
  {
    eyebrow: 'PREPARE · PERFORM · PROGRESS',
    title: 'Take the Next Step in Your Education',
    description:
      'Stay connected with your institute and access student services through the ELC portal.',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=2000&q=90',
    alt: 'Student studying and working on educational materials',
  },
  {
    eyebrow: 'LEARN · PRACTISE · ACHIEVE',
    title: 'Build Knowledge. Build Confidence.',
    description:
      'Strengthen your academic foundations through focused learning, regular practice, and guidance.',
    image:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=2000&q=90',
    alt: 'Students learning together in a classroom',
  },
  {
    eyebrow: 'YOUR GOALS · OUR GUIDANCE',
    title: 'Every Step Brings You Closer to Success.',
    description:
      'Discover learning resources, academic updates, and support for your educational journey.',
    image:
      'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=2000&q=90',
    alt: 'Students studying in an educational environment',
  },
]

const features = [
  {
    icon: '⌑',
    title: 'Focused Learning',
    description: 'Build strong academic foundations.',
  },
  {
    icon: '♧',
    title: 'Learning Community',
    description: 'Grow through guidance and practice.',
  },
  {
    icon: '▤',
    title: 'Study Resources',
    description: 'Keep learning materials organised.',
  },
]

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')

export default function Hero({ variant = 'public', canManageBanners = false }) {
  const isPublic = variant === 'public'
  const [slides, setSlides] = useState(defaultSlides)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_URL}/api/v1/hero-banners`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Managed hero banners are unavailable')
        const result = await response.json()
        if (result?.success && Array.isArray(result.data) && result.data.length > 0) {
          return result.data.map((banner) => ({
            eyebrow: banner.eyebrow,
            title: banner.title,
            description: banner.description,
            image: banner.imageUrl,
            alt: banner.altText,
          }))
        }
        return null
      })
      .then((managedSlides) => {
        if (!controller.signal.aborted && managedSlides?.length) {
          setSlides(managedSlides)
          setActiveIndex(0)
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') { /* Keep the original slides available when the API is offline. */ }
      })
    return () => controller.abort()
  }, [])

  const slide = slides[activeIndex] || slides[0]

  // Automatically change slides every 5 seconds.
  useEffect(() => {
    if (isPaused) return undefined

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [isPaused, slides.length])

  const previousSlide = () => {
    setActiveIndex(
      (current) => (current - 1 + slides.length) % slides.length,
    )
  }

  const nextSlide = () => {
    setActiveIndex((current) => (current + 1) % slides.length)
  }

  return (
    <>
      <section
        id="home"
        aria-label="Expert Learning Center highlights"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsPaused(false)
          }
        }}
        className="relative isolate min-h-[510px] overflow-hidden border-b border-slate-200 bg-[#f7f6f2] sm:min-h-[540px]"
      >
        {/* Full-width background photograph */}
        <img
          key={slide.image}
          src={slide.image}
          alt={slide.alt}
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />

        {/* Readable text overlay */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white via-white/95 to-white/55" />

        <div className="mx-auto flex min-h-[510px] w-full max-w-[1600px] items-center px-5 py-16 sm:min-h-[540px] sm:px-8 lg:min-h-[540px] lg:px-14 xl:px-20">
          <div className="w-full max-w-[760px]">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-1 w-10 shrink-0 rounded-full bg-amber-400" />

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#153466] sm:text-sm sm:tracking-[0.22em]">
                {slide.eyebrow}
              </p>
            </div>

            <h1 className="max-w-[680px] font-serif text-[2.45rem] font-bold leading-[1.12] tracking-tight text-[#102d59] sm:text-5xl lg:text-[60px]">
              {slide.title}
            </h1>

            <p className="mt-5 max-w-[540px] text-[15px] leading-7 text-slate-700 sm:mt-6 sm:text-lg sm:leading-8">
              {slide.description}
            </p>

            <div className="mt-7 flex flex-col gap-3 min-[390px]:flex-row min-[390px]:flex-wrap sm:mt-8">
              {isPublic ? (
                <>
                  <Link
                    to="/login"
                    className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#12315f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0c2347] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12315f] focus-visible:ring-offset-2"
                  >
                    Student Portal <span aria-hidden="true">→</span>
                  </Link>

                  <Link
                    to="/login"
                    className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#9aacc7] bg-white/90 px-5 py-3 text-sm font-semibold text-[#12315f] transition-colors hover:border-[#12315f] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12315f] focus-visible:ring-offset-2"
                  >
                    Student &amp; Staff Login
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#12315f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0c2347] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12315f] focus-visible:ring-offset-2"
                  >
                    View Public Website <span aria-hidden="true">→</span>
                  </Link>
                  {canManageBanners && (
                    <Link
                      to="/admin/hero-banners"
                      className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#9aacc7] bg-white/90 px-5 py-3 text-sm font-semibold text-[#12315f] transition-colors hover:border-[#12315f] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12315f] focus-visible:ring-offset-2"
                    >
                      Manage Hero Banners
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Slide indicators */}
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-9">
              <span
                className="min-w-[52px] text-xs font-semibold tabular-nums text-[#12315f]"
                aria-live="polite"
                aria-atomic="true"
              >
                {String(activeIndex + 1).padStart(2, '0')} /{' '}
                {String(slides.length).padStart(2, '0')}
              </span>

              <div className="flex items-center gap-2">
                {slides.map((item, index) => (
                  <button
                    key={item.eyebrow}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show slide ${index + 1}`}
                    aria-pressed={activeIndex === index}
                    className={`h-2.5 rounded-full transition-[width,background-color] duration-200 ${
                      activeIndex === index
                        ? 'w-9 bg-[#12315f]'
                        : 'w-2.5 bg-slate-400/70 hover:bg-slate-600'
                    }`}
                  />
                ))}
              </div>

              {/* Manual controls */}
              {/* <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={previousSlide}
                  aria-label="Previous slide"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-xl text-[#12315f] shadow-sm transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12315f]"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next slide"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-xl text-[#12315f] shadow-sm transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12315f]"
                >
                  ›
                </button>
              </div> */}
            </div>

            <p className="sr-only" aria-live="off">
              {isPaused ? 'Automatic slide rotation paused.' : 'Automatic slide rotation enabled.'}
            </p>
          </div>
        </div>

        {/* Large-screen carousel arrows */}
        <button
          type="button"
          onClick={previousSlide}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-2xl text-[#12315f] shadow-md transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12315f] md:flex lg:left-4"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-2xl text-[#12315f] shadow-md transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12315f] md:flex lg:right-4"
        >
          ›
        </button>
      </section>

      {/* Learning highlights are part of the public homepage, not the dashboard. */}
      {isPublic && (
      <section
        aria-label="Learning highlights"
        className="border-b border-slate-100 bg-white"
      >
        <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-5 py-7 sm:grid-cols-2 sm:px-8 lg:grid-cols-3 lg:gap-10 lg:px-14 xl:px-20">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex min-w-0 items-center gap-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xl text-[#123a75]">
                {feature.icon}
              </div>

              <div className="min-w-0">
                <h2 className="font-serif text-base font-bold text-[#12315f]">
                  {feature.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}
    </>
  )
}
