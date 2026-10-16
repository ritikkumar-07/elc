import { Link } from 'react-router-dom'
import LoginForm from '../components/auth/LoginForm.jsx'

export default function Login() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
        <section className="flex flex-col justify-center bg-blue-950 p-8 text-white sm:p-12">
          <Link to="/" className="text-sm font-semibold text-blue-200">
            ← Back to website
          </Link>

          <p className="mt-12 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">
            Expert Learning Center
          </p>

          <h1 className="mt-4 text-4xl font-extrabold leading-tight">
            Welcome back to your learning journey.
          </h1>

          <p className="mt-5 leading-7 text-blue-100">
            Sign-in access for students, teachers, and center administrators.
          </p>
        </section>

        <section className="p-8 sm:p-12">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Sign in
          </h2>
          <p className="mt-2 mb-8 text-sm text-slate-500">
            Enter your account details to continue.
          </p>

          <LoginForm />

          <p className="mt-6 text-center text-xs leading-5 text-slate-500">
            This is currently a frontend preview. No credentials are
            authenticated or stored by this form.
          </p>
        </section>
      </div>
    </main>
  )
}