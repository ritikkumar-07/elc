import mongoose from 'mongoose'

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Test title is required.'],
      trim: true,
      maxlength: [160, 'Title cannot exceed 160 characters.'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
      default: '',
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class is required.'],
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true,
    },
    maxMarks: {
      type: Number,
      required: [true, 'Maximum marks are required.'],
      min: [1, 'Maximum marks must be at least 1.'],
      max: [10000, 'Maximum marks cannot exceed 10000.'],
    },
    passingMarks: {
      type: Number,
      min: [0, 'Passing marks cannot be negative.'],
      max: [10000, 'Passing marks cannot exceed 10000.'],
      default: null,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    resultsPublishedAt: {
      type: Date,
      default: null,
    },
    resultsPublishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
)

testSchema.pre('validate', function () {
  if (
    Number.isFinite(this.passingMarks) &&
    Number.isFinite(this.maxMarks) &&
    this.passingMarks > this.maxMarks
  ) {
    this.invalidate(
      'passingMarks',
      'Passing marks cannot exceed the test maximum.',
    )
  }
})

testSchema.index({ class: 1, scheduledAt: -1 })
testSchema.index({ class: 1, subject: 1, scheduledAt: -1 })
testSchema.index({ status: 1, class: 1 })

const Test = mongoose.model('Test', testSchema)

export default Test
