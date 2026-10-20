
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext.jsx'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Courses', href: '/#courses' },
  { label: 'About Us', href: '/#about' },
  { label: 'Announcements', href: '/#announcements' },
  { label: 'Toppers', href: '/#toppers' },
]

const dashboardRoutes = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
}

export default function Navbar() {
  const { user, loading: sessionLoading, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const profileRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function closeProfile(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false)
      }
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setProfileOpen(false)
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeProfile)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeProfile)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const role = String(user?.role || '').toLowerCase()
  const dashboardPath = dashboardRoutes[role]

  const displayName =
    user?.name?.trim()?.split(/\s+/)[0] || 'Account'

  const initial = displayName.charAt(0).toUpperCase()

  async function handleLogout() {
    await logout()
    setProfileOpen(false)
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
      <nav
        aria-label="Main navigation"
        className="flex min-h-[72px] w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-10"
      >
        {/* LEFT: ELC BRANDING */}
        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center gap-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#19366e] font-serif text-xl font-bold text-white">
            E
          </span>

          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold text-slate-900 sm:text-lg">
              Expert Learning Center
            </span>

            <span className="block text-[11px] text-slate-500 sm:text-xs">
              Learn Today. Lead Tomorrow.
            </span>
          </span>
        </Link>

        {/* CENTRE: NAVIGATION */}
        <div className="hidden items-center gap-5 lg:flex xl:gap-7">
          {navLinks.map((link, index) => (
            <ReactNavLink
              key={link.label}
              href={link.href}
              label={link.label}
              index={index}
            />
          ))}

          {/* Dashboard is a simple text link, like Home */}
          {!sessionLoading && dashboardPath && (
            <Link
              to={dashboardPath}
              className="whitespace-nowrap text-sm font-medium text-slate-700 transition-colors hover:text-[#19366e] focus:outline-none focus:underline"
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* RIGHT: LOGIN OR USER PROFILE */}
        <div className="flex shrink-0 items-center gap-3">
          {!sessionLoading && !user && (
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#19366e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#122951] sm:px-5"
            >
              Login <span aria-hidden="true">→</span>
            </Link>
          )}

          {!sessionLoading && user && (
            <div ref={profileRef} className="relative">
              <button
                type="button"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                onClick={() => setProfileOpen((value) => !value)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-800 transition-colors hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#19366e] text-sm font-bold text-white">
                  {initial}
                </span>

                <span className="hidden text-sm font-medium sm:block">
                  {displayName}
                </span>

                <span className="text-xs text-slate-500">
                  {profileOpen ? '▲' : '▼'}
                </span>
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-lg"
                >
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="truncate text-sm font-semibold">
                      {user.name}
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>

                  {dashboardPath && (
                    <Link
                      role="menuitem"
                      to={dashboardPath}
                      onClick={() => setProfileOpen(false)}
                      className="mt-1 block rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50"
                    >
                      Dashboard
                    </Link>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MOBILE MENU */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-xl text-[#19366e] hover:bg-slate-50 lg:hidden"
          >
            {menuOpen ? '×' : '☰'}
          </button>
        </div>
      </nav>

      {/* MOBILE NAVIGATION */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}

            {!sessionLoading && dashboardPath && (
              <Link
                to={dashboardPath}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Dashboard
              </Link>
            )}

            {!sessionLoading && !user && (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="mt-1 rounded-lg bg-[#19366e] px-3 py-3 text-center text-sm font-semibold text-white"
              >
                Login →
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

function ReactNavLink({ href, label }) {
  return (
    <a
      href={href}
      className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors hover:text-[#19366e] focus:outline-none focus:underline"
    >
      {label}
    </a>
  )
}
