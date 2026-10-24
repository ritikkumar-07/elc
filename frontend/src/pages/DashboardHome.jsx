import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  Megaphone,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import {
  Badge,
  CompactStatCard,
  ErrorState,
  PageHeader,
  Panel,
  Skeleton,
} from '../components/common/DashboardUI.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest } from '../lib/api.js'

const quickActions = {
  admin: [
    {
      label: 'Review registrations',
      description: 'Approve or reject pending accounts',
      to: '/admin/registrations',
      icon: ClipboardCheck,
    },
    {
      label: 'Manage students',
      description: 'Profiles, classes, and account status',
      to: '/admin/students',
      icon: Users,
    },
    {
      label: 'Study materials',
      description: 'Upload and publish class resources',
      to: '/admin/notes',
      icon: FolderOpen,
    },
    {
      label: 'Tests & papers',
      description: 'Create assessments and enter marks',
      to: '/admin/tests',
      icon: FileText,
    },
    {
      label: 'Results analytics',
      description: 'Review performance and trends',
      to: '/admin/results',
      icon: BarChart3,
    },
  ],
  teacher: [
    {
      label: 'My students',
      description: 'View active students in your classes',
      to: '/teacher/students',
      icon: Users,
    },
    {
      label: 'Study materials',
      description: 'Upload resources for your classes',
      to: '/teacher/notes',
      icon: FolderOpen,
    },
    {
      label: 'Tests & results',
      description: 'Prepare tests and enter marks',
      to: '/teacher/tests',
      icon: FileText,
    },
    {
      label: 'Results analytics',
      description: 'Review class performance',
      to: '/teacher/results',
      icon: BarChart3,
    },
    {
      label: 'Mark attendance',
      description: 'Open the class attendance workspace',
      to: '/teacher/attendance',
      icon: CalendarCheck,
    },
  ],
  student: [
    {
      label: 'Class notes',
      description: 'Open published study materials',
      to: '/student/notes',
      icon: BookOpen,
    },
    {
      label: 'Upcoming tests',
      description: 'Review your assessment schedule',
      to: '/student/tests',
      icon: FileText,
    },
    {
      label: 'My results',
      description: 'See published marks and progress',
      to: '/student/results',
      icon: BarChart3,
    },
    {
      label: 'My attendance',
      description: 'Review your attendance history',
      to: '/student/attendance',
      icon: CalendarCheck,
    },
  ],
}

const activityLabels = {
  'account.password.changed': 'Password changed',
  'announcement.created': 'Announcement created',
  'announcement.updated': 'Announcement updated',
  'announcement.deleted': 'Announcement removed',
  'attendance.batch_saved': 'Attendance updated',
  'attendance.class_marked': 'Class attendance marked',
  'attendance.saved': 'Attendance saved',
  'marks.saved': 'Marks saved',
  'material.created': 'Study material added',
  'material.updated': 'Study material updated',
  'material.deleted': 'Study material removed',
  'registration.approved': 'Registration approved',
  'registration.rejected': 'Registration rejected',
  'results.published': 'Results published',
  'results.unpublished': 'Results unpublished',
  'test.created': 'Test created',
  'test.updated': 'Test updated',
  'test.deleted': 'Test removed',
  'topper.created': 'Topper added',
  'topper.updated': 'Topper updated',
  'topper.deleted': 'Topper removed',
  'user.created': 'Account created',
  'user.status.changed': 'Account status changed',
  'user.updated': 'Account updated',
}

function formatDate(value) {
  if (!value) return 'Not scheduled'

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDateTime(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function activityLabel(action) {
  if (activityLabels[action]) return activityLabels[action]

  return String(action || 'Administrative activity')
    .replaceAll('.', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function EmptyRow({ children }) {
  return (
    <p className="px-4 py-6 text-sm text-slate-500 sm:px-5">
      {children}
    </p>
  )
}

function QuickActions({ role }) {
  const items = quickActions[role] || []

  return (
    <Panel
      title="Quick access"
      description="Frequently used areas of your workspace."
      icon={Sparkles}
      bodyClassName="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-5"
    >
      {items.map((item) => {
        const Icon = item.icon

        return (
          <Link
            key={item.to}
            to={item.to}
            className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-white group-hover:text-[#19366e]"
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold text-slate-900">
                {item.label}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[11px] leading-4 text-slate-500">
                {item.description}
              </span>
            </span>
          </Link>
        )
      })}
    </Panel>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-6 w-14" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
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
  const role = user?.role

  const metricCards =
    role === 'admin'
      ? [
          {
            label: 'Active students',
            value: stats.activeStudents,
            icon: Users,
            tone: 'teal',
            hint: 'Approved student accounts',
            to: '/admin/students',
          },
          {
            label: 'Active teachers',
            value: stats.activeTeachers,
            icon: GraduationCap,
            tone: 'indigo',
            hint: 'Approved teacher accounts',
            to: '/admin/teachers',
          },
          {
            label: 'Pending approvals',
            value: stats.pendingRegistrations,
            icon: UserCheck,
            tone: 'amber',
            hint: 'Registrations awaiting review',
            to: '/admin/registrations',
            alert: Number(stats.pendingRegistrations || 0) > 0,
          },
          {
            label: 'Active classes',
            value: stats.classes,
            icon: BookOpen,
            tone: 'navy',
            hint: 'Current active class groups',
            to: '/admin/classes',
          },
        ]
      : role === 'teacher'
        ? [
            {
              label: 'Assigned classes',
              value: stats.assignedClasses,
              icon: BookOpen,
              tone: 'navy',
              hint: 'Classes linked to your account',
              to: '/teacher/students',
            },
            {
              label: 'Active students',
              value: stats.activeStudents,
              icon: Users,
              tone: 'teal',
              hint: 'Students in your classes',
              to: '/teacher/students',
            },
            {
              label: 'Study materials',
              value: stats.materials,
              icon: FolderOpen,
              tone: 'indigo',
              hint: 'Uploaded resources',
              to: '/teacher/notes',
            },
            {
              label: 'Published results',
              value: stats.publishedResults,
              icon: BarChart3,
              tone: 'amber',
              hint: 'Result records visible to students',
              to: '/teacher/results',
            },
          ]
        : [
            {
              label: 'Study materials',
              value: stats.materials,
              icon: BookOpen,
              tone: 'indigo',
              hint: 'Resources for your class',
              to: '/student/notes',
            },
            {
              label: 'Tests',
              value: stats.tests,
              icon: FileText,
              tone: 'navy',
              hint: 'Published and completed tests',
              to: '/student/tests',
            },
            {
              label: 'Average result',
              value:
                stats.averageResult != null
                  ? `${stats.averageResult}%`
                  : '—',
              icon: Award,
              tone: 'teal',
              hint:
                stats.bestResult != null
                  ? `Best ${stats.bestResult}% across published results`
                  : 'Across published results',
              to: '/student/results',
            },
            {
              label: 'Attendance',
              value:
                data?.attendance?.percentage != null
                  ? `${data.attendance.percentage}%`
                  : '—',
              icon: CalendarCheck,
              tone: 'amber',
              hint: 'Present, late, and excused',
              to: '/student/attendance',
            },
          ]

  const recentActivity = data?.recentActivity || []

  return (
    <DashboardLayout
      title="Dashboard"
      description={`${roleLabel} workspace`}
      user={user}
      onLogout={logout}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow={roleLabel}
          title={`Welcome, ${firstName}.`}
          description="Your academic workspace is connected to live institute records."
          action={
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
              <span
                className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-[#19366e]"
                aria-hidden="true"
              >
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Today
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-800 sm:text-sm">
                  {date}
                </p>
              </div>
            </div>
          }
        />

        {loading && <DashboardSkeleton />}

        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        )}

        {!loading && !error && data && (
          <>
            <section
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Workspace summary"
            >
              {metricCards.map((card) => (
                <CompactStatCard key={card.label} {...card} />
              ))}
            </section>

            <QuickActions role={role} />

            <div className="grid items-start gap-5 xl:grid-cols-2">
              <Panel
                title="Upcoming tests"
                description="Published assessments for your portal."
                icon={CalendarCheck}
                action={
                  <Link
                    to={
                      role === 'admin'
                        ? '/admin/tests'
                        : role === 'teacher'
                          ? '/teacher/tests'
                          : '/student/tests'
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#19366e] hover:underline"
                  >
                    View all
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                }
              >
                {data.upcomingTests?.length ? (
                  <div className="divide-y divide-slate-100">
                    {data.upcomingTests.map((test) => (
                      <div
                        key={test._id || test.id}
                        className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5"
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
              </Panel>

              {role === 'admin' ? (
                <Panel
                  title="Pending registrations"
                  description="New accounts awaiting an approval decision."
                  icon={UserCheck}
                  action={
                    <Link
                      to="/admin/registrations"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#19366e] hover:underline"
                    >
                      Review
                      <ArrowRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </Link>
                  }
                >
                  {data.recentRegistrations?.length ? (
                    <div className="divide-y divide-slate-100">
                      {data.recentRegistrations.map((item) => (
                        <div
                          key={item._id}
                          className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {item.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {item.email}
                            </p>
                          </div>
                          <Badge tone="amber">{item.role}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyRow>No pending registrations.</EmptyRow>
                  )}
                </Panel>
              ) : (
                <Panel
                  title={
                    role === 'teacher'
                      ? 'Assigned classes'
                      : 'My class'
                  }
                  description={
                    role === 'teacher'
                      ? 'Classes linked to your teaching account.'
                      : 'Your current academic placement.'
                  }
                  icon={BookOpen}
                >
                  {role === 'student' ? (
                    <div className="space-y-4 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
                          {data.class
                            ? [data.class.name, data.class.section]
                                .filter(Boolean)
                                .join(' - ')
                            : 'No class assigned'}
                        </span>
                        {data.class?.academicYear && (
                          <span className="text-xs text-slate-500">
                            {data.class.academicYear}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[11px] text-slate-500">
                            Attendance
                          </p>
                          <p className="mt-0.5 text-base font-bold text-slate-900">
                            {data.attendance?.percentage != null
                              ? `${data.attendance.percentage}%`
                              : 'Not marked'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">
                            Days recorded
                          </p>
                          <p className="mt-0.5 text-base font-bold text-slate-900">
                            {data.attendance?.totalDays ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500">
                            Announcements
                          </p>
                          <p className="mt-0.5 text-base font-bold text-slate-900">
                            {stats.announcements ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : data.classes?.length ? (
                    <div className="flex flex-wrap gap-2 p-4 sm:p-5">
                      {data.classes.map((item) => (
                        <span
                          key={item._id || item.id}
                          className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900"
                        >
                          {[item.name, item.section]
                            .filter(Boolean)
                            .join(' - ')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <EmptyRow>
                      No classes are assigned to your account yet.
                    </EmptyRow>
                  )}
                </Panel>
              )}

              {role === 'admin' && (
                <Panel
                  title="Recent administrative activity"
                  description="Latest recorded changes from the audit trail."
                  icon={Activity}
                >
                  {recentActivity.length ? (
                    <div className="divide-y divide-slate-100">
                      {recentActivity.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {activityLabel(entry.action)}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {entry.actor?.name ||
                                entry.actorRole ||
                                'System'}
                              {entry.targetType
                                ? ` · ${entry.targetType.replaceAll('.', ' ')}`
                                : ''}
                            </p>
                          </div>
                          <p className="shrink-0 text-xs text-slate-500">
                            {formatDateTime(entry.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyRow>
                      No administrative activity has been recorded yet.
                    </EmptyRow>
                  )}
                </Panel>
              )}

              <Panel
                title="Recent announcements"
                description="Latest updates published for your portal."
                icon={Megaphone}
              >
                {data.recentAnnouncements?.length ? (
                  <div className="divide-y divide-slate-100">
                    {data.recentAnnouncements.map((item) => (
                      <div
                        key={item._id}
                        className="px-4 py-3.5 sm:px-5"
                      >
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
              </Panel>

              {role === 'student' && (
                <Panel
                  title="Recent results"
                  description="Your latest published marks."
                  icon={BarChart3}
                  action={
                    <Link
                      to="/student/results"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#19366e] hover:underline"
                    >
                      View all
                      <ArrowRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </Link>
                  }
                >
                  {data.recentResults?.length ? (
                    <div className="divide-y divide-slate-100">
                      {data.recentResults.map((result) => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
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
                                {result.marksObtained}/{result.maxMarks} (
                                {result.percentage}%)
                              </p>
                            ) : (
                              <p className="text-xs font-semibold capitalize text-amber-700">
                                {String(
                                  result.assessmentStatus ||
                                    'not entered',
                                ).replaceAll('_', ' ')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyRow>No published results yet.</EmptyRow>
                  )}
                </Panel>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
