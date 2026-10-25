
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
  const [fieldErrors, setFieldErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  function validateForm() {
    const nextErrors = {}
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (trimmedName.length < 2) {
      nextErrors.name = 'Enter your full name (at least 2 characters).'
    } else if (trimmedName.length > 100) {
      nextErrors.name = 'Name cannot exceed 100 characters.'
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Enter your email address.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (password.length < 8 || password.length > 72) {
      nextErrors.password = 'Password must contain 8–72 characters.'
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Re-enter your password.'
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    return nextErrors
  }

  function clearFieldError(field) {
    setFieldErrors((current) => {
      if (!current[field]) return current
      return { ...current, [field]: '' }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (loading) return

    setError('')
    setSuccessMessage('')

    const nextErrors = validateForm()
    const firstInvalid = ['name', 'email', 'password', 'confirmPassword'].find(
      (field) => nextErrors[field],
    )

    if (firstInvalid) {
      setFieldErrors(nextErrors)
      setError('Please check the highlighted fields.')

      const inputIds = {
        name: 'register-name',
        email: 'register-email',
        password: 'register-password',
        confirmPassword: 'register-confirm-password',
      }

      window.requestAnimationFrame(() => {
        document.getElementById(inputIds[firstInvalid])?.focus()
      })
      return
    }

    setFieldErrors({})
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
      setFieldErrors({})
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
    <form onSubmit={handleSubmit} noValidate aria-busy={loading} className="space-y-5">
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
          onChange={(event) => {
            setName(event.target.value)
            clearFieldError('name')
          }}
          placeholder="Enter your full name"
          minLength={2}
          maxLength={100}
          required
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
        />

        {fieldErrors.name && (
          <p id="register-name-error" className="mt-2 text-sm font-medium text-red-700">
            {fieldErrors.name}
          </p>
        )}
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
          onChange={(event) => {
            setEmail(event.target.value)
            clearFieldError('email')
          }}
          placeholder="you@example.com"
          maxLength={254}
          required
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
        />

        {fieldErrors.email && (
          <p id="register-email-error" className="mt-2 text-sm font-medium text-red-700">
            {fieldErrors.email}
          </p>
        )}
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
            onChange={(event) => {
              setPassword(event.target.value)
              clearFieldError('password')
              clearFieldError('confirmPassword')
            }}
            placeholder="At least 8 characters"
            minLength={8}
            maxLength={72}
            required
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? 'register-password-error' : undefined
            }
            className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="shrink-0 rounded-r-xl px-4 text-xs font-semibold text-blue-800 hover:text-blue-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e]"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {fieldErrors.password && (
          <p id="register-password-error" className="mt-2 text-sm font-medium text-red-700">
            {fieldErrors.password}
          </p>
        )}
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
          onChange={(event) => {
            setConfirmPassword(event.target.value)
            clearFieldError('confirmPassword')
          }}
          placeholder="Re-enter your password"
          minLength={8}
          maxLength={72}
          required
          disabled={loading}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          aria-describedby={
            fieldErrors.confirmPassword
              ? 'register-confirm-password-error'
              : undefined
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
        />

        {fieldErrors.confirmPassword && (
          <p id="register-confirm-password-error" className="mt-2 text-sm font-medium text-red-700">
            {fieldErrors.confirmPassword}
          </p>
        )}
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
