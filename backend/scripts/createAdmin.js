
import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'

async function createAdmin() {
  const name = process.env.ADMIN_NAME?.trim()
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD

  if (!name || !email || !password) {
    throw new Error(
      'ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required.'
    )
  }

  if (password.length < 8 || password.length > 72) {
    throw new Error('Admin password must be 8–72 characters.')
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })

  const existing = await User.findOne({ email })

  if (existing) {
    throw new Error(
      'This email already exists. No account was changed.'
    )
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await User.create({
    name,
    email,
    password: hashedPassword,
    role: 'admin',
    status: 'active',
  })

  console.log(`Admin account created for ${email}.`)
}

try {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from backend/.env.')
  }

  await createAdmin()
} catch (error) {
  console.error('Admin setup failed:', error.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect().catch(() => {})
}
