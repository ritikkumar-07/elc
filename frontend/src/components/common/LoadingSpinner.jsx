export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-900" />
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  )
}