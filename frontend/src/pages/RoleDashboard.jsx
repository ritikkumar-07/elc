
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const roleLabels = {
  admin: 'Director / Admin',
  teacher: 'Teacher',
  student: 'Student',
}

export default function RoleDashboard({ expectedRole }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [message, setMessage] = useState('Verifying your session...')

  useEffect(() => {
    const controller = new AbortController()

    async function verifySession() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/auth/me`,
          {
            credentials: 'include',
            signal: controller.signal,
          },
        )

        const result = await response.json().catch(() => ({}))

        if (!response.ok || !result.success || !result.user) {
          navigate('/login', { replace: true })
          return
        }

        if (result.user.role !== expectedRole) {
          const paths = {
            admin: '/admin',
            teacher: '/teacher',
            student: '/student',
          }

          navigate(paths[result.user.role] || '/login', {
            replace: true,
          })
          return
        }

        setUser(result.user)
        setMessage('')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMessage(
            'Unable to verify your session. Check the backend connection and refresh this page.',
          )
        }
      }
    }

    verifySession()

    return () => controller.abort()
  }, [expectedRole, navigate])

  async function handleLogout() {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      navigate('/login', { replace: true })
    }
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p role="status" className="text-slate-600">
          {message || 'Loading your dashboard...'}
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-white px-6 py-5">
        <div>
          <p className="text-sm font-semibold text-blue-800">
            EXPERT LEARNING CENTER
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {roleLabels[user.role]} Dashboard
          </h1>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800"
        >
          Log out
        </button>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Welcome back</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            {user.name}
          </h2>
          <p className="mt-2 text-slate-600">{user.email}</p>
          <p className="mt-1 text-sm text-slate-500">
            Account type: {roleLabels[user.role]}
          </p>
        </div>

        <p className="mt-6 text-slate-600">
          Your dashboard session is verified. Academic modules will be added
          here in the next implementation steps.
        </p>
      </section>
    </main>
  )
}
