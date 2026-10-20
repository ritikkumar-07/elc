export const API_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
).replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status = 0, errors = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export async function apiRequest(path, options = {}) {
  const { body, headers = {}, ...rest } = options
  const config = {
    credentials: 'include',
    cache: 'no-store',
    ...rest,
    headers: { ...headers },
  }

  if (body !== undefined) {
    if (body instanceof FormData) {
      config.body = body
    } else {
      config.body = JSON.stringify(body)
      config.headers['Content-Type'] = 'application/json'
    }
  }

  let response

  try {
    response = await fetch(`${API_URL}${path}`, config)
  } catch (error) {
    if (error.name === 'AbortError') throw error

    throw new ApiError(
      'Cannot connect to the ELC server. Check that the backend is running.',
    )
  }

  const text = await response.text()
  let result = {}

  if (text) {
    try {
      result = JSON.parse(text)
    } catch {
      result = {}
    }
  }

  if (response.status === 401) {
    window.dispatchEvent(new Event('elc:unauthorized'))
  }

  if (!response.ok || result.success === false) {
    throw new ApiError(
      result.message || `Request failed with status ${response.status}.`,
      response.status,
      result.errors || [],
    )
  }

  return result
}

export function buildQuery(params = {}) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  }

  const text = query.toString()
  return text ? `?${text}` : ''
}

export async function downloadFile(path, fileName) {
  let response

  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(
      'Cannot connect to the ELC server. Check that the backend is running.',
    )
  }

  if (response.status === 401) {
    window.dispatchEvent(new Event('elc:unauthorized'))
  }

  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new ApiError(
      result.message || 'The file could not be downloaded.',
      response.status,
    )
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName || 'study-material.pdf'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(url)
}
