
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'

const navigationLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Courses', href: '#courses' },
  { label: 'Announcements', href: '#announcements' },
  { label: 'Contact', href: '#contact' },
]

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
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
          {navigationLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={
                item.label === 'Home'
                  ? 'text-[#102d57]'
                  : 'transition hover:text-blue-700'
              }
            >
              {item.label}
            </a>
          ))}
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
            {navigationLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-3 font-medium hover:bg-slate-50"
              >
                {item.label}
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
  )
}

export default Navbar
