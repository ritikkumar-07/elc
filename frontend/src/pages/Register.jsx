
import { Link } from 'react-router-dom'
import RegisterForm from '../components/auth/RegisterForm.jsx'

export default function Register() {
  return (
    <main className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden overflow-hidden bg-[#101d3a] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 top-24 h-96 w-96 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
          />

          <Link to="/" className="relative flex w-fit items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-[#172f63] shadow-lg">
              E
            </span>
            <span>
              <span className="block text-sm font-bold tracking-wide">
                EXPERT LEARNING CENTER
              </span>
              <span className="mt-1 block text-xs text-blue-200">
                Learn Today. Lead Tomorrow.
              </span>
            </span>
          </Link>

          <div className="relative max-w-xl py-14">
            <p className="mb-5 inline-flex rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold tracking-wide text-blue-100">
              YOUR JOURNEY STARTS HERE
            </p>

            <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-6xl">
              Take the next step
              <span className="mt-2 block text-blue-300">
                towards your goals.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-slate-300">
              Create your ELC account to connect with learning resources,
              academic updates, assessments and achievements.
            </p>

            <div className="mt-10 space-y-4 text-sm text-slate-300">
              <p>✓ A dedicated learning portal</p>
              <p>✓ Student and teacher account options</p>
              <p>✓ Administrator-reviewed registration</p>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Learn Today. Lead Tomorrow.
          </p>
        </section>

        <section className="flex min-h-screen flex-col bg-white px-5 py-6 sm:px-10 lg:px-12 xl:px-20">
          <header className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#172f63] font-bold text-white">
                E
              </span>
              <span className="text-sm font-bold text-slate-900">
                Expert Learning Center
              </span>
            </Link>

            <Link
              to="/"
              className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              ← Back to website
            </Link>
          </header>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-800">
                JOIN ELC
              </p>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Create your account.
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Register as a student or teacher. Your account will be reviewed
                by the ELC administrator before access is granted.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_45px_-25px_rgba(15,23,42,0.25)] sm:p-7">
              <RegisterForm />
            </div>
          </div>

          <footer className="border-t border-slate-100 pt-5 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Expert Learning Center
          </footer>
        </section>
      </div>
    </main>
  )
}
