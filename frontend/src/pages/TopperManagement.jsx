import { useCallback, useEffect, useState } from 'react'

import DashboardLayout from '../components/dashboard/DashboardLayout.jsx'
import {
  buttonPrimary,
  buttonSecondary,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
} from '../components/common/DashboardUI.jsx'
import TopperForm from '../components/toppers/TopperForm.jsx'
import TopperList from '../components/toppers/TopperList.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiRequest } from '../lib/api.js'

function getId(topper) {
  return topper.id || topper._id
}

export default function TopperManagement() {
  const { user, logout } = useAuth()
  const [toppers, setToppers] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const loadToppers = useCallback(async (signal) => {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/api/v1/toppers/manage', {
        signal,
      })
      setToppers(Array.isArray(result.data) ? result.data : [])
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Unable to load toppers.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadToppers(controller.signal)
    return () => controller.abort()
  }, [loadToppers])

  async function saveTopper(formData) {
    setBusy(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        name: formData.name.trim(),
        className: formData.className.trim(),
        board: formData.board,
        session: formData.session.trim(),
        percentage: Number(formData.percentage),
        rank: formData.rank || undefined,
        photoUrl: formData.photoUrl.trim(),
        description: formData.description.trim(),
        isPublished: Boolean(formData.isPublished),
      }

      if (editing) {
        await apiRequest(
          `/api/v1/toppers/${encodeURIComponent(getId(editing))}`,
          { method: 'PATCH', body: payload },
        )
        setNotice('Topper updated successfully.')
      } else {
        await apiRequest('/api/v1/toppers', {
          method: 'POST',
          body: payload,
        })
        setNotice('Topper added successfully.')
      }

      setEditing(null)
      setShowForm(false)
      await loadToppers()
    } catch (err) {
      setError(err.message || 'Unable to save the topper.')
    } finally {
      setBusy(false)
    }
  }

  async function togglePublish(topper) {
    setBusy(true)
    setError('')
    setNotice('')

    try {
      await apiRequest(
        `/api/v1/toppers/${encodeURIComponent(getId(topper))}`,
        {
          method: 'PATCH',
          body: { isPublished: !topper.isPublished },
        },
      )
      setNotice(
        topper.isPublished
          ? 'Topper unpublished.'
          : 'Topper published on the homepage.',
      )
      await loadToppers()
    } catch (err) {
      setError(err.message || 'Unable to change publishing status.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteTopper(topper) {
    if (
      !window.confirm(
        `Delete ${topper.name}'s topper record? This cannot be undone.`,
      )
    ) {
      return
    }

    setBusy(true)
    setError('')
    setNotice('')

    try {
      await apiRequest(
        `/api/v1/toppers/${encodeURIComponent(getId(topper))}`,
        { method: 'DELETE' },
      )
      setNotice('Topper deleted.')
      await loadToppers()
    } catch (err) {
      setError(err.message || 'Unable to delete the topper.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardLayout
      title="Topper Management"
      description="Manage student achievements shown on the public homepage."
      user={user}
      onLogout={logout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Public website"
          title="Topper management"
          description="Publish verified student achievements. Only published records appear on the public homepage."
          action={
            !showForm && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setShowForm(true)
                  setNotice('')
                }}
                className={buttonPrimary}
              >
                + Add new topper
              </button>
            )
          }
        />

        {error && <Notice tone="red">{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}

        {showForm && (
          <TopperForm
            key={editing ? getId(editing) : 'new-topper'}
            initialData={
              editing
                ? {
                    ...editing,
                    percentage:
                      editing.percentage ??
                      editing.marks ??
                      '',
                  }
                : null
            }
            onSave={saveTopper}
            onCancel={() => {
              setEditing(null)
              setShowForm(false)
            }}
          />
        )}

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                All student records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {toppers.length} record{toppers.length === 1 ? '' : 's'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadToppers()}
              disabled={loading || busy}
              className={buttonSecondary}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <LoadingState label="Loading toppers..." />
          ) : error && toppers.length === 0 ? (
            <ErrorState message={error} onRetry={() => loadToppers()} />
          ) : (
            <TopperList
              toppers={toppers}
              onEdit={(topper) => {
                setEditing(topper)
                setShowForm(true)
                setNotice('')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              onDelete={deleteTopper}
              onTogglePublish={togglePublish}
            />
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
