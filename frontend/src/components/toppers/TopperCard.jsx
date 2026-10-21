import { useState } from 'react'

export default function TopperCard({ topper }) {
  const {
    name,
    className,
    board,
    percentage,
    session,
    photo,
    description,
  } = topper
  const photoSource = typeof photo === 'string' ? photo.trim() : ''
  const [failedPhoto, setFailedPhoto] = useState('')
  const showPhoto = Boolean(photoSource) && failedPhoto !== photoSource

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none">
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-slate-100">
        {showPhoto ? (
          <img
            src={photoSource}
            alt={`Photo of ${name}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105 motion-reduce:transform-none"
            onError={() => setFailedPhoto(photoSource)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-200">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#19366e] text-4xl font-bold text-white shadow-md">
              {name?.charAt(0)?.toUpperCase() || 'S'}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div>
          <h3 className="line-clamp-2 min-h-[3.25rem] text-xl font-bold leading-snug text-[#14264b]">
            {name}
          </h3>

          <p className="mt-1 text-sm font-medium text-slate-500">
            {className ? `Class ${className}` : 'Student'}
            {board ? ` · ${board}` : ''}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-[#f0f5ff] p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">
              Exam Score
            </p>
            <p className="mt-1 text-2xl font-extrabold text-[#19366e]">
              {percentage != null && percentage !== ''
                ? `${percentage}%`
                : '—'}
            </p>
          </div>

          <div className="border-l border-blue-100 pl-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">
              Academic Year
            </p>
            <p className="mt-2 text-sm font-bold text-[#19366e]">
              {session || 'Not specified'}
            </p>
          </div>
        </div>

        <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">
          {description ||
            'Recognised for dedication, consistent effort, and academic achievement.'}
        </p>

        <div className="mt-auto border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold tracking-wide text-slate-400">
            EXPERT LEARNING CENTER
          </p>
        </div>
      </div>
    </article>
  )
}
