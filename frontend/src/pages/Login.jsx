
import { Link } from 'react-router-dom'
import LoginForm from '../components/auth/LoginForm.jsx'

const highlights = [
  {
    number: '01',
    title: 'Learn with purpose',
    description: 'Organised resources for focused learning.',
  },
  {
    number: '02',
    title: 'Track your progress',
    description: 'Stay connected with your academic journey.',
  },
  {
    number: '03',
    title: 'Celebrate achievement',
    description: 'Every step forward deserves recognition.',
  },
]

export default function Login() {
  return (
    <main className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">
        {/* Branding panel */}
        <section className="relative isolate hidden overflow-hidden bg-[#101d3a] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16 xl:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 top-24 -z-10 h-96 w-96 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 top-40 -z-10 h-64 w-64 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-24 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
          />

          <Link to="/" className="flex w-fit items-center gap-3">
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
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold tracking-wide text-blue-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              YOUR ACADEMIC JOURNEY STARTS HERE
            </div>

            <h1 className="text-4xl font-bold leading-[1.15] tracking-tight xl:text-6xl">
              Build your
              <span className="block text-blue-300">
                future with
              </span>
              confidence.
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-slate-300">
              One place for learning resources, academic updates,
              assessments and achievements at ELC.
            </p>

            <div className="mt-12 space-y-5">
              {highlights.map((item) => (
                <div key={item.number} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-xs font-bold text-blue-200">
                    {item.number}
                  </span>
                  <div>
                    <h2 className="font-semibold text-white">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Focus on learning. We’ll help you track the journey.
          </p>
        </section>

        {/* Login panel */}
        <section className="flex min-h-screen flex-col bg-white px-5 py-6 sm:px-10 lg:px-12 xl:px-20">
          <header className="flex items-center justify-between gap-3 lg:justify-end">
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
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <span aria-hidden="true">← </span>
              <span className="hidden sm:inline">Back to website</span>
              <span className="sm:hidden">Home</span>
            </Link>
          </header>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-800">
                ELC STUDENT & STAFF PORTAL
              </p>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Welcome back.
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Sign in to access your personalised learning space.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_45px_-25px_rgba(15,23,42,0.25)] sm:p-7">
              <LoginForm />
            </div>

            <div className="mt-5 text-center">
              <p className="text-sm text-slate-600">
                New to ELC?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-blue-800 hover:text-blue-950 hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              Your account access is protected by ELC authentication.
              <br />
              Need access? Contact your coaching centre administrator.
            </p>
          </div>

          <footer className="border-t border-slate-100 pt-5 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Expert Learning Center
          </footer>
        </section>
      </div>
    </main>
  )
}
