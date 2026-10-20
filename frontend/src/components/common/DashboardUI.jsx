import { useEffect } from 'react'

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500'

export const buttonPrimary =
  'inline-flex min-h-10 items-center justify-center rounded-xl bg-[#19366e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#122951] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60'

export const buttonSecondary =
  'inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60'

export const buttonDanger =
  'inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60'

export const cardClass =
  'rounded-2xl border border-slate-200 bg-white shadow-sm'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#19366e]">
            {eyebrow}
          </p>
        )}

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        )}
      </div>

      {action}
    </header>
  )
}

export function StatCard({ label, value, hint, icon = '▦' }) {
  return (
    <article className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-lg text-[#19366e]">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold tracking-tight text-[#19366e]">
        {value ?? '—'}
      </p>

      {hint && (
        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          {hint}
        </p>
      )}
    </article>
  )
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-800',
    green: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-700',
    violet: 'bg-violet-50 text-violet-800',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${tones[tone] || tones.slate}`}
    >
      {children}
    </span>
  )
}

export function LoadingState({ label = 'Loading...', fullPage = false }) {
  const content = (
    <div className="text-center">
      <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-[#19366e]" />
      <p className="mt-4 text-sm font-semibold text-slate-600">
        {label}
      </p>
    </div>
  )

  if (fullPage) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f7fa] p-6">
        {content}
      </main>
    )
  }

  return (
    <div className="grid min-h-48 place-items-center p-6">{content}</div>
  )
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
  fullPage = false,
}) {
  const content = (
    <section className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-red-700">
        Unable to load
      </p>
      <p role="alert" className="mt-3 text-sm leading-6 text-slate-700">
        {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${buttonPrimary} mt-5`}>
          Try again
        </button>
      )}
    </section>
  )

  if (fullPage) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f7fa] p-6">
        {content}
      </main>
    )
  }

  return <div className="grid min-h-48 place-items-center p-6">{content}</div>
}

export function EmptyState({ title, description, action, icon = '▤' }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-2xl text-[#19366e]">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Modal({ open, title, description, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') onClose?.()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-modal-title"
        className={`my-auto w-full rounded-2xl bg-white p-5 shadow-2xl sm:p-6 ${wide ? 'max-w-4xl' : 'max-w-xl'}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="dashboard-modal-title"
              className="text-xl font-bold text-slate-950"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="mt-5">{children}</div>
      </section>
    </div>
  )
}

export function Notice({ tone = 'green', children }) {
  if (!children) return null

  const tones = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
  }

  return (
    <div
      role={tone === 'red' ? 'alert' : 'status'}
      className={`rounded-xl border p-4 text-sm leading-6 ${tones[tone] || tones.green}`}
    >
      {children}
    </div>
  )
}
