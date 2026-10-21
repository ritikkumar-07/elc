const configuredApiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || ''
).trim()

const developmentApiBaseUrl = import.meta.env.DEV
  ? 'http://localhost:5000'
  : ''

export const API_URL = (
  configuredApiBaseUrl || developmentApiBaseUrl
).replace(/\/+$/, '')

export const UNAUTHORIZED_EVENT = 'elc:unauthorized'

export class ApiError extends Error {
  constructor(message, status = 0, errors = [], code = '') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.code = code
  }
}

function apiUrl(path) {
  if (!API_URL) {
    throw new ApiError(
      'The ELC API URL is not configured. Set VITE_API_BASE_URL to the backend URL and rebuild the frontend.',
    )
  }

  return `${API_URL}${path}`
}

function notifyUnauthorized() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
}

export async function apiRequest(path, options = {}) {
  const {
    body,
    headers = {},
    skipAuthEvent = false,
    ...rest
  } = options

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
    response = await fetch(apiUrl(path), config)
  } catch (error) {
    if (error.name === 'AbortError') throw error
    if (error instanceof ApiError) throw error

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

  const failed = !response.ok || result.success === false

  if (failed && response.status === 401 && !skipAuthEvent) {
    notifyUnauthorized()
  }

  if (failed) {
    throw new ApiError(
      result.message || `Request failed with status ${response.status}.`,
      response.status,
      result.errors || [],
      result.code || '',
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
    response = await fetch(apiUrl(path), {
      credentials: 'include',
      cache: 'no-store',
    })
  } catch (error) {
    if (error instanceof ApiError) throw error

    throw new ApiError(
      'Cannot connect to the ELC server. Check that the backend is running.',
    )
  }

  if (response.status === 401) {
    notifyUnauthorized()
  }

  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new ApiError(
      result.message || 'The file could not be downloaded.',
      response.status,
      [],
      result.code || '',
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
