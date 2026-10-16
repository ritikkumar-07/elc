
import mongoose from 'mongoose'

const topperSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    photoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    board: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    session: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    marks: {
      type: Number,
      required: true,
      min: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    rank: {
      type: Number,
      min: 1,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

topperSchema.pre('validate', function () {
  if (this.marks > this.totalMarks) {
    this.invalidate('marks', 'Marks cannot exceed total marks.')
  }

  if (this.totalMarks > 0 && this.marks >= 0) {
    this.percentage = Number(
      ((this.marks / this.totalMarks) * 100).toFixed(2)
    )
  }
})

const Topper = mongoose.model('Topper', topperSchema)

export default Topper
