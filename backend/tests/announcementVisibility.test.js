import assert from 'node:assert/strict'
import test from 'node:test'

import { publicVisibilityFilter } from '../controllers/announcementController.js'

test('public announcements require everyone audience and no class scope', () => {
  const now = new Date('2026-10-24T12:00:00.000Z')
  const filter = publicVisibilityFilter(now)

  assert.equal(filter.status, 'published')
  assert.equal(filter.isPublic, true)
  assert.equal(filter.audience, 'all')
  assert.deepEqual(filter.$and[0], {
    $or: [
      { class: null },
      { class: { $exists: false } },
    ],
  })
})
