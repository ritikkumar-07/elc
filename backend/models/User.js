
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

const User = mongoose.model('User', userSchema)

export default User
