import mongoose from 'mongoose'

import AuditLog from '../models/AuditLog.js'

const MAX_METADATA_BYTES = 2048
const MAX_METADATA_KEYS = 20
const MAX_METADATA_DEPTH = 3
const SENSITIVE_KEY =
  /pass(?:word)?|token|secret|cookie|authorization|csrf|jwt|api[_-]?key/i
const JWT_VALUE =
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/

function sanitizeString(value) {
  const cleaned = String(value)
    .replace(JWT_VALUE, '[redacted]')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .slice(0, 200)

  return cleaned
}

function sanitizeValue(value, depth) {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') return sanitizeString(value)
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value.toISOString()
  }
  if (depth >= MAX_METADATA_DEPTH) return '[truncated]'

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_METADATA_KEYS)
      .map((item) => sanitizeValue(item, depth + 1))
  }

  if (typeof value === 'object') {
    const result = {}

    for (const [key, item] of Object.entries(value)) {
      if (Object.keys(result).length >= MAX_METADATA_KEYS) break
      if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(key)) continue
      if (SENSITIVE_KEY.test(key)) continue

      result[key] = sanitizeValue(item, depth + 1)
    }

    return result
  }

  return null
}

export function sanitizeAuditMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return {}

  const sanitized = sanitizeValue(metadata, 0)

  if (
    Buffer.byteLength(JSON.stringify(sanitized), 'utf8') >
    MAX_METADATA_BYTES
  ) {
    return { truncated: true }
  }

  return sanitized
}

function normalizeAction(value) {
  const action = String(value || '').trim()

  if (!/^[a-z][a-z0-9._-]{0,99}$/.test(action)) {
    throw new Error('A valid audit action is required.')
  }

  return action
}

function normalizeTargetId(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return String(value).slice(0, 100)
}

function normalizeActor(req, event) {
  const actor = req.user?._id || event.actorId || null

  return actor && mongoose.isValidObjectId(actor)
    ? actor
    : null
}

function normalizeActorRole(req, event) {
  const role = req.user?.role || event.actorRole || 'system'
  return ['admin', 'teacher', 'student', 'system'].includes(role)
    ? role
    : 'system'
}

function requestIp(req) {
  const value = req.ip || req.socket?.remoteAddress || null
  return value ? String(value).slice(0, 100) : null
}

function requestUserAgent(req) {
  const value = req.get?.('user-agent') || null
  return value
    ? String(value)
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .slice(0, 300)
    : null
}

export async function recordAudit(req, event, options = {}) {
  const writer = options.writer || AuditLog.create
  const force = options.force === true

  if (!force && mongoose.connection.readyState !== 1) {
    console.warn(
      'Audit event skipped because MongoDB is not connected:',
      String(event?.action || 'unknown'),
    )
    return null
  }

  try {
    const action = normalizeAction(event?.action)
    const targetType = normalizeAction(event?.targetType)

    return await writer({
      actor: normalizeActor(req, event),
      actorRole: normalizeActorRole(req, event),
      action,
      targetType,
      targetId: normalizeTargetId(event?.targetId),
      outcome: ['success', 'denied', 'failure'].includes(
        event?.outcome,
      )
        ? event.outcome
        : 'success',
      metadata: sanitizeAuditMetadata(event?.metadata),
      ip: requestIp(req),
      userAgent: requestUserAgent(req),
      requestId: req.requestId
        ? String(req.requestId).slice(0, 64)
        : null,
    })
  } catch (error) {
    console.error(
      'Audit log write failed:',
      String(event?.action || 'unknown'),
      error?.name || 'Error',
    )
    return null
  }
}
