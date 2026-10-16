import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Courses', href: '/#courses' },
  { label: 'About Us', href: '/#about' },
  { label: 'Announcements', href: '/#announcements' },
  { label: 'Toppers', href: '/#toppers' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <nav
        className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10"
        aria-label="Main navigation"
      >
        <Link
          to="/"
          onClick={closeMenu}
          className="flex min-w-0 items-center gap-3"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#19366e] font-serif text-xl font-bold text-white shadow-sm">
            E
          </span>

          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
              Expert Learning Center
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500 sm:text-xs">
              Learn Today. Lead Tomorrow.
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-5 xl:gap-7 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-[#19366e]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/login"
            onClick={closeMenu}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#19366e] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122951] focus:outline-none focus:ring-2 focus:ring-[#19366e] focus:ring-offset-2 sm:px-5"
          >
            Login <span aria-hidden="true">→</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#19366e] transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#19366e] lg:hidden"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-slate-100 bg-white px-4 pb-4 pt-2 shadow-lg lg:hidden sm:px-6"
        >
          <div className="mx-auto flex max-w-[1600px] flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={closeMenu}
                aria-current={
                  link.href === '/' && location.pathname === '/'
                    ? 'page'
                    : undefined
                }
                className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-[#19366e]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}