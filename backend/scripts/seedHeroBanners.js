
import 'dotenv/config'
import mongoose from 'mongoose'
import HeroBanner from '../models/HeroBanner.js'

const defaultBanners = [
  {
    eyebrow: 'PREPARE · PERFORM · PROGRESS',
    title: 'Take the Next Step in Your Education',
    description:
      'Stay connected with your institute and access student services through the ELC portal.',
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=2000&q=90',
    altText: 'Student studying and working on educational materials',
    order: 0,
    isPublished: true,
  },
  {
    eyebrow: 'LEARN · PRACTISE · ACHIEVE',
    title: 'Build Knowledge. Build Confidence.',
    description:
      'Strengthen your academic foundations through focused learning, regular practice, and guidance.',
    imageUrl:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=2000&q=90',
    altText: 'Students learning together in a classroom',
    order: 1,
    isPublished: true,
  },
  {
    eyebrow: 'YOUR GOALS · OUR GUIDANCE',
    title: 'Every Step Brings You Closer to Success.',
    description:
      'Discover learning resources, academic updates, and support for your educational journey.',
    imageUrl:
      'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=2000&q=90',
    altText: 'Students studying in an educational environment',
    order: 2,
    isPublished: true,
  },
]

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in backend/.env.')
  }

  await mongoose.connect(process.env.MONGODB_URI)

  const count = await HeroBanner.countDocuments()

  if (count > 0) {
    console.log(
      `Seed skipped: ${count} banner(s) already exist.`,
    )
    return
  }

  await HeroBanner.insertMany(defaultBanners)

  console.log(
    `Successfully inserted ${defaultBanners.length} hero banners.`,
  )
}

try {
  await seed()
} catch (error) {
  console.error('Hero banner seed failed:', error.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect().catch(() => {})
}
