import mongoose from 'mongoose'

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required.'],
      trim: true,
      maxlength: [60, 'Class name cannot exceed 60 characters.'],
    },
    section: {
      type: String,
      trim: true,
      maxlength: [20, 'Section cannot exceed 20 characters.'],
      default: '',
    },
    academicYear: {
      type: String,
      trim: true,
      maxlength: [30, 'Academic year cannot exceed 30 characters.'],
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters.'],
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

classSchema.index(
  { name: 1, section: 1, academicYear: 1 },
  { unique: true },
)

const Class = mongoose.model('Class', classSchema)

export default Class
