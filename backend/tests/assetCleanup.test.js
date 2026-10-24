import assert from 'node:assert/strict'
import test from 'node:test'

import cloudinary from '../config/cloudinary.js'
import {
  removeUploadedFile,
  removeUploadedFileStrict,
} from '../middleware/uploadMiddleware.js'

const originalDestroy = cloudinary.uploader.destroy

test.afterEach(() => {
  cloudinary.uploader.destroy = originalDestroy
})

test('strict asset cleanup confirms successful and missing deletions', async () => {
  let received

  cloudinary.uploader.destroy = async (publicId, options) => {
    received = { publicId, options }
    return { result: 'ok' }
  }

  const result = await removeUploadedFileStrict(
    'elc-toppers/photo',
    'image',
  )

  assert.equal(result.result, 'ok')
  assert.equal(received.publicId, 'elc-toppers/photo')
  assert.equal(received.options.invalidate, true)

  cloudinary.uploader.destroy = async () => ({
    result: 'not found',
  })

  const missing = await removeUploadedFileStrict(
    'elc-toppers/missing',
    'image',
  )

  assert.equal(missing.result, 'not found')
})

test('strict asset cleanup reports failures instead of silently succeeding', async () => {
  cloudinary.uploader.destroy = async () => {
    throw new Error('Cloudinary unavailable')
  }

  await assert.rejects(
    removeUploadedFileStrict('elc-toppers/photo', 'image'),
    (error) => {
      assert.equal(error.status, 502)
      assert.match(error.message, /could not be removed/)
      return true
    },
  )

  cloudinary.uploader.destroy = async () => ({
    result: 'error',
  })

  await assert.rejects(
    removeUploadedFileStrict('elc-toppers/photo', 'image'),
    /could not be removed/,
  )
})

test('best-effort cleanup still does not fail the primary operation', async () => {
  cloudinary.uploader.destroy = async () => {
    throw new Error('Cloudinary unavailable')
  }

  await assert.doesNotReject(
    removeUploadedFile('elc-materials/material', 'raw'),
  )
})
