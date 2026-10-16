
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const roles = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Director / Admin' },
]

export default function LoginForm() {
  const navigate = useNavigate()

  const [role, setRole] = useState('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Please enter your email address and password.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.success || !result.user) {
        throw new Error(
          result.message || 'Unable to sign in. Please try again.'
        )
      }

      const actualRole = result.user.role

      if (actualRole !== role) {
        // The backend role is authoritative; the dropdown is only a check.
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        }).catch(() => {})

        throw new Error(
          `This account is registered as ${
            roles.find((item) => item.value === actualRole)?.label || actualRole
          }. Please select the correct account type.`
        )
      }

      const destinations = {
        admin: '/admin',
        teacher: '/teacher',
        student: '/student',
      }

      navigate(destinations[actualRole] || '/', { replace: true })
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot connect to the ELC server. Make sure the backend is running on port 5000.'
          : err.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="login-role"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Login as
        </label>
        <select
          id="login-role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          disabled={loading}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
        >
          {roles.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="login-email"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Email address
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          maxLength={254}
          disabled={loading}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label
            htmlFor="login-password"
            className="block text-sm font-semibold text-slate-800"
          >
            Password
          </label>
        </div>

        <div className="flex rounded-xl border border-slate-300 bg-white transition focus-within:border-blue-700 focus-within:ring-4 focus-within:ring-blue-100">
          <input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            maxLength={72}
            disabled={loading}
            className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="shrink-0 px-4 text-xs font-semibold text-blue-800 hover:text-blue-950"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#203f91] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/10 transition hover:bg-[#172f70] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Signing you in...
          </>
        ) : (
          <>Continue as {roles.find((item) => item.value === role)?.label} →</>
        )}
      </button>

      <p className="text-center text-xs leading-5 text-slate-500">
        Your access permissions are verified by the ELC server.
      </p>
    </form>
  )
}
