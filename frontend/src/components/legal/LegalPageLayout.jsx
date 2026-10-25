import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatSiteLastUpdated } from '../../config/institute.js'
import Footer from '../layout/Footer.jsx'
import Navbar from '../layout/Navbar.jsx'

export function LegalPlaceholder({ children }) {
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-950">
      [{children || 'To be confirmed by ELC'}]
    </span>
  )
}

export function LegalSection({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28">
      <h2
        id={`${id}-heading`}
        className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
      >
        {title}
      </h2>
      <div className="mt-3 space-y-4 text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
        {children}
      </div>
    </section>
  )
}

export default function LegalPageLayout({
  title,
  description,
  lastUpdated,
  sections,
  children,
}) {
  const formattedDate = formatSiteLastUpdated(lastUpdated)

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 bg-[#f6f8fc]"
    >
        <header className="border-b border-slate-200 bg-white px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded text-sm font-semibold text-[#19366e] transition-colors hover:text-[#102d59] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to home
            </Link>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-blue-800">
              Legal information
            </p>

            <h1 className="mt-3 max-w-3xl font-serif text-3xl font-bold leading-tight tracking-tight text-[#102d59] sm:text-4xl lg:text-5xl">
              {title}
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              {description}
            </p>

            {formattedDate && (
              <p className="mt-5 text-sm text-slate-500">
                Last updated:{' '}
                <time dateTime={lastUpdated}>{formattedDate}</time>
              </p>
            )}
          </div>
        </header>

        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          <aside>
            <nav
              aria-label="On this page"
              className="rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-28"
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                On this page
              </p>

              <ul className="mt-3 space-y-0.5">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="flex min-h-9 items-center rounded-lg px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-blue-50 hover:text-[#19366e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e]"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-start gap-2.5 text-sm leading-6 text-amber-950">
                <ShieldCheck
                  size={18}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                />
                <span>
                  <strong>Draft for institute review.</strong> Items marked as
                  placeholders require confirmation by Expert Learning Center
                  and review under applicable law. This page describes current
                  website and portal practices; it is not legal advice.
                </span>
              </p>
            </div>

            <div className="space-y-9">{children}</div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  )
}
