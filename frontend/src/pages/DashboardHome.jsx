import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import {
  cardClass,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
} from '../components/common/DashboardUI.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest } from '../lib/api.js'

const quickLinks = {
  admin: [
    ['Review registrations', '/admin/registrations'],
    ['Manage students', '/admin/students'],
    ['Publish study material', '/admin/notes'],
    ['Prepare a test', '/admin/tests'],
    ['Results analytics', '/admin/results'],
  ],
  teacher: [
    ['My students', '/teacher/students'],
    ['Upload study material', '/teacher/notes'],
    ['Manage tests', '/teacher/tests'],
    ['Results analytics', '/teacher/results'],
    ['Mark attendance', '/teacher/attendance'],
  ],
  student: [
    ['Class notes', '/student/notes'],
    ['Upcoming tests', '/student/tests'],
    ['My results', '/student/results'],
    ['My attendance', '/student/attendance'],
  ],
}

function formatDate(value) {
  if (!value) return 'Not scheduled'

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function ListCard({ title, description, children }) {
  return (
    <section className={cardClass}>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

function EmptyRow({ children }) {
  return (
    <p className="px-5 py-6 text-sm text-slate-500">{children}</p>
  )
}

export default function DashboardHome() {
  const { user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const result = await apiRequest('/api/v1/dashboard', {
          signal: controller.signal,
        })
        setData(result.data)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load your dashboard.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadDashboard()

    return () => controller.abort()
  }, [reloadKey])

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there'
  const roleLabel =
    user?.role === 'admin'
      ? 'Director / Administrator'
      : user?.role === 'teacher'
        ? 'Teacher'
        : 'Student'

  const date = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const stats = data?.stats || {}

  const metricCards =
    user?.role === 'admin'
      ? [
          ['Active students', stats.activeStudents, '♙', 'Approved student accounts'],
          ['Active teachers', stats.activeTeachers, '♧', 'Approved teacher accounts'],
          ['Pending approvals', stats.pendingRegistrations, '✓', 'Registrations awaiting review'],
          ['Active classes', stats.classes, '▤', 'Current class groups'],
        ]
      : user?.role === 'teacher'
        ? [
            ['Assigned classes', stats.assignedClasses, '▤', 'Classes linked to your account'],
            ['Active students', stats.activeStudents, '♙', 'Students in your classes'],
            ['Study materials', stats.materials, '▧', 'Uploaded resources'],
            ['Published results', stats.publishedResults, '↗', 'Result records visible to students'],
          ]
        : [
            ['Study materials', stats.materials, '▧', 'Resources for your class'],
            ['Tests', stats.tests, '✓', 'Published and completed tests'],
            ['Average result', stats.averageResult != null ? `${stats.averageResult}%` : '—', '↗', stats.bestResult != null ? `Best ${stats.bestResult}% across published results` : 'Across published results'],
            ['Attendance', data?.attendance?.percentage != null ? `${data.attendance.percentage}%` : '—', '◷', 'Present, late, and excused'],
          ]

  return (
    <DashboardLayout
      title="Dashboard"
      description={`${roleLabel} workspace`}
      user={user}
      onLogout={logout}
    >
      <div className="space-y-7">
        <PageHeader
          eyebrow={roleLabel}
          title={`Welcome, ${firstName}.`}
          description="Your academic workspace is connected to live institute records."
          action={
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Today
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {date}
              </p>
            </div>
          }
        />

        {loading && <LoadingState label="Loading dashboard..." />}

        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        )}

        {!loading && !error && data && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map(([label, value, icon, hint]) => (
                <StatCard
                  key={label}
                  label={label}
                  value={value ?? 0}
                  icon={icon}
                  hint={hint}
                />
              ))}
            </section>

            {user?.role === 'student' && (
              <section className={cardClass}>
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      My class
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Your current academic placement.
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                    {data.class
                      ? [data.class.name, data.class.section]
                          .filter(Boolean)
                          .join(' - ')
                      : 'No class assigned'}
                  </span>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Attendance</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {data.attendance?.percentage != null
                        ? `${data.attendance.percentage}%`
                        : 'Not marked'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Days recorded</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {data.attendance?.totalDays ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Announcements</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {stats.announcements ?? 0}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {user?.role === 'teacher' && data.classes?.length > 0 && (
              <section className={cardClass}>
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Assigned classes
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2 p-5">
                  {data.classes.map((item) => (
                    <span
                      key={item._id || item.id}
                      className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800"
                    >
                      {[item.name, item.section]
                        .filter(Boolean)
                        .join(' - ')}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="grid items-start gap-6 xl:grid-cols-2">
              <ListCard
                title="Quick access"
                description="Frequently used areas of your workspace."
              >
                <div className="divide-y divide-slate-100 px-2 py-2">
                  {(quickLinks[user?.role] || []).map(
                    ([label, path]) => (
                      <Link
                        key={path}
                        to={path}
                        className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-blue-900"
                      >
                        <span>{label}</span>
                        <span aria-hidden="true" className="text-slate-400">
                          ›
                        </span>
                      </Link>
                    ),
                  )}
                </div>
              </ListCard>

              <ListCard
                title="Upcoming tests"
                description="Published assessments for your portal."
              >
                {data.upcomingTests?.length ? (
                  <div className="divide-y divide-slate-100">
                    {data.upcomingTests.map((test) => (
                      <div
                        key={test._id || test.id}
                        className="flex items-start justify-between gap-3 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {test.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {test.class?.name
                              ? [test.class.name, test.class.section]
                                  .filter(Boolean)
                                  .join(' - ')
                              : test.subject?.name || 'Class test'}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs font-medium text-slate-500">
                          {formatDate(test.scheduledAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyRow>No upcoming tests are published.</EmptyRow>
                )}
              </ListCard>

              {user?.role === 'admin' && (
                <ListCard
                  title="Pending registrations"
                  description="New accounts awaiting an approval decision."
                >
                  {data.recentRegistrations?.length ? (
                    <div className="divide-y divide-slate-100">
                      {data.recentRegistrations.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between gap-3 px-5 py-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {item.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {item.email}
                            </p>
                          </div>
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-amber-800">
                            {item.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyRow>No pending registrations.</EmptyRow>
                  )}
                </ListCard>
              )}

              <ListCard
                title="Recent announcements"
                description="Latest updates published for your portal."
              >
                {data.recentAnnouncements?.length ? (
                  <div className="divide-y divide-slate-100">
                    {data.recentAnnouncements.map((item) => (
                      <div key={item._id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {item.title}
                          </p>
                          <p className="shrink-0 text-xs text-slate-500">
                            {formatDate(item.publishAt || item.createdAt)}
                          </p>
                        </div>
                        {item.content && (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {item.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyRow>No announcements have been published.</EmptyRow>
                )}
              </ListCard>

              {user?.role === 'student' && (
                <ListCard
                  title="Recent results"
                  description="Your latest published marks."
                >
                  {data.recentResults?.length ? (
                    <div className="divide-y divide-slate-100">
                      {data.recentResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between gap-3 px-5 py-4"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {result.test?.title || 'Test result'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDate(result.publishedAt)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            {result.assessmentStatus === 'entered' ? (
                              <p className="text-sm font-bold text-blue-900">
                                {result.marksObtained}/{result.maxMarks} ({result.percentage}%)
                              </p>
                            ) : (
                              <p className="text-xs font-semibold capitalize text-amber-700">
                                {String(result.assessmentStatus || 'not entered').replaceAll('_', ' ')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyRow>No published results yet.</EmptyRow>
                  )}
                </ListCard>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
