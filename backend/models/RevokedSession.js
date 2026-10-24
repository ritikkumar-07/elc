import mongoose from 'mongoose'

const revokedSessionSchema = new mongoose.Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

revokedSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const RevokedSession = mongoose.model(
  'RevokedSession',
  revokedSessionSchema,
)

export default RevokedSession
