
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import HeroBannerManager from '../components/dashboard/HeroBannerManager.jsx'
import Hero from '../components/home/Hero.jsx'
import { apiRequest } from '../lib/api.js'

const roleConfig = {
  admin: {
    label: 'Director / Admin',
    heading: 'Institute overview',
    description: 'Manage your institute and keep academic operations organised.',
    modules: [
      { icon: '♙', title: 'Students', description: 'Student records and academic information', path: '/admin/students' },
      { icon: '✓', title: 'Registration Approvals', description: 'Approve or reject pending student and teacher accounts', path: '/admin/registrations' },
      { icon: '▤', title: 'Study materials', description: 'Class notes, resources and previous papers', path: '/admin/notes' },
      { icon: '✓', title: 'Tests & results', description: 'Assessments, marks and academic performance', path: '/admin/tests' },
      { icon: '◷', title: 'Attendance', description: 'Attendance records and class reports', path: '/admin/attendance' },
    ],
    tasks: [
      { number: '01', title: 'Review registrations', detail: 'Approve or reject pending student and teacher accounts.', path: '/admin/registrations', icon: '✓' },
      { number: '02', title: 'Publish study materials', detail: 'Organise notes by class and subject.', path: '/admin/notes', icon: '▤' },
      { number: '03', title: 'Prepare assessments', detail: 'Organise tests and previous question papers.', path: '/admin/tests', icon: '✓' },
      { number: '04', title: 'Manage student achievements', detail: 'Update the public toppers section.', path: '/demo/toppers', icon: '☆' },
    ],
  },
  teacher: {
    label: 'Teacher',
    heading: 'Teaching overview',
    description: 'Organise classroom resources and support student progress.',
    modules: [
      { icon: '▤', title: 'Study materials', description: 'Resources for assigned classes', path: '/teacher/notes' },
      { icon: '✓', title: 'Tests & results', description: 'Assessments and student performance', path: '/teacher/tests' },
      { icon: '◷', title: 'Attendance', description: 'Class attendance records', path: '/teacher/attendance' },
      { icon: '♙', title: 'Students', description: 'Student learning progress', path: '/teacher/students' },
    ],
    tasks: [
      { number: '01', title: 'Prepare class notes', detail: 'Organise resources for your assigned classes.', path: '/teacher/notes', icon: '▤' },
      { number: '02', title: 'Plan assessments', detail: 'Prepare tests and question papers.', path: '/teacher/tests', icon: '✓' },
      { number: '03', title: 'Review attendance', detail: 'Keep classroom attendance organised.', path: '/teacher/attendance', icon: '◷' },
      { number: '04', title: 'Review student progress', detail: 'Identify learning gaps from academic results.', path: '/teacher/results', icon: '↗' },
    ],
  },
  student: {
    label: 'Student',
    heading: 'My learning overview',
    description: 'Your learning resources and academic information in one place.',
    modules: [
      { icon: '▤', title: 'Class notes', description: 'Resources for your assigned class', path: '/student/notes' },
      { icon: '◷', title: 'Upcoming tests', description: 'Assessment schedule', path: '/student/tests' },
      { icon: '↗', title: 'My results', description: 'Marks and academic progress', path: '/student/results' },
      { icon: '✓', title: 'Attendance', description: 'Your attendance record', path: '/student/attendance' },
    ],
    tasks: [
      { number: '01', title: 'Explore class notes', detail: 'Review resources shared by your teachers.', path: '/student/notes', icon: '▤' },
      { number: '02', title: 'Prepare for tests', detail: 'Stay organised with your assessments.', path: '/student/tests', icon: '✓' },
      { number: '03', title: 'Review your results', detail: 'Track marks and identify areas to improve.', path: '/student/results', icon: '↗' },
      { number: '04', title: 'Check attendance', detail: 'Review your attendance record.', path: '/student/attendance', icon: '◷' },
    ],
  },
}

const adminModuleConfig = {
  students: {
    title: 'Student Management',
    description: 'Manage student registrations and academic records.',
    nextStep: 'Student records and approval APIs need to be implemented.',
  },
  teachers: {
    title: 'Teacher Management',
    description: 'Manage teacher accounts and approval status.',
    nextStep: 'Teacher management APIs and approval workflows need to be implemented.',
  },
  classes: {
    title: 'Classes & Subjects',
    description: 'Organise classes, subjects and assignments.',
    nextStep: 'Class and subject models and APIs need to be implemented.',
  },
  notes: {
    title: 'Study Materials',
    description: 'Manage notes, resources and previous question papers.',
    nextStep: 'File storage and study-material APIs need to be implemented.',
  },
  tests: {
    title: 'Tests & Papers',
    description: 'Organise assessments and question papers.',
    nextStep: 'Assessment models and APIs need to be implemented.',
  },
  results: {
    title: 'Results',
    description: 'Review marks and academic performance.',
    nextStep: 'Marks entry and results APIs need to be implemented.',
  },
  attendance: {
    title: 'Attendance',
    description: 'Manage classroom attendance and reports.',
    nextStep: 'Attendance models and APIs need to be implemented.',
  },
  announcements: {
    title: 'Announcements',
    description: 'Prepare institute announcements for students and teachers.',
    nextStep: 'Announcement management and publishing APIs need to be implemented.',
  },
}

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-blue-800">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

function MetricCard({ icon, label, description }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-lg text-blue-900 ring-1 ring-slate-200">
          {icon}
        </span>
        <span className="text-2xl font-semibold tracking-tight text-slate-400">
          —
        </span>
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-900">{label}</h3>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
      <p className="mt-3 text-[10px] font-medium text-slate-400">
        Awaiting data connection
      </p>
    </article>
  )
}

function TaskRow({ task }) {
  return (
    <Link
      to={task.path}
      className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-lg text-blue-900 transition group-hover:border-blue-200 group-hover:bg-blue-50">
        {task.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800 group-hover:text-blue-900">
          {task.title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {task.detail}
        </span>
      </span>

      <span className="text-lg text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-800">
        ›
      </span>
    </Link>
  )
}

function AccountPanel({ user, roleLabel }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">Account information</h2>
        <p className="mt-1 text-xs text-slate-500">Your signed-in account details.</p>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-900">
            {(user.name || 'ELC')
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join('')
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
            <p className="mt-1 break-all text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="my-5 border-t border-slate-100" />

        <dl className="space-y-4">
          <div>
            <dt className="text-xs text-slate-500">Account role</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">{roleLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Account status</dt>
            <dd className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Active session
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f7fa] p-6">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-800" />
        <p className="mt-4 text-sm font-semibold text-slate-700">
          Verifying your ELC session...
        </p>
      </div>
    </main>
  )
}

export default function RoleDashboard({ expectedRole, section }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  function retrySession() {
    setLoading(true)
    setError('')
    setRetryCount((count) => count + 1)
  }

  useEffect(() => {
    const controller = new AbortController()

    async function verifySession() {
      try {
        const result = await apiRequest('/api/v1/auth/me', {
          signal: controller.signal,
          skipAuthEvent: true,
        })

        if (!result.success || !result.user) {
          throw new Error('The server returned an invalid session response.')
        }

        if (!roleConfig[result.user.role]) {
          throw new Error('This account has an unsupported role.')
        }

        if (result.user.role !== expectedRole) {
          const paths = {
            admin: '/admin',
            teacher: '/teacher',
            student: '/student',
          }
          navigate(paths[result.user.role] || '/login', { replace: true })
          return
        }

        setUser(result.user)
      } catch (err) {
        if (err.name === 'AbortError') return

        if (err.status === 401) {
          setUser(null)
          navigate('/login', { replace: true })
          return
        }

        setError(
          err.message || 'Unable to verify your session.',
        )
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    verifySession()

    return () => controller.abort()
  }, [expectedRole, navigate, retryCount])

  async function handleLogout() {
    try {
      await apiRequest('/api/v1/auth/logout', {
        method: 'POST',
        skipAuthEvent: true,
      })
    } catch {
      // Navigate away even if the backend is temporarily unavailable.
    } finally {
      setUser(null)
      navigate('/login', { replace: true })
    }
  }

  if (loading && !user) return <LoadingScreen />

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f7fa] p-5">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-800">
            Expert Learning Center
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            Dashboard unavailable
          </h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-slate-600">
            {error || 'Your session could not be verified.'}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={retrySession}
              className="rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Login
            </button>
          </div>
        </section>
      </main>
    )
  }

  const config = roleConfig[user.role]
  const firstName = user.name?.trim().split(/\s+/)[0] || 'there'
  const date = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  if (section === 'hero-banners') {
    if (user.role !== 'admin') {
      return <main className="grid min-h-screen place-items-center p-6"><section className="rounded-xl border border-slate-200 bg-white p-6"><h1 className="text-xl font-bold">Access denied</h1><p className="mt-2 text-sm text-slate-600">Only institute administrators can manage homepage banners.</p><Link className="mt-4 inline-block text-blue-800 underline" to="/">Return to dashboard</Link></section></main>
    }
    return <DashboardLayout title="Hero Banner Management" description="Manage the slides displayed on the public homepage." user={user} onLogout={handleLogout}><HeroBannerManager /></DashboardLayout>
  }

  if (section && adminModuleConfig[section]) {
    const module = adminModuleConfig[section]

    return (
      <DashboardLayout
        title={module.title}
        description={module.description}
        user={user}
        onLogout={handleLogout}
        activePath={`/admin/${section}`}
      >
        <section className="rounded-xl border border-amber-200 bg-white p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Admin module
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            {module.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This module has a route, but its functionality is not implemented yet.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {module.nextStep}
          </p>
        </section>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title={config.heading}
      description={config.description}
      user={user}
      onLogout={handleLogout}
      activePath="/admin"
    >
      <div className="space-y-8">
        {/* The same managed 5-second hero carousel shown on the public homepage. */}
        <Hero variant="dashboard" canManageBanners={user.role === 'admin'} />

        {/* Compact welcome header */}
        <section className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
          <div>


            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Welcome , {firstName}.
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {config.description}
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              TODAY
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{date}</p>
          </div>
        </section>

        {/* Institute metrics */}
        <section>
          <SectionTitle
            eyebrow="AT A GLANCE"
            title={config.heading}
            description="A quick view of the main academic areas."
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {config.modules.map((module) => (
              <Link
                key={module.title}
                to={module.path}
                className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <MetricCard
                  icon={module.icon}
                  label={module.title}
                  description={module.description}
                />
              </Link>
            ))}
          </div>
        </section>

        {/* Operations and account information */}
        <section className="grid items-start gap-6 xl:grid-cols-[1.45fr_0.75fr]">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Quick access
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Frequently used areas of your workspace.
                </p>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                {config.tasks.length} shortcuts
              </span>
            </div>

            <div className="divide-y divide-slate-100 px-2 py-2">
              {config.tasks.map((task) => (
                <TaskRow key={task.number} task={task} />
              ))}
            </div>
          </div>

          <AccountPanel user={user} roleLabel={config.label} />
        </section>

        {/* Institute note */}
        {/* <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-lg text-blue-900">
              E
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Expert Learning Center
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Learn Today. Lead Tomorrow. Your academic workspace, in one place.
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900"
          >
            Visit public website ↗
          </Link>
        </section> */}
      </div>
    </DashboardLayout>
  )
}
