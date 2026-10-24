import RevokedSession from '../models/RevokedSession.js'

export async function revokeSession(jti, expiresAt) {
  if (typeof jti !== 'string' || !jti) {
    throw new Error('A session identifier is required.')
  }

  const expiry =
    expiresAt instanceof Date && !Number.isNaN(expiresAt.getTime())
      ? expiresAt
      : new Date(Date.now() + 24 * 60 * 60 * 1000)

  try {
    await RevokedSession.updateOne(
      { jti },
      {
        $setOnInsert: {
          jti,
          expiresAt: expiry,
        },
      },
      { upsert: true },
    )
  } catch (error) {
    if (error?.code !== 11000) {
      throw error
    }
  }
}

export async function isSessionRevoked(jti) {
  if (typeof jti !== 'string' || !jti) {
    return false
  }

  const revoked = await RevokedSession.exists({ jti })
  return Boolean(revoked)
}
