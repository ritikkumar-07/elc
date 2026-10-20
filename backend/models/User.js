
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

    rollNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [30, 'Roll number cannot exceed 30 characters.'],
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters.'],
      default: '',
    },

    guardianName: {
      type: String,
      trim: true,
      maxlength: [100, 'Guardian name cannot exceed 100 characters.'],
      default: '',
    },

    guardianPhone: {
      type: String,
      trim: true,
      maxlength: [30, 'Guardian phone cannot exceed 30 characters.'],
      default: '',
    },

    admissionDate: {
      type: Date,
      default: null,
    },

    assignedClasses: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Class',
        },
      ],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

userSchema.index(
  { rollNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: 'student',
      rollNumber: { $exists: true, $type: 'string' },
    },
  },
)

userSchema.index({ role: 1, status: 1, class: 1 })

const User = mongoose.model('User', userSchema)

export default User
