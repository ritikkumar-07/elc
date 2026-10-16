import TopperCard from './TopperCard.jsx'

export default function TopperList({
  toppers,
  onEdit,
  onDelete,
  onTogglePublish,
}) {
  if (toppers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        No toppers added yet. Use the form to add the first record.
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {toppers.map((topper) => (
        <div key={topper.id} className="space-y-3">
          <TopperCard topper={topper} />

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <span
              className={`text-xs font-bold ${
                topper.published ? 'text-green-700' : 'text-amber-700'
              }`}
            >
              {topper.published ? 'Published' : 'Draft'}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(topper)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => onTogglePublish(topper.id)}
                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50"
              >
                {topper.published ? 'Unpublish' : 'Publish'}
              </button>

              <button
                type="button"
                onClick={() => onDelete(topper.id)}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}