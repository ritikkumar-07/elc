
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const API_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
).replace(/\/+$/, '')

export default function RegistrationApprovals() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const [admin, setAdmin] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('all')
  const [reloadKey, setReloadKey] = useState(0)

  function refreshRegistrations() {
    setLoading(true)
    setError('')
    setReloadKey((key) => key + 1)
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadRegistrations() {
      try {
        const sessionResponse = await fetch(
          `${API_URL}/api/v1/auth/me`,
          {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal,
          }
        )

        const session = await sessionResponse.json().catch(() => ({}))

        if (sessionResponse.status === 401) {
          navigate('/login', { replace: true })
          return
        }

        if (
          !sessionResponse.ok ||
          !session.success ||
          !session.user
        ) {
          throw new Error(
            session.message || 'Unable to verify your session.'
          )
        }

        if (session.user.role !== 'admin') {
          navigate(
            session.user.role === 'teacher'
              ? '/teacher'
              : session.user.role === 'student'
                ? '/student'
                : '/login',
            { replace: true }
          )
          return
        }

        setAdmin(session.user)

        const response = await fetch(
          `${API_URL}/api/v1/admin/registrations/pending`,
          {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal,
          }
        )

        const result = await response.json().catch(() => ({}))

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || 'Unable to load pending registrations.'
          )
        }

        setRegistrations(
          Array.isArray(result.data) ? result.data : []
        )
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(
            err instanceof TypeError
              ? 'Cannot connect to the ELC server. Check the backend and network connection.'
              : err.message || 'Unable to load registrations.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadRegistrations()

    return () => controller.abort()
  }, [navigate, reloadKey])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  async function handleDecision(user, action) {
    const id = user._id || user.id
    const actionLabel = action === 'approve' ? 'approve' : 'reject'

    if (
      !window.confirm(
        `Are you sure you want to ${actionLabel} ${user.name}'s registration?`
      )
    ) {
      return
    }

    setBusyId(id)
    setError('')
    setNotice('')

    try {
      const response = await fetch(
        `${API_URL}/api/v1/admin/registrations/${id}/${action}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `Unable to ${actionLabel} account.`
        )
      }

      setRegistrations((current) =>
        current.filter((item) => (item._id || item.id) !== id)
      )

      setNotice(
        result.message ||
          `Registration ${action === 'approve' ? 'approved' : 'rejected'} successfully.`
      )
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot connect to the ELC server. Please try again.'
          : err.message || 'The action could not be completed.'
      )
    } finally {
      setBusyId('')
    }
  }

  const filteredRegistrations = registrations.filter(
    (user) => filter === 'all' || user.role === filter
  )

  const studentCount = registrations.filter(
    (user) => user.role === 'student'
  ).length

  const teacherCount = registrations.filter(
    (user) => user.role === 'teacher'
  ).length

  return (
    <DashboardLayout
      title="Registration Approvals"
      description="Review new student and teacher accounts."
      user={admin}
      onLogout={handleLogout}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7f011f]">
              ELC Administration
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Registration approvals
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review student and teacher registrations before granting
              portal access.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshRegistrations}
            disabled={loading}
            className="min-h-11 rounded-xl border border-[#d9c6b8] bg-white px-4 py-2.5 text-sm font-semibold text-[#7f011f] transition hover:bg-[#fff8f0] disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : '↻ Refresh list'}
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: 'Pending registrations',
              value: registrations.length,
              icon: '◷',
            },
            {
              label: 'Students',
              value: studentCount,
              icon: '♙',
            },
            {
              label: 'Teachers',
              value: teacherCount,
              icon: '♧',
            },
          ].map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border border-[#e8dfcf] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-600">
                  {stat.label}
                </p>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f5ebd0] text-lg text-[#7f011f]">
                  {stat.icon}
                </span>
              </div>

              <p className="mt-3 text-3xl font-bold text-[#7f011f]">
                {stat.value}
              </p>
            </article>
          ))}
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {notice}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#e8dfcf] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-[#eee5d7] bg-[#fffdf8] p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-slate-900">
                Awaiting your decision
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Only pending student and teacher accounts are shown.
              </p>
            </div>

            <label className="flex items-center gap-3 text-sm">
              <span className="font-medium text-slate-600">Filter</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="min-h-10 rounded-lg border border-[#d9c6b8] bg-white px-3 py-2 text-slate-800 outline-none focus:border-[#7f011f] focus:ring-2 focus:ring-[#7f011f]/10"
              >
                <option value="all">All registrations</option>
                <option value="student">Students</option>
                <option value="teacher">Teachers</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading registrations...
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="p-10 text-center sm:p-14">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f5ebd0] text-2xl text-[#7f011f]">
                ✓
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">
                No pending registrations
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                New registrations will appear here when submitted.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eee5d7]">
              {filteredRegistrations.map((user) => {
                const id = user._id || user.id
                const isBusy = busyId === id

                return (
                  <article
                    key={id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f5ebd0] text-lg font-bold uppercase text-[#7f011f]">
                        {user.name?.trim()?.charAt(0) || '?'}
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-slate-900">
                          {user.name}
                        </h3>
                        <p className="mt-1 break-all text-sm text-slate-600">
                          {user.email}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#f5ebd0] px-3 py-1 text-xs font-semibold capitalize text-[#7f011f]">
                            {user.role}
                          </span>
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                            Pending approval
                          </span>
                          {user.createdAt && (
                            <span className="text-xs text-slate-500">
                              Registered{' '}
                              {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2 sm:justify-end">
                      <button
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={() => handleDecision(user, 'approve')}
                        className="min-h-10 flex-1 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                      >
                        {isBusy ? 'Processing...' : 'Approve'}
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={() => handleDecision(user, 'reject')}
                        className="min-h-10 flex-1 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <p className="text-xs leading-5 text-slate-500">
          Approval grants account access. Rejection blocks login. All
          decisions are verified by the backend and require an authenticated
          administrator session.
        </p>
      </div>
    </DashboardLayout>
  )
}
