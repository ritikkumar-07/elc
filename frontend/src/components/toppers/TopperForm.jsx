import { useState } from 'react'

import { inputClass } from '../common/DashboardUI.jsx'

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

export default function TopperForm({ initialData, onSave, onCancel }) {
  const [form, setForm] = useState(() =>
    initialData ? { ...emptyForm, ...initialData } : emptyForm,
  )

  function updateField(event) {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    onSave({
      ...form,
      percentage: Number(form.percentage),
      rank: form.rank ? Number(form.rank) : undefined,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      <h2 className="text-xl font-bold text-slate-900">
        {initialData ? 'Edit topper' : 'Add new topper'}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Student name *
          <input
            required
            name="name"
            value={form.name}
            onChange={updateField}
            className={`${inputClass} mt-2`}
            placeholder="Enter full name"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Class *
          <input
            required
            name="className"
            value={form.className}
            onChange={updateField}
            className={`${inputClass} mt-2`}
            placeholder="e.g. 10 or 12"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Board *
          <select
            required
            name="board"
            value={form.board}
            onChange={updateField}
            className={`${inputClass} mt-2`}
          >
            <option value="">Select board</option>
            <option value="CBSE">CBSE</option>
            <option value="BSEB">BSEB</option>
            <option value="ICSE">ICSE</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Percentage *
          <input
            required
            type="number"
            min="0"
            max="100"
            step="0.01"
            name="percentage"
            value={form.percentage}
            onChange={updateField}
            className={`${inputClass} mt-2`}
            placeholder="e.g. 95.5"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Rank
          <input
            type="number"
            min="1"
            name="rank"
            value={form.rank}
            onChange={updateField}
            className={`${inputClass} mt-2`}
            placeholder="e.g. 1"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Academic session *
          <input
            required
            name="session"
            value={form.session}
            onChange={updateField}
            className={`${inputClass} mt-2`}
            placeholder="e.g. 2025-26"
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Student photo URL
          <input
            type="url"
            name="photoUrl"
            value={form.photoUrl}
            onChange={updateField}
            className={`${inputClass} mt-2`}
            placeholder="https://example.com/student.jpg"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Leave blank to show the student's initial instead.
          </span>
        </label>

        <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={updateField}
            className={`${inputClass} mt-2 resize-y`}
            rows={3}
            maxLength={500}
            placeholder="Optional achievement note"
          />
        </label>
      </div>

      <label className="flex items-center gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name="isPublished"
          checked={form.isPublished}
          onChange={updateField}
          className="h-4 w-4"
        />
        Publish on the public homepage
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="rounded-xl bg-[#19366e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#122951]"
        >
          {initialData ? 'Save changes' : 'Add topper'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
