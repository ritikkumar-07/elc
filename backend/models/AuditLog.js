import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ['admin', 'teacher', 'student', 'system'],
      default: 'system',
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      match: [/^[a-z][a-z0-9._-]*$/, 'Invalid audit action.'],
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      match: [/^[a-z][a-z0-9._-]*$/, 'Invalid audit target type.'],
      index: true,
    },
    targetId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
    },
    outcome: {
      type: String,
      enum: ['success', 'denied', 'failure'],
      default: 'success',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: null,
      maxlength: 100,
    },
    userAgent: {
      type: String,
      default: null,
      maxlength: 300,
    },
    requestId: {
      type: String,
      default: null,
      maxlength: 64,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
)

auditLogSchema.index({ actor: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 })
auditLogSchema.index({ createdAt: -1 })

async function rejectAuditMutation() {
  throw new Error('Audit log records are append-only.')
}

for (const operation of [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'deleteOne',
  'deleteMany',
  'replaceOne',
  'bulkWrite',
]) {
  auditLogSchema.pre(operation, rejectAuditMutation)
}

const AuditLog = mongoose.model('AuditLog', auditLogSchema)

export default AuditLog
