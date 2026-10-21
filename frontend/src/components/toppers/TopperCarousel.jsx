import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import TopperCard from './TopperCard.jsx'

const carouselButtonClass =
  'grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white/95 text-[#12315f] shadow-md transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#12315f] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-white disabled:text-slate-300 disabled:shadow-none'

function CarouselButton({ direction, disabled, onClick, label }) {
  const Icon = direction < 0 ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-controls="topper-carousel-track"
      className={carouselButtonClass}
    >
      <Icon aria-hidden="true" size={23} />
    </button>
  )
}

export default function TopperCarousel({ toppers }) {
  const trackRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateControls = useCallback(() => {
    const track = trackRef.current

    if (!track) return

    const maxScroll = Math.max(
      0,
      track.scrollWidth - track.clientWidth,
    )

    setCanScrollLeft(track.scrollLeft > 2)
    setCanScrollRight(track.scrollLeft < maxScroll - 2)
  }, [])

  useEffect(() => {
    const track = trackRef.current

    if (!track) return undefined

    track.scrollTo({ left: 0 })

    const frame = requestAnimationFrame(updateControls)
    const handleResize = () => {
      requestAnimationFrame(updateControls)
    }

    window.addEventListener('resize', handleResize)

    let observer

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleResize)
      observer.observe(track)
    }

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
      observer?.disconnect()
    }
  }, [toppers.length, updateControls])

  function scrollByCard(direction) {
    const track = trackRef.current

    if (!track) return

    const firstSlide = track.firstElementChild
    const gap =
      Number.parseFloat(window.getComputedStyle(track).columnGap) || 24
    const cardWidth = firstSlide?.getBoundingClientRect().width
    const amount = (cardWidth || track.clientWidth) + gap
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    track.scrollBy({
      left: direction * amount,
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  return (
    <div>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {toppers.length} featured{' '}
        {toppers.length === 1 ? 'student' : 'students'}
      </p>

      <div className="flex items-center gap-3">
        <div className="hidden shrink-0 sm:block">
          <CarouselButton
            direction={-1}
            disabled={!canScrollLeft}
            onClick={() => scrollByCard(-1)}
            label="Previous toppers"
          />
        </div>

        <div
          id="topper-carousel-track"
          ref={trackRef}
          onScroll={updateControls}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Published star performers"
          className="flex min-w-0 flex-1 snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain py-1 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {toppers.map((topper, index) => (
            <div
              key={topper.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${toppers.length}`}
              data-topper-slide
              className="w-[88%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
            >
              <TopperCard topper={topper} />
            </div>
          ))}
        </div>

        <div className="hidden shrink-0 sm:block">
          <CarouselButton
            direction={1}
            disabled={!canScrollRight}
            onClick={() => scrollByCard(1)}
            label="Next toppers"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 sm:hidden">
        <CarouselButton
          direction={-1}
          disabled={!canScrollLeft}
          onClick={() => scrollByCard(-1)}
          label="Previous toppers"
        />

        <CarouselButton
          direction={1}
          disabled={!canScrollRight}
          onClick={() => scrollByCard(1)}
          label="Next toppers"
        />
      </div>
    </div>
  )
}
