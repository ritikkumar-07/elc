import mongoose from 'mongoose'

const studyMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
      maxlength: [160, 'Title cannot exceed 160 characters.'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters.'],
      default: '',
    },
    type: {
      type: String,
      enum: ['notes', 'question-paper', 'solution', 'syllabus', 'other'],
      default: 'notes',
      required: true,
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
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    storedName: {
      type: String,
      required: true,
      trim: true,
    },

    cloudinaryPublicId: {
      type: String,
      default: null,
    },
    cloudinaryResourceType: {
      type: String,
      default: 'raw',
    },
    cloudinaryDeliveryType: {
      type: String,
      enum: ['upload', 'authenticated'],
      default: 'upload',
    },
    cloudinaryUrl: {
      type: String,
      default: null,
    },

    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

studyMaterialSchema.index({ class: 1, subject: 1, type: 1, createdAt: -1 })

const StudyMaterial = mongoose.model(
  'StudyMaterial',
  studyMaterialSchema,
)

export default StudyMaterial