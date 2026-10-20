
import { useCallback, useEffect, useState } from 'react'

const API_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
).replace(/\/+$/, '')

const EMPTY_FORM = {
  eyebrow: '',
  title: '',
  description: '',
  imageUrl: '',
  altText: '',
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message || `Request failed with status ${response.status}.`,
    )
  }

  return result
}

function getBannerId(banner) {
  return banner._id || banner.id
}

export default function HeroBannerManager() {
  const [banners, setBanners] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadBanners = useCallback(async () => {
    try {
      const result = await apiRequest('/api/v1/hero-banners')

      setBanners(Array.isArray(result.data) ? result.data : [])
    } catch (err) {
      setError(err.message || 'Unable to load hero banners.')
    } finally {
      setLoading(false)
    }
  }, [])

  async function refreshBanners() {
    setLoading(true)
    setError('')
    await loadBanners()
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadInitialBanners() {
      try {
        const result = await apiRequest('/api/v1/hero-banners', {
          signal: controller.signal,
        })

        setBanners(Array.isArray(result.data) ? result.data : [])
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to load hero banners.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadInitialBanners()

    return () => controller.abort()
  }, [])

  function updateField(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setError('')
    setNotice('')
  }

  function startEditing(banner) {
    setEditingId(getBannerId(banner))

    setForm({
      eyebrow: banner.eyebrow || '',
      title: banner.title || '',
      description: banner.description || '',
      imageUrl: banner.imageUrl || '',
      altText: banner.altText || '',
    })

    setError('')
    setNotice('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setNotice('')

    const payload = {
      eyebrow: form.eyebrow.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      altText: form.altText.trim(),
    }

    if (
      !payload.eyebrow ||
      !payload.title ||
      !payload.description ||
      !payload.imageUrl ||
      !payload.altText
    ) {
      setError('Please fill in all fields.')
      return
    }

    try {
      new URL(payload.imageUrl)
    } catch {
      setError('Please enter a valid image URL.')
      return
    }

    if (!/^https?:$/.test(new URL(payload.imageUrl).protocol)) {
      setError('The image URL must start with http:// or https://.')
      return
    }

    setSaving(true)

    try {
      if (editingId) {
        await apiRequest(
          `/api/v1/hero-banners/${encodeURIComponent(editingId)}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          },
        )

        setNotice('Banner updated successfully.')
      } else {
        await apiRequest('/api/v1/hero-banners', {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        setNotice('Banner added successfully.')
      }

      setForm(EMPTY_FORM)
      setEditingId(null)

      await refreshBanners()
    } catch (err) {
      setError(err.message || 'Unable to save the banner.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(banner) {
    const id = getBannerId(banner)

    if (!id) {
      setError('This banner has no valid ID.')
      return
    }

    const confirmed = window.confirm(
      `Delete "${banner.title}"? This action cannot be undone.`,
    )

    if (!confirmed) return

    setError('')
    setNotice('')
    setDeletingId(id)

    try {
      await apiRequest(
        `/api/v1/hero-banners/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      )

      if (editingId === id) {
        setForm(EMPTY_FORM)
        setEditingId(null)
      }

      setNotice('Banner deleted successfully.')
      await refreshBanners()
    } catch (err) {
      setError(err.message || 'Unable to delete the banner.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">
            Website appearance
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {editingId ? 'Edit hero banner' : 'Add a hero banner'}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Manage the slides displayed on the public homepage and dashboard.
            Slides rotate automatically every five seconds.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="banner-eyebrow"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Small heading
            </label>

            <input
              id="banner-eyebrow"
              name="eyebrow"
              value={form.eyebrow}
              onChange={updateField}
              placeholder="PREPARE · PERFORM · PROGRESS"
              maxLength={120}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="banner-title"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Main heading
            </label>

            <input
              id="banner-title"
              name="title"
              value={form.title}
              onChange={updateField}
              placeholder="Take the Next Step in Your Education"
              maxLength={200}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="banner-description"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Description
            </label>

            <textarea
              id="banner-description"
              name="description"
              value={form.description}
              onChange={updateField}
              placeholder="Write a short introduction for students."
              maxLength={1000}
              rows={3}
              required
              className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="banner-image"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Background image URL
            </label>

            <input
              id="banner-image"
              name="imageUrl"
              type="url"
              value={form.imageUrl}
              onChange={updateField}
              placeholder="https://example.com/classroom.jpg"
              maxLength={2048}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            {form.imageUrl && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  Image preview
                </p>

                <img
                  src={form.imageUrl}
                  alt="Banner preview"
                  className="max-h-64 w-full bg-slate-100 object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                  onLoad={(event) => {
                    event.currentTarget.style.display = 'block'
                  }}
                />
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="banner-alt"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Image alternative text
            </label>

            <input
              id="banner-alt"
              name="altText"
              value={form.altText}
              onChange={updateField}
              placeholder="Students studying in a classroom"
              maxLength={300}
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1 text-xs text-slate-500">
              Describe the image for accessibility.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Save changes'
                  : 'Add banner'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel editing
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Existing banners
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {banners.length} banner{banners.length === 1 ? '' : 's'} found
            </p>
          </div>

          <button
            type="button"
            onClick={refreshBanners}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading banners...
          </div>
        ) : banners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="font-semibold text-slate-800">
              No managed banners found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Add a banner using the form above.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {banners.map((banner) => {
              const id = getBannerId(banner)

              return (
                <article
                  key={id || banner.title}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative h-44 bg-slate-100">
                    {banner.imageUrl ? (
                      <img
                        src={banner.imageUrl}
                        alt={banner.altText || ''}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-slate-400">
                        No image available
                      </div>
                    )}

                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {banner.eyebrow || 'Hero banner'}
                    </span>
                  </div>

                  <div className="space-y-3 p-5">
                    <h3 className="text-lg font-bold leading-snug text-slate-900">
                      {banner.title}
                    </h3>

                    <p className="text-sm leading-6 text-slate-600">
                      {banner.description}
                    </p>

                    <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => startEditing(banner)}
                        disabled={!id || saving || deletingId !== null}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(banner)}
                        disabled={!id || deletingId !== null || saving}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
