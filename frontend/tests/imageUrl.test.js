import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildImageSrcSet,
  optimizedImageUrl,
  supportsImageTransforms,
} from '../src/lib/imageUrl.js'

test('Cloudinary images receive bounded automatic transformations', () => {
  const source =
    'https://res.cloudinary.com/demo/image/upload/v123/elc-toppers/photo.jpg'

  assert.equal(supportsImageTransforms(source), true)
  assert.equal(
    optimizedImageUrl(source, { width: 640, quality: 78 }),
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:good,c_limit,w_640/v123/elc-toppers/photo.jpg',
  )
})

test('existing Cloudinary transformations are not duplicated', () => {
  const source =
    'https://res.cloudinary.com/demo/image/upload/w_500/v123/photo.jpg'

  assert.equal(optimizedImageUrl(source, { width: 640 }), source)
})

test('Unsplash images get responsive width, quality, and format parameters', () => {
  const source =
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=2000&q=90'
  const optimized = new URL(optimizedImageUrl(source, { width: 1280 }))

  assert.equal(optimized.searchParams.get('w'), '1280')
  assert.equal(optimized.searchParams.get('q'), '75')
  assert.equal(optimized.searchParams.get('auto'), 'format')
})

test('src sets are sorted, unique, and only created for supported hosts', () => {
  const source =
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=2000&q=90'
  const srcSet = buildImageSrcSet(source, [1280, 640, 1280])

  assert.match(srcSet, /w=640&q=75 640w/)
  assert.match(srcSet, /w=1280&q=75 1280w/)
  assert.equal((srcSet.match(/1280w/g) || []).length, 1)
  assert.equal(
    buildImageSrcSet('https://example.com/photo.jpg', [640, 1280]),
    '',
  )
})

test('safe local previews pass through and unsafe protocols are rejected', () => {
  assert.equal(optimizedImageUrl('/toppers/student.jpg'), '/toppers/student.jpg')
  assert.equal(
    optimizedImageUrl('blob:https://example.com/preview'),
    'blob:https://example.com/preview',
  )
  assert.equal(optimizedImageUrl('javascript:alert(1)'), '')
})
