import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AssetUnavailableError,
  cloudinaryPublicIdFromUrl,
  fetchCloudinaryPdf,
  isAllowedCloudinaryUrl,
  safePdfFileName,
} from '../utils/cloudinaryAssets.js'

const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME

test.before(() => {
  process.env.CLOUDINARY_CLOUD_NAME = 'elc'
})

test.after(() => {
  if (originalCloudName === undefined) {
    delete process.env.CLOUDINARY_CLOUD_NAME
  } else {
    process.env.CLOUDINARY_CLOUD_NAME = originalCloudName
  }
})

function pdfResponse(buffer, headers = {}) {
  return {
    ok: true,
    body: new Response(buffer, { headers }).body,
    headers: new Headers({
      'content-type': 'application/pdf',
      ...headers,
    }),
  }
}

test('material URLs must be HTTPS Cloudinary assets for the configured cloud', () => {
  assert.equal(
    isAllowedCloudinaryUrl(
      'https://res.cloudinary.com/elc/raw/authenticated/v1/elc-materials/a.pdf',
    ),
    true,
  )
  assert.equal(
    isAllowedCloudinaryUrl(
      'http://res.cloudinary.com/elc/raw/authenticated/a.pdf',
    ),
    false,
  )
  assert.equal(
    isAllowedCloudinaryUrl(
      'https://res.cloudinary.com/other/raw/upload/a.pdf',
    ),
    false,
  )
  assert.equal(
    isAllowedCloudinaryUrl('https://example.com/a.pdf'),
    false,
  )
  assert.equal(
    isAllowedCloudinaryUrl(
      'https://user:pass@res.cloudinary.com/elc/raw/upload/a.pdf',
    ),
    false,
  )
  assert.equal(
    isAllowedCloudinaryUrl(
      'https://res.cloudinary.com:8443/elc/raw/upload/a.pdf',
    ),
    false,
  )
})

test('Cloudinary public IDs are extracted only from the approved folder', () => {
  assert.equal(
    cloudinaryPublicIdFromUrl(
      'https://res.cloudinary.com/elc/image/upload/v123/elc-toppers/photo.jpg',
      'elc-toppers/',
    ),
    'elc-toppers/photo',
  )
  assert.equal(
    cloudinaryPublicIdFromUrl(
      'https://res.cloudinary.com/elc/image/authenticated/v123/elc-toppers/photo.png',
      'elc-toppers/',
    ),
    'elc-toppers/photo',
  )
  assert.equal(
    cloudinaryPublicIdFromUrl(
      'https://res.cloudinary.com/elc/image/upload/v123/other/photo.jpg',
      'elc-toppers/',
    ),
    null,
  )
  assert.equal(
    cloudinaryPublicIdFromUrl(
      'https://example.com/image/upload/elc-toppers/photo.jpg',
      'elc-toppers/',
    ),
    null,
  )
})

test('PDF download names are stripped of paths and control characters', () => {
  assert.equal(
    safePdfFileName('../../question\r\npaper.pdf'),
    'question__paper.pdf',
  )
  assert.equal(safePdfFileName(''), 'material.pdf')
  assert.equal(safePdfFileName('notes'), 'notes.pdf')
})

test('material proxy rejects non-Cloudinary URLs before fetching', async () => {
  let fetched = false

  await assert.rejects(
    fetchCloudinaryPdf('https://example.com/internal', async () => {
      fetched = true
    }),
    AssetUnavailableError,
  )

  assert.equal(fetched, false)
})

test('material proxy rejects wrong content types and oversized responses', async () => {
  await assert.rejects(
    fetchCloudinaryPdf(
      'https://res.cloudinary.com/elc/raw/upload/a.pdf',
      async () =>
        pdfResponse(Buffer.from('<html></html>'), {
          'content-type': 'text/html',
        }),
    ),
    AssetUnavailableError,
  )

  await assert.rejects(
    fetchCloudinaryPdf(
      'https://res.cloudinary.com/elc/raw/upload/a.pdf',
      async () =>
        pdfResponse(Buffer.from('%PDF-1.7\n%%EOF'), {
          'content-length': String(10 * 1024 * 1024 + 1),
        }),
    ),
    AssetUnavailableError,
  )
})

test('material proxy returns PDF bytes for an allowed asset', async () => {
  const pdf = Buffer.from('%PDF-1.7\ncontent\n%%EOF')

  const result = await fetchCloudinaryPdf(
    'https://res.cloudinary.com/elc/raw/authenticated/a.pdf',
    async () => pdfResponse(pdf),
  )

  assert.deepEqual(result, pdf)
})
