import { useState } from 'react'

const roles = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Director / Admin' },
]

export default function LoginForm() {
  const [role, setRole] = useState('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    setMessage(
      'UI preview only. Secure backend authentication has not been connected yet.',
    )
  }

  const fieldClass =
    'mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-sm font-semibold text-slate-700">
          Login as
        </label>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className={fieldClass}
        >
          {roles.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">
          Email address
        </label>
        <input
          required
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">
          Password
        </label>
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={fieldClass}
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800"
      >
        Continue as {roles.find((item) => item.value === role)?.label}
      </button>

      {message && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          {message}
        </p>
      )}
    </form>
  )
}