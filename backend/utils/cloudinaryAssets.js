import path from 'path'

import cloudinary from '../config/cloudinary.js'

const CLOUDINARY_HOST = 'res.cloudinary.com'
const DELIVERY_TYPES = new Set([
  'upload',
  'authenticated',
  'private',
])
const MAX_PDF_BYTES = 10 * 1024 * 1024
const FETCH_TIMEOUT_MS = 15000
const MATERIAL_URL_TTL_SECONDS = 5 * 60

export class AssetUnavailableError extends Error {
  constructor(message = 'The stored file is unavailable.') {
    super(message)
    this.name = 'AssetUnavailableError'
    this.status = 502
  }
}

export function isAllowedCloudinaryUrl(value) {
  try {
    const url = new URL(value)
    const cloudName = String(
      process.env.CLOUDINARY_CLOUD_NAME || '',
    ).trim()

    if (url.protocol !== 'https:') return false
    if (url.hostname !== CLOUDINARY_HOST) return false
    if (url.port && url.port !== '443') return false
    if (url.username || url.password) return false
    if (!cloudName) return false

    return url.pathname.startsWith(`/${cloudName}/`)
  } catch {
    return false
  }
}

export function cloudinaryPublicIdFromUrl(value, folder) {
  if (!isAllowedCloudinaryUrl(value)) return null

  try {
    const url = new URL(value)
    const cloudName = String(
      process.env.CLOUDINARY_CLOUD_NAME || '',
    ).trim()
    const segments = url.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))

    if (segments[0] !== cloudName) return null

    const deliveryIndex = segments.findIndex(
      (segment, index) =>
        index >= 1 && DELIVERY_TYPES.has(segment),
    )

    if (deliveryIndex === -1 || deliveryIndex + 1 >= segments.length) {
      return null
    }

    const idSegments = segments.slice(deliveryIndex + 1)

    if (/^v\d+$/.test(idSegments[0] || '')) {
      idSegments.shift()
    }

    let publicId = idSegments.join('/')

    if (!publicId) return null

    publicId = publicId.replace(/\.[a-z0-9]+$/i, '')

    if (folder && !publicId.startsWith(folder)) return null

    return publicId
  } catch {
    return null
  }
}

export function buildMaterialAssetUrl(material) {
  if (!material?.cloudinaryPublicId) return null

  const resourceType = material.cloudinaryResourceType || 'raw'
  const deliveryType = material.cloudinaryDeliveryType || 'upload'
  const cloudName = String(
    process.env.CLOUDINARY_CLOUD_NAME || '',
  ).trim()

  if (deliveryType === 'authenticated') {
    if (!cloudName) return null

    return cloudinary.url(material.cloudinaryPublicId, {
      resource_type: resourceType,
      type: 'authenticated',
      sign_url: true,
      secure: true,
      expires_at:
        Math.floor(Date.now() / 1000) +
        MATERIAL_URL_TTL_SECONDS,
    })
  }

  return material.cloudinaryUrl || null
}

export function safePdfFileName(value, fallback = 'material.pdf') {
  const base = path
    .basename(String(value || '').trim())
    .replace(/[\u0000-\u001f\u007f"\\/]/g, '_')
    .slice(0, 180)

  if (!base || base === '.' || base === '..') return fallback

  return base.toLowerCase().endsWith('.pdf')
    ? base
    : `${base}.pdf`
}

export async function fetchCloudinaryPdf(
  assetUrl,
  fetchImpl = globalThis.fetch,
) {
  if (!isAllowedCloudinaryUrl(assetUrl)) {
    throw new AssetUnavailableError()
  }

  let response

  try {
    response = await fetchImpl(assetUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'application/pdf' },
    })
  } catch {
    throw new AssetUnavailableError()
  }

  if (!response?.ok || !response.body) {
    throw new AssetUnavailableError()
  }

  const contentLength = Number(
    response.headers?.get?.('content-length'),
  )

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_PDF_BYTES
  ) {
    throw new AssetUnavailableError()
  }

  const contentType = String(
    response.headers?.get?.('content-type') || '',
  ).toLowerCase()

  if (
    contentType &&
    !contentType.startsWith('application/pdf') &&
    !contentType.startsWith('application/octet-stream')
  ) {
    throw new AssetUnavailableError()
  }

  const reader = response.body.getReader()
  const chunks = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      total += value.byteLength

      if (total > MAX_PDF_BYTES) {
        await reader.cancel()
        throw new AssetUnavailableError()
      }

      chunks.push(Buffer.from(value))
    }
  } catch (error) {
    if (error instanceof AssetUnavailableError) throw error
    throw new AssetUnavailableError()
  }

  if (total === 0) {
    throw new AssetUnavailableError()
  }

  return Buffer.concat(chunks, total)
}
