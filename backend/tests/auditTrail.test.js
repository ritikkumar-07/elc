import assert from 'node:assert/strict'
import test from 'node:test'

import mongoose from 'mongoose'

import AuditLog from '../models/AuditLog.js'
import {
  recordAudit,
  sanitizeAuditMetadata,
} from '../utils/audit.js'

const actorId = new mongoose.Types.ObjectId()
const targetId = new mongoose.Types.ObjectId()

function request(overrides = {}) {
  return {
    user: { _id: actorId, role: 'admin' },
    ip: '203.0.113.10',
    requestId: 'request-123',
    get: (name) =>
      name === 'user-agent' ? 'ELC test browser' : undefined,
    ...overrides,
  }
}

test('audit metadata drops sensitive keys and redacts token-like strings', () => {
  const metadata = sanitizeAuditMetadata({
    classId: String(targetId),
    password: 'never-store-this',
    nested: {
      csrfToken: 'secret',
      note: 'normal note',
      authorization: 'Bearer abc',
    },
    note:
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature123',
    longValue: 'x'.repeat(500),
  })

  assert.equal(metadata.classId, String(targetId))
  assert.equal(metadata.password, undefined)
  assert.equal(metadata.note, '[redacted]')
  assert.equal(metadata.nested.csrfToken, undefined)
  assert.equal(metadata.nested.authorization, undefined)
  assert.equal(metadata.nested.note, 'normal note')
  assert.equal(metadata.longValue.length, 200)
})

test('audit metadata is bounded and rejects malformed keys', () => {
  const metadata = sanitizeAuditMetadata({
    'bad key': 'ignored',
    $where: 'ignored',
    nested: { one: { two: { three: 'too deep' } } },
    many: Array.from({ length: 30 }, (_, index) => index),
  })

  assert.equal(metadata['bad key'], undefined)
  assert.equal(metadata.$where, undefined)
  assert.equal(metadata.nested.one.two, '[truncated]')
  assert.equal(metadata.many.length, 20)

  const oversized = Object.fromEntries(
    Array.from({ length: 20 }, (_, index) => [
      `field${index}`,
      'x'.repeat(200),
    ]),
  )

  assert.deepEqual(sanitizeAuditMetadata(oversized), {
    truncated: true,
  })
})

test('recordAudit writes normalized, sanitized audit data', async () => {
  let written
  const req = request()

  const result = await recordAudit(
    req,
    {
      action: 'marks.saved',
      targetType: 'test',
      targetId,
      outcome: 'success',
      metadata: {
        saved: 12,
        password: 'do-not-write',
        nested: { token: 'do-not-write', kept: true },
      },
    },
    {
      force: true,
      writer: async (document) => {
        written = document
        return { _id: new mongoose.Types.ObjectId(), ...document }
      },
    },
  )

  assert.equal(written.actor, actorId)
  assert.equal(written.actorRole, 'admin')
  assert.equal(written.action, 'marks.saved')
  assert.equal(written.targetType, 'test')
  assert.equal(written.targetId, String(targetId))
  assert.equal(written.ip, '203.0.113.10')
  assert.equal(written.userAgent, 'ELC test browser')
  assert.equal(written.requestId, 'request-123')
  assert.equal(written.metadata.saved, 12)
  assert.equal(written.metadata.password, undefined)
  assert.equal(written.metadata.nested.token, undefined)
  assert.equal(written.metadata.nested.kept, true)
  assert.ok(result._id)
})

test('recordAudit skips writes while MongoDB is disconnected', async () => {
  const originalState = mongoose.connection.readyState
  let called = false

  mongoose.connection.readyState = 0

  try {
    const result = await recordAudit(
      request(),
      {
        action: 'user.updated',
        targetType: 'user',
        targetId,
      },
      {
        writer: async () => {
          called = true
        },
      },
    )

    assert.equal(result, null)
    assert.equal(called, false)
  } finally {
    mongoose.connection.readyState = originalState
  }
})

test('recordAudit does not throw when the writer fails', async () => {
  const result = await recordAudit(
    request(),
    {
      action: 'attendance.saved',
      targetType: 'attendance',
      targetId,
    },
    {
      force: true,
      writer: async () => {
        throw new Error('database unavailable')
      },
    },
  )

  assert.equal(result, null)
})

test('recordAudit rejects unsafe action names without throwing', async () => {
  let called = false

  const result = await recordAudit(
    request(),
    {
      action: 'marks.$where',
      targetType: 'test',
      targetId,
    },
    {
      force: true,
      writer: async () => {
        called = true
      },
    },
  )

  assert.equal(result, null)
  assert.equal(called, false)
})

test('audit documents are append-only at the model layer', async () => {
  await assert.rejects(
    AuditLog.updateOne({}, { $set: { outcome: 'failure' } }).exec(),
    /append-only/,
  )
  await assert.rejects(
    AuditLog.deleteOne({}).exec(),
    /append-only/,
  )
  await assert.rejects(
    AuditLog.findOneAndDelete({}).exec(),
    /append-only/,
  )
  await assert.rejects(
    AuditLog.bulkWrite([{ deleteOne: { filter: {} } }]),
    /append-only/,
  )
})

test('recordAudit falls back to the authenticated actor role', async () => {
  let written

  await recordAudit(
    request({ user: undefined }),
    {
      action: 'registration.approved',
      targetType: 'user',
      targetId,
      actorId,
    },
    {
      force: true,
      writer: async (document) => {
        written = document
      },
    },
  )

  assert.equal(written.actor, actorId)
  assert.equal(written.actorRole, 'system')
})
