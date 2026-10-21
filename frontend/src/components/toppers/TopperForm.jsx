import { useEffect, useRef, useState } from 'react'

import {
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from '../common/DashboardUI.jsx'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const photoTypes = new Set(['image/jpeg', 'image/png'])
const photoExtensions = /\.(jpe?g|png)$/i
const boardOptions = ['CBSE', 'BSEB', 'ICSE', 'Other']

const emptyForm = {
  name: '',
  className: '',
  board: '',
  percentage: '',
  session: '',
  rank: '',
  photoUrl: '',
  description: '',
  isPublished: false,
}

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FieldError({ id, message }) {
  if (!message) return null

  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-700">
      {message}
    </p>
  )
}

function FormSection({ id, title, description, children }) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3
          id={id}
          className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500"
        >
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  )
}

function validateForm(values, { skipPhotoUrl = false } = {}) {
  const errors = {}
  const name = String(values.name || '').trim()
  const className = String(values.className || '').trim()
  const board = String(values.board || '').trim()
  const session = String(values.session || '').trim()
  const description = String(values.description || '').trim()
  const photoUrl = String(values.photoUrl || '').trim()

  if (!name) {
    errors.name = 'Student name is required.'
  } else if (name.length > 100) {
    errors.name = 'Student name must be 100 characters or fewer.'
  }

  if (!className) {
    errors.className = 'Class is required.'
  } else if (className.length > 50) {
    errors.className = 'Class must be 50 characters or fewer.'
  }

  if (!board) {
    errors.board = 'Select a board.'
  }

  if (!session) {
    errors.session = 'Academic session is required.'
  } else if (session.length > 30) {
    errors.session = 'Academic session must be 30 characters or fewer.'
  }

  if (
    values.percentage === '' ||
    values.percentage === null ||
    values.percentage === undefined
  ) {
    errors.percentage = 'Percentage is required.'
  } else {
    const percentage = Number(values.percentage)

    if (
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100
    ) {
      errors.percentage = 'Enter a percentage between 0 and 100.'
    }
  }

  if (values.rank !== '' && values.rank !== null && values.rank !== undefined) {
    const rank = Number(values.rank)

    if (!Number.isInteger(rank) || rank < 1 || rank > 10000) {
      errors.rank = 'Rank must be a whole number between 1 and 10,000.'
    }
  }

  if (description.length > 500) {
    errors.description = 'Description must be 500 characters or fewer.'
  }

  if (photoUrl && !skipPhotoUrl) {
    if (photoUrl.length > 1000) {
      errors.photoUrl = 'Photo URL must be 1000 characters or fewer.'
    } else {
      try {
        const url = new URL(photoUrl)

        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Unsupported protocol')
        }
      } catch {
        errors.photoUrl =
          'Enter a valid photo URL starting with http:// or https://.'
      }
    }
  }

  return errors
}

export default function TopperForm({
  initialData,
  onSave,
  onCancel,
  busy = false,
}) {
  const [form, setForm] = useState(() =>
    initialData ? { ...emptyForm, ...initialData } : emptyForm,
  )
  const [fieldErrors, setFieldErrors] = useState({})
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [photoLoadError, setPhotoLoadError] = useState(false)
  const photoInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function updateField(event) {
    const { name, value, type, checked } = event.target

    if (name === 'photoUrl') {
      setPhotoLoadError(false)
    }

    setFieldErrors((current) => {
      if (!current[name]) return current

      const next = { ...current }
      delete next[name]
      return next
    })

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handlePhotoChange(event) {
    const input = event.target
    const file = input.files?.[0]

    setPhotoError('')

    if (!file) {
      setPhotoFile(null)
      setPhotoPreview('')
      setPhotoLoadError(false)
      return
    }

    if (!photoTypes.has(file.type) || !photoExtensions.test(file.name)) {
      input.value = ''
      setPhotoFile(null)
      setPhotoPreview('')
      setPhotoLoadError(false)
      setPhotoError('Choose a JPEG or PNG photo.')
      return
    }

    if (file.size > MAX_PHOTO_BYTES) {
      input.value = ''
      setPhotoFile(null)
      setPhotoPreview('')
      setPhotoLoadError(false)
      setPhotoError('The photo must be 5 MB or smaller.')
      return
    }

    setFieldErrors((current) => {
      if (!current.photoUrl) return current

      const next = { ...current }
      delete next.photoUrl
      return next
    })
    setPhotoFile(file)
    setPhotoLoadError(false)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleRemovePhoto() {
    setPhotoError('')

    if (photoFile) {
      setPhotoFile(null)
      setPhotoPreview('')
      setPhotoLoadError(false)

      if (photoInputRef.current) {
        photoInputRef.current.value = ''
      }

      return
    }

    setFieldErrors((current) => {
      if (!current.photoUrl) return current

      const next = { ...current }
      delete next.photoUrl
      return next
    })
    setPhotoLoadError(false)
    setForm((current) => ({ ...current, photoUrl: '' }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (busy) return

    const errors = validateForm(form, {
      skipPhotoUrl: Boolean(photoFile),
    })
    setFieldErrors(errors)

    if (photoError) {
      photoInputRef.current?.focus()
      return
    }

    if (Object.keys(errors).length > 0) {
      const firstField = Object.keys(errors)[0]
      const field = event.currentTarget.elements.namedItem(firstField)

      if (field instanceof HTMLElement) field.focus()
      return
    }

    onSave({
      ...form,
      percentage: Number(form.percentage),
      rank: form.rank ? Number(form.rank) : undefined,
      photoFile,
    })
  }

  const previewPhoto =
    photoPreview || String(form.photoUrl || '').trim()
  const showPhoto = Boolean(previewPhoto) && !photoLoadError
  const initial =
    String(form.name || '').trim().charAt(0).toUpperCase() || 'S'
  const descriptionLength = String(form.description || '').length
  const availableBoards =
    !form.board || boardOptions.includes(form.board)
      ? boardOptions
      : [form.board, ...boardOptions]

  return (
    <form onSubmit={handleSubmit} noValidate>
      <fieldset disabled={busy} className="space-y-7">
        <FormSection
          id="topper-student-details"
          title="Student details"
          description="The student's name, class, and board as they should appear publicly."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Student name *
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={
                  fieldErrors.name ? 'topper-name-error' : undefined
                }
                className={`${inputClass} mt-2`}
                placeholder="Enter full name"
                autoComplete="name"
                maxLength={100}
              />
              <FieldError id="topper-name-error" message={fieldErrors.name} />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Class *
              <input
                name="className"
                value={form.className}
                onChange={updateField}
                aria-invalid={Boolean(fieldErrors.className)}
                aria-describedby={
                  fieldErrors.className ? 'topper-class-error' : undefined
                }
                className={`${inputClass} mt-2`}
                placeholder="e.g. 10 or 12"
                maxLength={50}
              />
              <FieldError
                id="topper-class-error"
                message={fieldErrors.className}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Board *
              <select
                name="board"
                value={form.board}
                onChange={updateField}
                aria-invalid={Boolean(fieldErrors.board)}
                aria-describedby={
                  fieldErrors.board ? 'topper-board-error' : undefined
                }
                className={`${inputClass} mt-2`}
              >
                <option value="">Select board</option>
                {availableBoards.map((board) => (
                  <option key={board} value={board}>
                    {board}
                  </option>
                ))}
              </select>
              <FieldError
                id="topper-board-error"
                message={fieldErrors.board}
              />
            </label>
          </div>
        </FormSection>

        <FormSection
          id="topper-academic-results"
          title="Academic results"
          description="Results are shown on the public achievement card."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Percentage *
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                name="percentage"
                value={form.percentage}
                onChange={updateField}
                aria-invalid={Boolean(fieldErrors.percentage)}
                aria-describedby={
                  fieldErrors.percentage
                    ? 'topper-percentage-error'
                    : undefined
                }
                className={`${inputClass} mt-2`}
                placeholder="e.g. 95.5"
              />
              <FieldError
                id="topper-percentage-error"
                message={fieldErrors.percentage}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Rank
              <input
                type="number"
                min="1"
                max="10000"
                step="1"
                name="rank"
                value={form.rank}
                onChange={updateField}
                aria-invalid={Boolean(fieldErrors.rank)}
                aria-describedby={
                  fieldErrors.rank ? 'topper-rank-error' : undefined
                }
                className={`${inputClass} mt-2`}
                placeholder="e.g. 1"
              />
              <FieldError id="topper-rank-error" message={fieldErrors.rank} />
            </label>

            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Academic session *
              <input
                name="session"
                value={form.session}
                onChange={updateField}
                aria-invalid={Boolean(fieldErrors.session)}
                aria-describedby={
                  fieldErrors.session ? 'topper-session-error' : undefined
                }
                className={`${inputClass} mt-2`}
                placeholder="e.g. 2025-26"
                maxLength={30}
              />
              <FieldError
                id="topper-session-error"
                message={fieldErrors.session}
              />
            </label>
          </div>
        </FormSection>

        <FormSection
          id="topper-photo"
          title="Student photo"
          description="Upload a JPEG or PNG image, or use an existing photo URL."
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-start">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {showPhoto ? (
                <img
                  src={previewPhoto}
                  alt={
                    photoFile
                      ? 'Preview of selected student photo'
                      : 'Current student photo preview'
                  }
                  className="h-full w-full object-cover object-center"
                  onError={() => setPhotoLoadError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-200">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-[#19366e] text-3xl font-bold text-white shadow-md">
                    {initial}
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-3">
              <input
                ref={photoInputRef}
                id="topper-photo-file"
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                aria-describedby={
                  photoError
                    ? 'topper-photo-help topper-photo-error'
                    : 'topper-photo-help'
                }
                aria-invalid={Boolean(photoError)}
                onChange={handlePhotoChange}
                className="peer sr-only"
              />

              <label
                htmlFor="topper-photo-file"
                className={`${buttonSecondary} cursor-pointer peer-focus-visible:ring-4 peer-focus-visible:ring-blue-200 ${
                  busy ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                {photoFile || form.photoUrl
                  ? 'Choose Another Photo'
                  : 'Choose Photo'}
              </label>

              <p
                id="topper-photo-help"
                className="text-xs font-normal leading-5 text-slate-500"
              >
                JPEG or PNG, up to 5 MB. For best results use a landscape
                (4:3) photo at least 800px wide. A selected file takes
                precedence over the photo URL.
              </p>

              {photoFile && (
                <p className="break-words text-xs font-medium text-slate-600">
                  Selected: {photoFile.name} ({formatFileSize(photoFile.size)})
                </p>
              )}

              {photoError && (
                <p
                  id="topper-photo-error"
                  role="alert"
                  className="text-sm font-medium text-red-700"
                >
                  {photoError}
                </p>
              )}

              {(photoFile || form.photoUrl) && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
                >
                  {photoFile
                    ? 'Remove Selected Photo'
                    : 'Remove Current Photo'}
                </button>
              )}
            </div>
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            Student photo URL
            <input
              type="url"
              name="photoUrl"
              value={form.photoUrl}
              onChange={updateField}
              aria-invalid={Boolean(fieldErrors.photoUrl)}
              aria-describedby={
                fieldErrors.photoUrl
                  ? 'topper-photo-url-error'
                  : 'topper-photo-url-help'
              }
              className={`${inputClass} mt-2`}
              placeholder="https://example.com/student.jpg"
              maxLength={1000}
            />
            <span
              id="topper-photo-url-help"
              className="mt-1 block text-xs font-normal text-slate-500"
            >
              Used only when no image file is selected. Leave blank to show
              the student's initial instead.
            </span>
            <FieldError
              id="topper-photo-url-error"
              message={fieldErrors.photoUrl}
            />
          </label>
        </FormSection>

        <FormSection
          id="topper-description"
          title="Description"
          description="Optional context such as achievements or future goals."
        >
          <label className="block text-sm font-semibold text-slate-700">
            Achievement note
            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={
                fieldErrors.description
                  ? 'topper-description-error'
                  : undefined
              }
              className={`${inputClass} mt-2 resize-y`}
              rows={4}
              maxLength={500}
              placeholder="Optional achievement note"
            />
            <span className="mt-1 block text-right text-xs text-slate-400">
              {descriptionLength}/500
            </span>
            <FieldError
              id="topper-description-error"
              message={fieldErrors.description}
            />
          </label>
        </FormSection>

        <FormSection
          id="topper-publication"
          title="Publication"
          description="Only published toppers appear in the public Star Performers section."
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/40">
            <input
              type="checkbox"
              name="isPublished"
              checked={form.isPublished}
              onChange={updateField}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Publish on the public homepage
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                You can publish or unpublish this record later from Topper
                Management.
              </span>
            </span>
          </label>
        </FormSection>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={`${buttonSecondary} w-full sm:w-auto`}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={busy}
            className={`${buttonPrimary} w-full sm:w-auto`}
          >
            {busy
              ? 'Saving Topper...'
              : initialData
                ? 'Save Changes'
                : 'Save Topper'}
          </button>
        </div>
      </fieldset>
    </form>
  )
}
