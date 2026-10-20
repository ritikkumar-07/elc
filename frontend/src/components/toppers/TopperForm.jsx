import { useState } from 'react'

const emptyForm = {
  name: '',
  className: '',
  board: '',
  percentage: '',
  session: '',
  rank: '',
  photo: '',
  published: false,
}

export default function TopperForm({ initialData, onSave, onCancel }) {
  const [form, setForm] = useState(() =>
    initialData ? { ...emptyForm, ...initialData } : emptyForm,
  )
  const [photoError, setPhotoError] = useState('')

  function updateField(event) {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Image must be 2 MB or smaller for this demo.')
      return
    }

    setPhotoError('')
    const reader = new FileReader()

    reader.onload = () => {
      setForm((current) => ({
        ...current,
        photo: String(reader.result),
      }))
    }

    reader.readAsDataURL(file)
  }

  function handleSubmit(event) {
    event.preventDefault()

    onSave({
      ...form,
      percentage: Number(form.percentage),
      rank: form.rank ? Number(form.rank) : '',
    })
  }

  const fieldClass =
    'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100'

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
    >
      <h2 className="text-xl font-bold text-slate-900">
        {initialData ? 'Edit Topper' : 'Add New Topper'}
      </h2>

      <div>
        <label className="text-sm font-semibold text-slate-700">
          Student name *
        </label>
        <input
          required
          name="name"
          value={form.name}
          onChange={updateField}
          className={fieldClass}
          placeholder="Enter full name"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-slate-700">
            Class *
          </label>
          <input
            required
            name="className"
            value={form.className}
            onChange={updateField}
            className={fieldClass}
            placeholder="e.g. 10 or 12"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">
            Board
          </label>
          <select
            name="board"
            value={form.board}
            onChange={updateField}
            className={fieldClass}
          >
            <option value="">Select board</option>
            <option value="CBSE">CBSE</option>
            <option value="BSEB">BSEB</option>
            <option value="ICSE">ICSE</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">
            Percentage *
          </label>
          <input
            required
            type="number"
            min="0"
            max="100"
            step="0.01"
            name="percentage"
            value={form.percentage}
            onChange={updateField}
            className={fieldClass}
            placeholder="e.g. 95.5"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">
            Rank
          </label>
          <input
            type="number"
            min="1"
            name="rank"
            value={form.rank}
            onChange={updateField}
            className={fieldClass}
            placeholder="e.g. 1"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-sm font-semibold text-slate-700">
            Academic session *
          </label>
          <input
            required
            name="session"
            value={form.session}
            onChange={updateField}
            className={fieldClass}
            placeholder="e.g. 2025–26"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">
          Student photo
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handlePhoto}
          className="mt-2 block w-full text-sm text-slate-600"
        />
        <p className="mt-1 text-xs text-slate-500">
          Demo only: choose an image up to 2 MB.
        </p>
        {photoError && (
          <p className="mt-2 text-sm text-red-600">{photoError}</p>
        )}
        {form.photo && (
          <img
            src={form.photo}
            alt="Student preview"
            className="mt-3 h-20 w-20 rounded-full object-cover"
          />
        )}
      </div>

      <label className="flex items-center gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name="published"
          checked={form.published}
          onChange={updateField}
          className="h-4 w-4"
        />
        Publish on the public homepage
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
        >
          {initialData ? 'Save Changes' : 'Add Topper'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}