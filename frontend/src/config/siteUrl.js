const localHostnames = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
])

export function normalizeSiteUrl(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    const url = new URL(withProtocol)
    if (url.protocol !== 'https:') return ''
    if (localHostnames.has(url.hostname.toLowerCase())) return ''
    if (url.username || url.password) return ''
    return url.origin
  } catch {
    return ''
  }
}
