
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

const app = express()
const PORT = Number(process.env.PORT) || 5000

// Security headers
app.use(helmet())

// Allow requests from our frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// Limit JSON request body size
app.use(express.json({ limit: '10kb' }))

// Basic API rate limiting
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

// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ELC backend is running.',
    timestamp: new Date().toISOString(),
  })
})

// Handle unknown routes
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

  console.error('Request error:', err.message)

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected server error occurred.'
        : err.message,
  })
})

app.listen(PORT, () => {
  console.log(`ELC backend running on http://localhost:${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`)
})
