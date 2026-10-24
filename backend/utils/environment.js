const VALID_NODE_ENVIRONMENTS = new Set([
  'development',
  'test',
  'production',
])

function hasDatabaseName(uri) {
  try {
    const parsed = new URL(
      uri.replace(/^mongodb(\+srv)?:\/\//i, 'http://'),
    )

    return Boolean(parsed.pathname.replace(/^\/+/, ''))
  } catch {
    return false
  }
}

function validateFrontendOrigins(value, production, problems) {
  if (!value) {
    if (production) {
      problems.push('FRONTEND_URL is required in production')
    }

    return
  }

  const origins = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (origins.length === 0) {
    problems.push('FRONTEND_URL must contain at least one origin')
    return
  }

  for (const origin of origins) {
    let parsed

    try {
      parsed = new URL(origin)
    } catch {
      problems.push(`FRONTEND_URL contains an invalid origin: ${origin}`)
      continue
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      problems.push(
        `FRONTEND_URL must use http or https: ${origin}`,
      )
      continue
    }

    if (production && parsed.protocol !== 'https:') {
      problems.push(
        'FRONTEND_URL origins must use https in production',
      )
    }
  }
}

export function parseTrustProxy(value = '1') {
  const normalized = String(value).trim().toLowerCase()

  if (normalized === 'false') return false

  const hops = Number(normalized)

  if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
    throw new Error(
      'TRUST_PROXY must be false or an integer from 0 to 10.',
    )
  }

  return hops
}

function validateCloudinary(env, production, problems) {
  const names = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ]
  const provided = names.filter((name) =>
    String(env[name] || '').trim(),
  )

  if (provided.length === 0) {
    if (production) {
      problems.push(
        'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required in production',
      )
    }

    return
  }

  if (provided.length !== names.length) {
    problems.push(
      `Cloudinary configuration must include all of: ${names.join(', ')}`,
    )
  }
}

export function validateEnvironment(env = process.env) {
  const problems = []
  const nodeEnvironment = String(env.NODE_ENV || '').trim()

  if (!nodeEnvironment) {
    problems.push('NODE_ENV is required')
  } else if (!VALID_NODE_ENVIRONMENTS.has(nodeEnvironment)) {
    problems.push(
      'NODE_ENV must be development, test, or production',
    )
  }

  const production = nodeEnvironment === 'production'

  if (!env.MONGODB_URI) {
    problems.push('MONGODB_URI is required')
  } else if (!/^mongodb(\+srv)?:\/\//i.test(env.MONGODB_URI)) {
    problems.push(
      'MONGODB_URI must start with mongodb:// or mongodb+srv://',
    )
  } else if (production && !hasDatabaseName(env.MONGODB_URI)) {
    problems.push(
      'MONGODB_URI must include a database name in production',
    )
  }

  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    problems.push('JWT_SECRET must contain at least 32 characters')
  }

  validateFrontendOrigins(env.FRONTEND_URL, production, problems)
  validateCloudinary(env, production, problems)

  if (problems.length > 0) {
    throw new Error(
      `Invalid environment configuration: ${problems.join('; ')}. Check backend/.env.`,
    )
  }

  return {
    nodeEnvironment,
    production,
    hasDatabaseName: hasDatabaseName(env.MONGODB_URI),
  }
}

export { hasDatabaseName }
