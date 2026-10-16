import { Link } from 'react-router-dom'

export default function DashboardLayout({ title, description, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
              Expert Learning Center
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>

          <Link
            to="/"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            View Website
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-8">
        {children}
      </main>
    </div>
  )
}