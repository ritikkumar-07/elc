import mongoose from 'mongoose'

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
      maxlength: [180, 'Title cannot exceed 180 characters.'],
    },
    content: {
      type: String,
      required: [true, 'Content is required.'],
      trim: true,
      maxlength: [5000, 'Content cannot exceed 5000 characters.'],
    },
    audience: {
      type: String,
      enum: ['all', 'students', 'teachers'],
      default: 'all',
      index: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    publishAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
)

announcementSchema.index({ status: 1, audience: 1, publishAt: -1 })

const Announcement = mongoose.model(
  'Announcement',
  announcementSchema,
)

export default Announcement
