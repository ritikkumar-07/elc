
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  Image,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  UserRound,
  Users,
  X,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext.jsx'
import { apiRequest, setCsrfToken } from '../../lib/api.js'
import Footer from '../layout/Footer.jsx'
import './DashboardBorders.css'

const roleItems = {
  admin: [
    {
      section: 'MAIN',
      links: [
        ['Overview', '/admin', LayoutDashboard],
        ['Students', '/admin/students', Users],
        ['Teachers', '/admin/teachers', GraduationCap],
        ['Registration Approvals', '/admin/registrations', ClipboardCheck],
      ],
    },
    {
      section: 'ACADEMICS',
      links: [
        ['Classes & Subjects', '/admin/classes', BookOpen],
        ['Study Materials', '/admin/notes', FolderOpen],
        ['Tests & Papers', '/admin/tests', FileText],
        ['Results Analytics', '/admin/results', BarChart3],
        ['Attendance', '/admin/attendance', CalendarCheck],
        ['Announcements', '/admin/announcements', Megaphone],
      ],
    },
    {
      section: 'INSTITUTE',
      links: [
        ['Topper Management', '/admin/toppers', Award],
        ['Hero Banners', '/admin/hero-banners', Image],
      ],
    },
  ],
  teacher: [
    {
      section: 'MAIN',
      links: [
        ['Overview', '/teacher', LayoutDashboard],
        ['My Students', '/teacher/students', Users],
      ],
    },
    {
      section: 'ACADEMICS',
      links: [
        ['Study Materials', '/teacher/notes', FolderOpen],
        ['Tests & Results', '/teacher/tests', FileText],
        ['Results Analytics', '/teacher/results', BarChart3],
        ['Attendance', '/teacher/attendance', CalendarCheck],
        ['Announcements', '/teacher/announcements', Megaphone],
      ],
    },
  ],
  student: [
    {
      section: 'MAIN',
      links: [['Overview', '/student', LayoutDashboard]],
    },
    {
      section: 'LEARNING',
      links: [
        ['Class Notes', '/student/notes', FolderOpen],
        ['Tests', '/student/tests', FileText],
        ['My Results', '/student/results', BarChart3],
        ['Attendance', '/student/attendance', CalendarCheck],
      ],
    },
  ],
}

function Initials({ name }) {
  return (name || 'ELC')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export default function DashboardLayout({
  user,
  onLogout,
  children,
}) {
  const auth = useAuth()
  const currentUser = user || auth.user
  const layoutLogout = onLogout || auth.logout

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileMenu, setProfileMenu] = useState(false)
  const [modal, setModal] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const menuRef = useRef(null)

  const visibleItems = roleItems[currentUser?.role] || []

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setProfileMenu(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
        setProfileMenu(false)
        setModal(null)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  async function changePassword(event) {
    event.preventDefault()
    setPasswordMessage('')

    if (newPassword.length < 8 || newPassword.length > 72) {
      setPasswordMessage(
        'New password must be 8–72 characters.'
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match.')
      return
    }

    setSaving(true)

    try {
      const result = await apiRequest(
        '/api/v1/auth/change-password',
        {
          method: 'POST',
          body: { currentPassword, newPassword },
        },
      )

      setCsrfToken(result.csrfToken)
      setPasswordMessage('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPasswordMessage(
        error.message || 'Request failed.'
      )
    } finally {
      setSaving(false)
    }
  }

  const dashboardPath =
    currentUser?.role === 'teacher'
      ? '/teacher'
      : currentUser?.role === 'student'
        ? '/student'
        : '/admin'

  return (
    <div className="elc-layout flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[#19366e] focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#19366e]"
      >
        Skip to main content
      </a>

      {/* Shared ELC navbar */}
      <header className="sticky top-0 z-50 w-full shrink-0 border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex min-h-[72px] w-full items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 shrink items-center gap-2 sm:gap-3"
            aria-label="Expert Learning Center home"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#19366e] text-xl font-bold text-white sm:h-11 sm:w-11">
              E
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-900 sm:text-base">
                Expert Learning Center
              </span>
              <span className="hidden text-[11px] text-slate-500 sm:block">
                Learn Today. Lead Tomorrow.
              </span>
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Dashboard navigation"
          >
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Home
            </Link>

            <Link
              to={dashboardPath}
              aria-current="page"
              className="rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Dashboard
            </Link>
          </nav>

          {/* Authenticated account menu */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setProfileMenu((open) => !open)}
                aria-expanded={profileMenu}
                aria-haspopup="menu"
                className="flex min-h-10 items-center gap-1.5 rounded-full px-1 py-1 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:gap-2 sm:px-1.5"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-sm font-bold text-[#19366e]">
                  <Initials name={currentUser?.name} />
                </span>

                <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 sm:block">
                  {currentUser?.name || 'Account'}
                </span>

                <ChevronDown
                  aria-hidden="true"
                  className="mr-1 h-4 w-4 text-slate-500"
                />
              </button>

              {profileMenu && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-[80] mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-lg"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {currentUser?.name || 'ELC User'}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {currentUser?.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenu(false)
                      setModal('profile')
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <UserRound
                      className="h-4 w-4 text-slate-500"
                      aria-hidden="true"
                    />
                    My profile
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenu(false)
                      setPasswordMessage('')
                      setModal('password')
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <KeyRound
                      className="h-4 w-4 text-slate-500"
                      aria-hidden="true"
                    />
                    Change password
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenu(false)
                      layoutLogout?.()
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut
                      className="h-4 w-4 text-red-500"
                      aria-hidden="true"
                    />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Everything between navbar and footer */}
      <div className="flex w-full min-w-0 flex-1 items-stretch">
        {/* Mobile backdrop: starts below the navbar */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close dashboard navigation"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-x-0 bottom-0 top-[72px] z-30 bg-black/30 lg:hidden print:hidden"
          />
        )}

        {/* Dashboard sidebar */}
        <aside
          id="dashboard-sidebar"
          className={`fixed bottom-0 left-0 top-[72px] z-40 w-[min(82vw,300px)] overflow-y-auto border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out lg:sticky lg:bottom-auto lg:left-auto lg:top-0 lg:z-20 lg:h-[calc(100vh-72px)] lg:w-[240px] lg:shrink-0 lg:translate-x-0 lg:shadow-none print:hidden ${
              sidebarOpen ? 'translate-x-0'
              : '-translate-x-full'
          }`}
        >
          {/* Drawer heading, mobile only */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 lg:hidden">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Dashboard
            </span>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav
            className="px-3 py-4"
            aria-label="Institute dashboard sections"
          >
            {visibleItems.map((group) => (
              <div key={group.section} className="mb-5 last:mb-2">
                <p className="mb-1.5 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500">
                  {group.section}
                </p>

                <div className="space-y-0.5">
                  {group.links.map(([label, path, Icon]) => (
                    <NavLink
                      key={path}
                      to={path}
                      end={path === `/${currentUser?.role}`}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `group flex min-h-[40px] items-center gap-3 rounded-lg px-3 text-[13px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${
                          isActive
                            ? 'bg-blue-50 font-semibold text-[#19366e] shadow-[inset_3px_0_0_#19366e]'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            aria-hidden="true"
                            className={`h-4 w-4 shrink-0 ${
                              isActive
                                ? 'text-[#19366e]'
                                : 'text-slate-500 group-hover:text-slate-600'
                            }`}
                          />
                          <span className="truncate">{label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="mx-4 mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
            <p className="font-bold text-[#19366e]">
              Learn Today. Lead Tomorrow.
            </p>
            <p className="mt-1 text-slate-500">
              Expert Learning Center
            </p>
          </div>
        </aside>

        {/* Main dashboard area */}
        <div className="flex min-h-[calc(100vh-72px)] min-w-0 flex-1 flex-col bg-slate-50">
          {/* Mobile dashboard toolbar */}
          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 lg:hidden print:hidden">
            <button
              type="button"
              aria-label="Open dashboard navigation"
              aria-controls="dashboard-sidebar"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              Menu
            </button>

            <Link
              to="/"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              Home
            </Link>
          </div>

          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1700px] flex-1 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0"
          >
            {children}
          </main>
        </div>
      </div>

      {/* Shared public footer: full viewport width, below sidebar and content */}
      <div className="relative z-0 w-full shrink-0 print:hidden">
        <Footer />
      </div>

      {/* Profile and change-password modal */}
      {modal && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModal(null)
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="elc-modal-title"
            className="my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2
                id="elc-modal-title"
                className="text-xl font-bold"
              >
                {modal === 'profile'
                  ? 'My profile'
                  : 'Change password'}
              </h2>

              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setModal(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {modal === 'profile' ? (
              <div className="mt-5 space-y-3 text-sm">
                <p>
                  <span className="text-slate-500">Name:</span>{' '}
                  <strong>{currentUser?.name}</strong>
                </p>

                <p className="break-all">
                  <span className="text-slate-500">Email:</span>{' '}
                  {currentUser?.email}
                </p>

                <p>
                  <span className="text-slate-500">Role:</span>{' '}
                  {currentUser?.role}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setPasswordMessage('')
                    setModal('password')
                  }}
                  className="mt-3 w-full rounded-lg bg-[#5544bf] px-4 py-3 font-semibold text-white hover:bg-[#4535a8]"
                >
                  Change password
                </button>
              </div>
            ) : (
              <form
                onSubmit={changePassword}
                className="mt-5 space-y-4"
              >
                {[
                  [
                    'Current password',
                    currentPassword,
                    setCurrentPassword,
                    'current-password',
                  ],
                  [
                    'New password',
                    newPassword,
                    setNewPassword,
                    'new-password',
                  ],
                  [
                    'Confirm password',
                    confirmPassword,
                    setConfirmPassword,
                    'new-password',
                  ],
                ].map(([label, value, setter, auto], index) => (
                  <label
                    key={label}
                    className="block text-sm font-semibold text-slate-700"
                  >
                    {label}

                    <input
                      type="password"
                      required
                      autoComplete={auto}
                      minLength={index === 0 ? undefined : 8}
                      maxLength={72}
                      value={value}
                      onChange={(event) =>
                        setter(event.target.value)
                      }
                      className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-[#6657d9] focus:ring-2 focus:ring-violet-100"
                    />
                  </label>
                ))}

                {passwordMessage && (
                  <p
                    role="status"
                    className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700"
                  >
                    {passwordMessage}
                  </p>
                )}

                <button
                  disabled={saving}
                  type="submit"
                  className="w-full rounded-lg bg-[#5544bf] px-4 py-3 font-semibold text-white hover:bg-[#4535a8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Updating...' : 'Update password'}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
