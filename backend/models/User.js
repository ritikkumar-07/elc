
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long.'],
      maxlength: [100, 'Name cannot exceed 100 characters.'],
    },

    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email cannot exceed 254 characters.'],
    },

    password: {
      type: String,
      required: [true, 'Password is required.'],
      select: false,
    },

    role: {
      type: String,
      enum: {
        values: ['student', 'teacher', 'admin'],
        message: 'Invalid user role.',
      },
      default: 'student',
      required: true,
    },

    status: {
      type: String,
      enum: {
        values: ['pending', 'active', 'rejected', 'suspended'],
        message: 'Invalid account status.',
      },
      default: 'pending',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

const User = mongoose.model('User', userSchema)

export default User
