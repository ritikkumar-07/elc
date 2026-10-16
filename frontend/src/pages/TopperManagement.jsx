import { useState } from 'react'
import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import TopperForm from '../components/toppers/TopperForm.jsx'
import TopperList from '../components/toppers/TopperList.jsx'

export default function TopperManagement() {
  const [toppers, setToppers] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')

  function saveTopper(formData) {
    if (editing) {
      setToppers((current) =>
        current.map((item) =>
          item.id === editing.id ? { ...item, ...formData } : item,
        ),
      )
      setNotice('Topper updated in temporary demo state.')
    } else {
      setToppers((current) => [
        ...current,
        { ...formData, id: crypto.randomUUID() },
      ])
      setNotice('Topper added to temporary demo state.')
    }

    setEditing(null)
    setShowForm(false)
  }

  function editTopper(topper) {
    setEditing(topper)
    setShowForm(true)
    setNotice('')
  }

  function deleteTopper(id) {
    if (!window.confirm('Delete this topper from the demo list?')) return

    setToppers((current) => current.filter((item) => item.id !== id))
    setNotice('Topper removed from temporary demo state.')
  }

  function togglePublish(id) {
    setToppers((current) =>
      current.map((item) =>
        item.id === id ? { ...item, published: !item.published } : item,
      ),
    )
    setNotice('Publishing status changed in temporary demo state.')
  }

  return (
    <DashboardLayout
      title="Topper Management"
      description="Add and manage student achievement records."
    >
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <strong>Demo mode:</strong> Changes are stored only in this page's
        memory. Refreshing the page will clear them. This page is not protected
        by real login or role permissions yet.
      </div>

      {notice && (
        <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          {notice}
        </p>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setShowForm(true)
            setNotice('')
          }}
          className="rounded-xl bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-800"
        >
          + Add New Topper
        </button>
      )}

      {showForm && (
        <TopperForm
          key={editing?.id || 'new-topper'}
          initialData={editing}
          onSave={saveTopper}
          onCancel={() => {
            setEditing(null)
            setShowForm(false)
          }}
        />
      )}

      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">
            All Student Records
          </h2>
          <span className="text-sm text-slate-500">
            {toppers.length} record(s)
          </span>
        </div>

        <TopperList
          toppers={toppers}
          onEdit={editTopper}
          onDelete={deleteTopper}
          onTogglePublish={togglePublish}
        />
      </section>
    </DashboardLayout>
  )
}