
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'

import topperRoutes from './routes/topperRoutes.js'
import authRoutes from './routes/authRoutes.js'

const app = express()
const PORT = Number(process.env.PORT) || 5000

// 1. Security headers
app.use(helmet())

// 2. Allow requests from the frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// 3. Parse JSON and authentication cookies
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

// 4. Global API rate limiter
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

// Apply rate limiting to all /api routes
app.use('/api', apiLimiter)

// 5. API routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/toppers', topperRoutes)

// 6. Health check
app.get('/api/v1/health', (req, res) => {
  const isDatabaseConnected = mongoose.connection.readyState === 1

  res.status(isDatabaseConnected ? 200 : 503).json({
    success: isDatabaseConnected,
    message: isDatabaseConnected
      ? 'ELC backend and database are running.'
      : 'Backend is running, but database is not connected.',
    database: isDatabaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})

// 7. Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.',
  })
})

// 8. Central error handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  console.error('Request error:', err.message)

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected server error occurred.'
        : err.message,
  })
})

// 9. Connect to MongoDB before starting the server
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        'MONGODB_URI is missing. Check the backend/.env file.'
      )
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    })

    console.log('MongoDB Atlas connected successfully.')
    console.log(`Database: ${mongoose.connection.name}`)

    app.listen(PORT, () => {
      console.log(`ELC backend running on http://localhost:${PORT}`)
      console.log(
        `Health check: http://localhost:${PORT}/api/v1/health`
      )
    })
  } catch (error) {
    console.error('Backend startup failed:', error.message)
    process.exit(1)
  }
}

startServer()
