import mongoose from 'mongoose'

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required.'],
      trim: true,
      maxlength: [80, 'Subject name cannot exceed 80 characters.'],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [30, 'Subject code cannot exceed 30 characters.'],
      default: '',
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required.'],
      index: true,
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

subjectSchema.index({ class: 1, name: 1 }, { unique: true })

const Subject = mongoose.model('Subject', subjectSchema)

export default Subject
