const PUBLIC_CACHE_CONTROL =
  'public, max-age=60, stale-while-revalidate=300'

export function noStore(req, res, next) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('Surrogate-Control', 'no-store')
  next()
}

export function setPublicCache(
  res,
  value = PUBLIC_CACHE_CONTROL,
) {
  res.removeHeader('Pragma')
  res.removeHeader('Expires')
  res.removeHeader('Surrogate-Control')
  res.setHeader('Cache-Control', value)
}
