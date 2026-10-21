import assert from 'node:assert/strict'
import test from 'node:test'

import { isPdfBuffer } from '../middleware/uploadMiddleware.js'

test('isPdfBuffer accepts content with a PDF signature', () => {
  assert.equal(
    isPdfBuffer(Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n')),
    true,
  )
})

test('isPdfBuffer rejects mislabeled and truncated uploads', () => {
  assert.equal(isPdfBuffer(Buffer.from('<html>not a pdf</html>')), false)
  assert.equal(isPdfBuffer(Buffer.from('%PDF')), false)
  assert.equal(isPdfBuffer(Buffer.alloc(0)), false)
  assert.equal(isPdfBuffer('some string'), false)
})
