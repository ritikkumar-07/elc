function parseImageUrl(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return null

  if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return { relative: trimmed }
  }

  if (/^(?:data:image\/|blob:)/i.test(trimmed)) {
    return { passthrough: trimmed }
  }

  try {
    const url = new URL(trimmed)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return { url }
  } catch {
    return null
  }
}

export function supportsImageTransforms(value) {
  const parsed = parseImageUrl(value)
  if (!parsed?.url) return false

  return (
    parsed.url.hostname === 'images.unsplash.com' ||
    (parsed.url.hostname === 'res.cloudinary.com' &&
      parsed.url.pathname.includes('/image/upload/'))
  )
}

export function optimizedImageUrl(value, options = {}) {
  const parsed = parseImageUrl(value)
  if (!parsed) return ''
  if (parsed.relative || parsed.passthrough) {
    return parsed.relative || parsed.passthrough
  }

  const { url } = parsed
  const width = Number(options.width)
  const quality = Number(options.quality) || 75

  if (url.hostname === 'images.unsplash.com') {
    url.searchParams.set('auto', 'format')
    url.searchParams.set('fit', 'crop')
    url.searchParams.set('q', String(quality))

    if (Number.isFinite(width) && width > 0) {
      url.searchParams.set('w', String(Math.round(width)))
    }

    return url.toString()
  }

  if (
    url.hostname === 'res.cloudinary.com' &&
    url.pathname.includes('/image/upload/')
  ) {
    const marker = '/image/upload/'
    const markerIndex = url.pathname.indexOf(marker)
    const prefix = url.pathname.slice(0, markerIndex + marker.length)
    const remainder = url.pathname.slice(markerIndex + marker.length)
    const segments = remainder.split('/')

    if (segments[0] && !/^v\d+$/.test(segments[0])) {
      return url.toString()
    }

    const transforms = ['f_auto', 'q_auto:good', 'c_limit']

    if (Number.isFinite(width) && width > 0) {
      transforms.push(`w_${Math.round(width)}`)
    }

    url.pathname = `${prefix}${transforms.join(',')}/${remainder}`
    return url.toString()
  }

  return url.toString()
}

export function buildImageSrcSet(value, widths = [], options = {}) {
  if (!supportsImageTransforms(value)) return ''

  const seen = new Set()
  const candidates = widths
    .map((width) => Math.round(Number(width)))
    .filter((width) => Number.isFinite(width) && width > 0)
    .filter((width) => {
      if (seen.has(width)) return false
      seen.add(width)
      return true
    })
    .sort((left, right) => left - right)

  if (candidates.length === 0) return ''

  return candidates
    .map((width) => {
      const url = optimizedImageUrl(value, {
        ...options,
        width,
      })

      return url ? `${url} ${width}w` : ''
    })
    .filter(Boolean)
    .join(', ')
}
