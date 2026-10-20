import mongoose from 'mongoose'

const historySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['created', 'updated', 'published', 'unpublished'],
      required: true,
    },
    previousMarks: {
      type: Number,
      default: null,
    },
    marksObtained: {
      type: Number,
      default: null,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
)

const markSchema = new mongoose.Schema(
  {
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    marksObtained: {
      type: Number,
      min: 0,
      default: null,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    assessmentStatus: {
      type: String,
      enum: {
        values: ['entered', 'absent', 'missing', 'exempt'],
        message: 'Invalid assessment status.',
      },
      default: 'entered',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    history: {
      type: [historySchema],
      default: [],
    },
  },
  { timestamps: true },
)

markSchema.index({ test: 1, student: 1 }, { unique: true })
markSchema.index({ student: 1, status: 1, publishedAt: -1 })
markSchema.index({ class: 1, status: 1, publishedAt: -1 })
markSchema.index({ test: 1, class: 1, assessmentStatus: 1 })

markSchema.pre('validate', function () {
  const status = this.assessmentStatus || 'entered'

  if (status === 'entered') {
    if (!Number.isFinite(this.marksObtained)) {
      this.invalidate(
        'marksObtained',
        'Entered marks must be a valid number.',
      )
      return
    }
  } else if (this.marksObtained != null) {
    this.invalidate(
      'marksObtained',
      'Marks must be empty for absent, missing, or exempt results.',
    )
    return
  }

  if (
    Number.isFinite(this.marksObtained) &&
    Number.isFinite(this.maxMarks) &&
    this.marksObtained > this.maxMarks
  ) {
    this.invalidate(
      'marksObtained',
      'Marks cannot exceed the test maximum.',
    )
  }
})

const Mark = mongoose.model('Mark', markSchema)

export default Mark
