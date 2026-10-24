import mongoose from 'mongoose'

import AuditLog from '../models/AuditLog.js'
import {
  invalidId,
  paginationMeta,
  parsePagination,
} from '../utils/query.js'

function auditResponse(entry) {
  return {
    id: String(entry._id),
    actor: entry.actor || null,
    actorRole: entry.actorRole,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId || null,
    outcome: entry.outcome,
    metadata: entry.metadata || {},
    ip: entry.ip || null,
    userAgent: entry.userAgent || null,
    requestId: entry.requestId || null,
    createdAt: entry.createdAt,
  }
}

function parseDate(value, fieldName) {
  if (!value) return { value: null }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return { error: fieldName }
  }

  return { value: date }
}

export async function listAuditLogs(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query)
    const filter = {}

    if (req.query.action) {
      filter.action = String(req.query.action).trim()
    }

    if (req.query.actor) {
      if (!mongoose.isValidObjectId(req.query.actor)) {
        return invalidId(res, 'actor ID')
      }

      filter.actor = req.query.actor
    }

    if (req.query.targetType) {
      filter.targetType = String(req.query.targetType).trim()
    }

    if (req.query.targetId) {
      filter.targetId = String(req.query.targetId).trim()
    }

    if (req.query.outcome) {
      if (
        !['success', 'denied', 'failure'].includes(
          req.query.outcome,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid audit outcome.',
        })
      }

      filter.outcome = req.query.outcome
    }

    const from = parseDate(req.query.from, 'from date')
    const to = parseDate(req.query.to, 'to date')

    if (from.error || to.error) {
      return invalidId(res, from.error || to.error)
    }

    if (from.value || to.value) {
      filter.createdAt = {}

      if (from.value) filter.createdAt.$gte = from.value
      if (to.value) filter.createdAt.$lte = to.value
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ])

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs.map(auditResponse),
      pagination: paginationMeta(total, page, limit),
    })
  } catch (error) {
    return next(error)
  }
}
