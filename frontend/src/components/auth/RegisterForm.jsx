
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { apiRequest } from '../../lib/api.js'

export default function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('student')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    if (loading) return

    setError('')
    setSuccessMessage('')

    if (name.trim().length < 2) {
      setError('Please enter your full name.')
      return
    }

    if (password.length < 8 || password.length > 72) {
      setError('Password must contain 8–72 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const result = await apiRequest('/api/v1/auth/signup', {
        method: 'POST',
        skipAuthEvent: true,
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        },
      })

      setSuccessMessage(
        result.message ||
          'Registration submitted successfully. Please wait for admin approval.'
      )
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setRole('student')
    } catch (err) {
      setError(
        err.message ||
          'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (successMessage) {
    return (
      <div className="space-y-5" role="status" aria-live="polite">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
              ✓
            </span>
            <div>
              <h3 className="font-semibold text-emerald-900">
                Registration submitted
              </h3>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                {successMessage}
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                You can log in after the ELC administrator approves your
                account.
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/login"
          className="flex w-full items-center justify-center rounded-xl bg-[#203f91] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#172f70] focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="register-name"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Full name
        </label>
        <input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter your full name"
          minLength={2}
          maxLength={100}
          required
          disabled={loading}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
        />
      </div>

      <div>
        <label
          htmlFor="register-role"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Register as
        </label>
        <select
          id="register-role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          disabled={loading}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Student and teacher accounts require administrator approval.
        </p>
      </div>

      <div>
        <label
          htmlFor="register-email"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Email address
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          maxLength={254}
          required
          disabled={loading}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
        />
      </div>

      <div>
        <label
          htmlFor="register-password"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Password
        </label>
        <div className="flex rounded-xl border border-slate-300 bg-white transition focus-within:border-blue-700 focus-within:ring-4 focus-within:ring-blue-100">
          <input
            id="register-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            maxLength={72}
            required
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

      <div>
        <label
          htmlFor="register-confirm-password"
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          Confirm password
        </label>
        <input
          id="register-confirm-password"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter your password"
          minLength={8}
          maxLength={72}
          required
          disabled={loading}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
        />
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
        {loading ? 'Submitting registration...' : 'Create account'}
      </button>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-blue-800 hover:text-blue-950 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
