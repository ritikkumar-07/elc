
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Menu,
  Users,
  X,
} from 'lucide-react'

const slides = [
  {
    eyebrow: 'LEARN · PRACTICE · GROW',
    title: 'Your Partner in Academic Success',
    description:
      'Build strong foundations, strengthen your concepts and work towards your academic goals.',
    image:
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1800&q=85',
    imageAlt: 'Students learning together',
    label: 'A brighter future begins with learning.',
    action: 'Explore Courses',
    href: '#courses',
  },
  {
    eyebrow: 'KNOWLEDGE · CONFIDENCE · PROGRESS',
    title: 'Make Every Learning Day Count',
    description:
      'Discover learning resources and develop the confidence to take your next academic step.',
    image:
      'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1800&q=85',
    imageAlt: 'Students in an academic setting',
    label: 'Learn with purpose. Grow with confidence.',
    action: 'About ELC',
    href: '#about',
  },
  {
    eyebrow: 'PREPARE · PERFORM · PROGRESS',
    title: 'Take the Next Step in Your Education',
    description:
      'Stay connected with your institute and access student services through the ELC portal.',
    image:
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1800&q=85',
    imageAlt: 'Books and study materials on a desk',
    label: 'Your goals deserve consistent effort.',
    action: 'Student Portal',
    href: '/login',
  },
]

const features = [
  {
    icon: GraduationCap,
    title: 'Focused Learning',
    text: 'Build strong academic foundations.',
  },
  {
    icon: Users,
    title: 'Learning Community',
    text: 'Grow through guidance and practice.',
  },
  {
    icon: BookOpen,
    title: 'Study Resources',
    text: 'Keep learning materials organised.',
  },
]

function Home() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  const slide = slides[activeSlide]

  const nextSlide = () => {
    setActiveSlide((current) => (current + 1) % slides.length)
  }

  const previousSlide = () => {
    setActiveSlide(
      (current) => (current - 1 + slides.length) % slides.length,
    )
  }

  useEffect(() => {
    const timer = window.setInterval(nextSlide, 6000)
    return () => window.clearInterval(timer)
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <main className="min-h-screen bg-white text-slate-800">
      <header className="relative z-20 border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link
            to="/"
            onClick={closeMenu}
            className="flex items-center gap-3"
            aria-label="ELC home"
          >
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#102d57] font-serif text-3xl font-bold text-white shadow-sm">
              E
            </span>
            <span>
              <span className="block font-serif text-2xl font-bold leading-none text-[#102d57]">
                ELC
              </span>
              <span className="mt-1 block text-[10px] font-semibold tracking-[0.13em] text-slate-600 sm:text-xs">
                EXPERT LEARNING CENTER
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#home" className="text-[#102d57]">Home</a>
            <a href="#about" className="transition hover:text-blue-700">About</a>
            <a href="#courses" className="transition hover:text-blue-700">Courses</a>
            <a href="#announcements" className="transition hover:text-blue-700">Announcements</a>
            <a href="#contact" className="transition hover:text-blue-700">Contact</a>
          </div>

          <div className="hidden md:block">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-[#102d57] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
            >
              Login to Portal <ArrowRight size={17} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-lg border border-slate-200 text-[#102d57] md:hidden"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="absolute left-0 right-0 top-full border-t border-slate-200 bg-white p-5 shadow-xl md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {[
                ['Home', '#home'],
                ['About', '#about'],
                ['Courses', '#courses'],
                ['Announcements', '#announcements'],
                ['Contact', '#contact'],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={closeMenu}
                  className="rounded-lg px-3 py-3 font-medium hover:bg-slate-50"
                >
                  {label}
                </a>
              ))}
              <Link
                to="/login"
                onClick={closeMenu}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#102d57] px-4 py-3 font-semibold text-white"
              >
                Login to Portal <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        )}
      </header>

      <section
        id="home"
        className="relative isolate overflow-hidden bg-slate-100"
        aria-label="Featured announcements"
      >
        <div className="absolute inset-0">
          <img
            key={slide.image}
            src={slide.image}
            alt={slide.imageAlt}
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/45 md:via-white/85 md:to-white/10" />
        </div>

        <div className="relative mx-auto grid min-h-[490px] max-w-7xl items-center gap-8 px-5 py-16 sm:py-20 md:min-h-[540px] md:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-5 flex items-center gap-3 text-xs font-bold tracking-[0.2em] text-[#183d70] sm:text-sm">
              <span className="h-1 w-10 rounded-full bg-amber-400" />
              {slide.eyebrow}
            </p>

            <h1 className="max-w-xl font-serif text-4xl font-bold leading-tight text-[#102d57] sm:text-5xl lg:text-6xl">
              {slide.title}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
              {slide.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {slide.href.startsWith('/') ? (
                <Link
                  to={slide.href}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#102d57] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-900"
                >
                  {slide.action} <ArrowRight size={18} />
                </Link>
              ) : (
                <a
                  href={slide.href}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#102d57] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-900"
                >
                  {slide.action} <ArrowRight size={18} />
                </a>
              )}

              <Link
                to="/login"
                className="inline-flex items-center rounded-lg border border-[#102d57]/40 bg-white/80 px-5 py-3 font-semibold text-[#102d57] transition hover:bg-white"
              >
                Access Student Portal
              </Link>
            </div>

            <div className="mt-9 flex items-center gap-3">
              {slides.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Show slide ${index + 1}`}
                  aria-current={activeSlide === index ? 'true' : undefined}
                  className={`h-2.5 rounded-full transition-all ${
                    activeSlide === index
                      ? 'w-9 bg-[#102d57]'
                      : 'w-2.5 bg-slate-400/60 hover:bg-slate-500'
                  }`}
                />
              ))}
              <span className="ml-2 text-xs font-medium text-slate-600">
                {activeSlide + 1} / {slides.length}
              </span>
            </div>
          </div>

          <div className="hidden md:flex md:justify-end">
            <div className="max-w-xs rounded-2xl border border-white/70 bg-white/80 p-6 shadow-xl backdrop-blur-sm lg:p-8">
              <div className="mb-5 grid h-14 w-14 place-items-center rounded-xl bg-blue-50 text-[#102d57]">
                <GraduationCap size={32} />
              </div>
              <p className="font-serif text-2xl font-bold text-[#102d57]">
                Learn with purpose.
              </p>
              <p className="mt-2 leading-7 text-slate-600">
                {slide.label}
              </p>
              <div className="mt-6 h-px bg-slate-200" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Expert Learning Center
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={previousSlide}
          aria-label="Previous banner"
          className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/90 text-[#102d57] shadow-md transition hover:bg-white sm:grid"
        >
          <ChevronLeft size={23} />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next banner"
          className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white/90 text-[#102d57] shadow-md transition hover:bg-white sm:grid"
        >
          <ChevronRight size={23} />
        </button>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:grid-cols-3 lg:px-8">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-50 text-[#183d70]">
                <Icon size={24} />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-[#102d57]">
                  {title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="courses" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-800">
          Learning opportunities
        </p>
        <h2 className="mt-3 font-serif text-3xl font-bold text-[#102d57] sm:text-4xl">
          Explore Our Courses
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Course information will be published here once the institute's
          official programmes and details are confirmed.
        </p>
        <div className="mt-7 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
          Course listings are being prepared. Official course names, classes
          and descriptions will be added after confirmation.
        </div>
      </section>

      <section id="about" className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-2 md:items-center lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-800">
              About ELC
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-[#102d57] sm:text-4xl">
              A Place to Learn and Grow
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              This section will introduce Expert Learning Center, its teaching
              approach and facilities using information approved by the institute.
            </p>
          </div>
          <div className="flex min-h-56 items-center justify-center rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
            <div>
              <GraduationCap className="mx-auto text-[#183d70]" size={48} />
              <p className="mt-4 font-serif text-xl font-bold text-[#102d57]">
                Education. Effort. Progress.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Official institute introduction coming soon.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="announcements" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <h2 className="font-serif text-2xl font-bold text-[#102d57]">
          Announcements
        </h2>
        <p className="mt-2 leading-7 text-slate-600">
          Official notices will appear here when they are added by the institute.
        </p>
        <div className="mt-5 rounded-xl border border-slate-200 p-5 text-sm text-slate-600">
          No notices have been published yet.
        </div>
      </section>

      <footer id="contact" className="bg-[#102d57] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="font-serif text-xl font-bold">ELC</p>
            <p className="mt-1 text-sm text-blue-100">Expert Learning Center</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-blue-100">
            <a href="#home" className="hover:text-white">Home</a>
            <a href="#about" className="hover:text-white">About</a>
            <a href="#courses" className="hover:text-white">Courses</a>
            <Link to="/login" className="hover:text-white">Portal Login</Link>
          </div>
          <p className="text-xs text-blue-100">
            © {new Date().getFullYear()} Expert Learning Center
          </p>
        </div>
      </footer>
    </main>
  )
}

export default Home
