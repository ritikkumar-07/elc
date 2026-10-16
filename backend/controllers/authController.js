
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import User from '../models/User.js'

const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
  role: z.enum(['student', 'teacher']).default('student'),
})

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
})

const isProduction = process.env.NODE_ENV === 'production'

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
}

function createToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.')
  }

  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  )
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  }
}

// POST /api/v1/auth/signup
export async function signup(req, res, next) {
  try {
    const parsed = signupSchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signup details.',
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const name = parsed.data.name
    const email = parsed.data.email.toLowerCase()
    const password = parsed.data.password
    const role = parsed.data.role

    const existingUser = await User.findOne({ email }).lean()

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      status: role === 'teacher' ? 'pending' : 'active',
    })

    // Pending teachers must wait for admin approval.
    if (user.status !== 'active') {
      return res.status(201).json({
        success: true,
        message: 'Teacher registration submitted for admin approval.',
        user: publicUser(user),
      })
    }

    const token = createToken(user)

    res.cookie('elc_token', token, cookieOptions)

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: publicUser(user),
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    next(error)
  }
}

// POST /api/v1/auth/login
export async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body)

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email and password.',
      })
    }

    const email = parsed.data.email.toLowerCase()

    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    const passwordMatches = await bcrypt.compare(
      parsed.data.password,
      user.password
    )

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is awaiting admin approval.',
      })
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This account is not active.',
      })
    }

    const token = createToken(user)

    res.cookie('elc_token', token, cookieOptions)

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: publicUser(user),
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/v1/auth/logout
export function logout(req, res) {
  res.clearCookie('elc_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  })

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  })
}

// GET /api/v1/auth/me
export function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: publicUser(req.user),
  })
}
