
import mongoose from 'mongoose'

const heroBannerSchema = new mongoose.Schema(
  {
    eyebrow: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    imageUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: {
        validator(value) {
          try {
            const url = new URL(value)
            return ['http:', 'https:'].includes(url.protocol)
          } catch {
            return false
          }
        },
        message: 'Image URL must be a valid HTTP or HTTPS URL.',
      },
    },

    altText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    order: {
      type: Number,
      default: 0,
      min: 0,
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

heroBannerSchema.index({
  isPublished: 1,
  order: 1,
  createdAt: 1,
})

const HeroBanner = mongoose.model(
  'HeroBanner',
  heroBannerSchema,
)

export default HeroBanner
