import mongoose from 'mongoose'

const attendanceRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
  },
  { _id: false },
)

const attendanceSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Invalid attendance date.'],
    },
    session: {
      type: String,
      trim: true,
      maxlength: 40,
      default: 'full-day',
    },
    records: {
      type: [attendanceRecordSchema],
      default: [],
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

attendanceSchema.index(
  { class: 1, dateKey: 1, session: 1 },
  { unique: true },
)

const Attendance = mongoose.model('Attendance', attendanceSchema)

export default Attendance
