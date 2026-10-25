import { useState } from 'react'

import { buildImageSrcSet, optimizedImageUrl } from '../../lib/imageUrl.js'

import { Badge, cardClass } from '../common/DashboardUI.jsx'

function getId(topper) {
  return topper.id || topper._id
}

function displayScore(value) {
  return value != null && value !== '' ? `${value}%` : '—'
}

const actionBase =
  'inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50'

const actionNeutral = `${actionBase} border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-100`
const actionPublish = `${actionBase} border-blue-200 text-blue-900 hover:bg-blue-50 focus-visible:ring-blue-100`
const actionDelete = `${actionBase} border-red-200 text-red-700 hover:bg-red-50 focus-visible:ring-red-100`

function TopperThumbnail({ topper, sizeClass = 'h-12 w-12' }) {
  const photo = topper.photoUrl?.trim()
  const [failedPhoto, setFailedPhoto] = useState('')
  const showPhoto = Boolean(photo) && failedPhoto !== photo

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100`}
    >
      {showPhoto ? (
        <img
          src={optimizedImageUrl(photo, { width: 160, quality: 78 })}
          srcSet={buildImageSrcSet(photo, [80, 160, 240])}
          sizes="80px"
          alt={`Portrait of ${topper.name}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-center"
          onError={() => setFailedPhoto(photo)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-blue-50 to-slate-200 text-lg font-bold text-[#19366e]">
          {topper.name?.charAt(0)?.toUpperCase() || 'S'}
        </div>
      )}
    </div>
  )
}

function TopperActions({
  topper,
  published,
  busy,
  updating,
  onEdit,
  onTogglePublish,
  onDelete,
}) {
  const name = topper.name || 'topper'

  return (
    <div className="flex flex-wrap gap-2 xl:justify-end">
      <button
        type="button"
        onClick={() => onEdit(topper)}
        disabled={busy}
        aria-label={`Edit ${name}`}
        className={actionNeutral}
      >
        Edit
      </button>

      <button
        type="button"
        onClick={() => onTogglePublish(topper)}
        disabled={busy}
        aria-label={`${published ? 'Unpublish' : 'Publish'} ${name}`}
        className={actionPublish}
      >
        {updating
          ? 'Updating...'
          : published
            ? 'Unpublish'
            : 'Publish'}
      </button>

      <button
        type="button"
        onClick={() => onDelete(topper)}
        disabled={busy}
        aria-label={`Delete ${name}`}
        className={actionDelete}
      >
        Delete
      </button>
    </div>
  )
}

export default function TopperList({
  toppers,
  busyId,
  onEdit,
  onDelete,
  onTogglePublish,
}) {
  return (
    <>
      <section className={`${cardClass} hidden overflow-hidden xl:block`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Class</th>
                <th className="px-4 py-3 font-semibold">Board</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Session</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {toppers.map((topper) => {
                const id = getId(topper)
                const published = Boolean(topper.isPublished)
                const busy = Boolean(busyId)
                const updating = busyId === id

                return (
                  <tr key={id} className="align-middle">
                    <td className="px-4 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <TopperThumbnail topper={topper} />

                        <div className="min-w-0">
                          <p
                            className="max-w-[190px] truncate font-semibold text-slate-900"
                            title={topper.name}
                          >
                            {topper.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {topper.rank
                              ? `Rank ${topper.rank}`
                              : 'Student achievement'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {topper.className || '—'}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {topper.board || '—'}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[#19366e]">
                      {displayScore(topper.percentage)}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {topper.session || '—'}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={published ? 'green' : 'amber'}>
                        {published ? 'Published' : 'Unpublished'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <TopperActions
                        topper={topper}
                        published={published}
                        busy={busy}
                        updating={updating}
                        onEdit={onEdit}
                        onTogglePublish={onTogglePublish}
                        onDelete={onDelete}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:hidden">
        {toppers.map((topper) => {
          const id = getId(topper)
          const published = Boolean(topper.isPublished)
          const busy = Boolean(busyId)
          const updating = busyId === id

          return (
            <article key={id} className={`${cardClass} p-4 sm:p-5`}>
              <div className="flex gap-4">
                <TopperThumbnail
                  topper={topper}
                  sizeClass="h-20 w-20"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-bold text-slate-900">
                        {topper.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Class {topper.className || '—'}
                        {topper.board ? ` · ${topper.board}` : ''}
                      </p>
                    </div>

                    <Badge tone={published ? 'green' : 'amber'}>
                      {published ? 'Published' : 'Unpublished'}
                    </Badge>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">
                        Score
                      </dt>
                      <dd className="mt-0.5 font-bold text-[#19366e]">
                        {displayScore(topper.percentage)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">
                        Session
                      </dt>
                      <dd className="mt-0.5 font-semibold text-slate-700">
                        {topper.session || '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <TopperActions
                  topper={topper}
                  published={published}
                  busy={busy}
                  updating={updating}
                  onEdit={onEdit}
                  onTogglePublish={onTogglePublish}
                  onDelete={onDelete}
                />
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
