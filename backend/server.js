import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'

import topperRoutes from './routes/topperRoutes.js'
import authRoutes from './routes/authRoutes.js'
import heroBannerRoutes from './routes/heroBannerRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import studentRoutes from './routes/studentRoutes.js'
import teacherRoutes from './routes/teacherRoutes.js'
import teacherPortalRoutes from './routes/teacherPortalRoutes.js'
import academicRoutes from './routes/academicRoutes.js'
import materialRoutes from './routes/materialRoutes.js'
import testRoutes from './routes/testRoutes.js'
import announcementRoutes from './routes/announcementRoutes.js'
import attendanceRoutes from './routes/attendanceRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import { noStore } from './middleware/cacheMiddleware.js'
import { csrfProtection } from './middleware/csrfMiddleware.js'
import { requestContext } from './middleware/requestContext.js'
import {
  parseTrustProxy,
  validateEnvironment,
} from './utils/environment.js'

const app = express()
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY))
const PORT = Number(process.env.PORT) || 5000

app.use(requestContext)
app.use(
  helmet({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false,
    },
  }),
)

function normalizeOrigin(value) {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

// const allowedOrigins = [
//   ...String(
//     process.env.FRONTEND_URL || 'http://localhost:5173',
//   ).split(','),
//   ...(process.env.LOCAL_NETWORK_IP
//     ? [`http://${process.env.LOCAL_NETWORK_IP}:5173`]
//     : []),
// ]
//   .map((value) => normalizeOrigin(value.trim()))
//   .filter(Boolean)
//   .filter((value, index, list) => list.indexOf(value) === index)


const allowedOrigins = [
  ...String(
    process.env.FRONTEND_URL || 'http://localhost:5173',
  ).split(','),

  // Capacitor Android app origin
  'https://localhost',

  ...(process.env.LOCAL_NETWORK_IP
    ? [`http://${process.env.LOCAL_NETWORK_IP}:5173`]
    : []),
]
  .map((value) => normalizeOrigin(value.trim()))
  .filter(Boolean)
  .filter((value, index, list) => list.indexOf(value) === index)


app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true)
      }

      return callback(
        null,
        allowedOrigins.includes(normalizeOrigin(origin)),
      )
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  }),
)

// Cookie-authenticated state changes must originate from a trusted site.
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  const origin = req.get('origin')
  const referer = req.get('referer')
  const requestOrigin = normalizeOrigin(origin || referer || '')

  if (!origin && !referer) {
    return next()
  }

  if (allowedOrigins.includes(requestOrigin)) {
    return next()
  }

  return res.status(403).json({
    success: false,
    code: 'ORIGIN_NOT_ALLOWED',
    message: 'Request origin is not allowed.',
  })
})

app.use(express.json({ limit: '128kb' }))
app.use(cookieParser())
app.use('/api', noStore)

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
})

app.use('/api', apiLimiter)
app.use(csrfProtection)

// API routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/toppers', topperRoutes)
app.use('/api/v1/hero-banners', heroBannerRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/students', studentRoutes)
app.use('/api/v1/teachers', teacherRoutes)
app.use('/api/v1/teacher', teacherPortalRoutes)
app.use('/api/v1/academics', academicRoutes)
app.use('/api/v1/materials', materialRoutes)
app.use('/api/v1/tests', testRoutes)
app.use('/api/v1/announcements', announcementRoutes)
app.use('/api/v1/attendance', attendanceRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/analytics', analyticsRoutes)

// Health check
app.get('/api/v1/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1

  res.status(connected ? 200 : 503).json({
    success: connected,
    message: connected
      ? 'ELC backend and database are running.'
      : 'Backend is running, but database is not connected.',
    database: connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})

// Unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.',
  })
})

// Central error handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  const requestPath = String(req.originalUrl || req.url || '').split(
    '?',
  )[0]
  const production = process.env.NODE_ENV === 'production'
  const detail = production
    ? `${err.name || 'Error'}${err.code ? ` (${err.code})` : ''}`
    : err.message

  console.error(
    `Request error [${req.requestId || 'no-request-id'}] ${req.method} ${requestPath}: ${detail}`,
  )

  res.status(err.status || 500).json({
    success: false,
    message: production
      ? err.safeMessage || 'An unexpected server error occurred.'
      : err.message,
    ...(err.partial === true ? { partial: true } : {}),
  })
})

function redactErrorMessage(message) {
  return String(message)
    .replace(/mongodb(\+srv)?:\/\/\S+/gi, 'mongodb[redacted]')
    .replace(
      /(JWT_SECRET|ADMIN_PASSWORD)\s*=\s*\S+/gi,
      '$1=[redacted]',
    )
}

// Start after MongoDB connects
async function startServer() {
  try {
    const environment = validateEnvironment()

    if (!environment.hasDatabaseName) {
      console.warn(
        'MONGODB_URI has no database name. MongoDB will use its default "test" database; add /<database> to the URI to make this explicit.',
      )
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    })

    console.log('MongoDB connected successfully.')
    console.log(`Database: ${mongoose.connection.name}`)

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`ELC backend running on port ${PORT}`)
      console.log(
        `Health check: http://localhost:${PORT}/api/v1/health`,
      )
    })
  } catch (error) {
    const message = redactErrorMessage(error.message)

    console.error('Backend startup failed:', message)

    if (/querySrv|ECONNREFUSED|ENOTFOUND|ETIMEOUT/i.test(message)) {
      console.error(
        'MongoDB DNS or network access failed. Check DNS, internet connectivity, and Atlas Network Access, then retry.',
      )
    }

    process.exit(1)
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer()
}

export { app }
