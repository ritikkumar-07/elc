
import multer from 'multer'
import crypto from 'crypto'
import path from 'path'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

const pdfOnly = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, callback) {
    const isPdf =
      file.mimetype === 'application/pdf' &&
      path.extname(file.originalname).toLowerCase() === '.pdf'

    if (!isPdf) {
      return callback(
        new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'),
      )
    }

    callback(null, true)
  },
})

export function isPdfBuffer(buffer) {
  return (
    Buffer.isBuffer(buffer) &&
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString('latin1') === '%PDF-'
  )
}

export function uploadPdf(req, res, next) {
  pdfOnly.single('file')(req, res, (error) => {
    if (!error) {
      if (req.file && !isPdfBuffer(req.file.buffer)) {
        return res.status(400).json({
          success: false,
          message: 'The uploaded file is not a valid PDF document.',
        })
      }

      return next()
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'The PDF is too large. The maximum size is 10 MB.'
          : 'Upload a single PDF file using the file field.'

      return res.status(400).json({
        success: false,
        message,
      })
    }

    next(error)
  })
}

export async function uploadPdfToCloudinary(file) {
  if (!file?.buffer) {
    throw new Error('PDF file buffer is missing.')
  }

  const publicId = `elc-materials/${crypto.randomUUID()}.pdf`

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        public_id: publicId,
        overwrite: false,
        format: 'pdf',
      },
      (error, result) => {
        if (error) return reject(error)
        resolve(result)
      },
    )

    stream.end(file.buffer)
  })
}

export async function removeUploadedFile(publicId) {
  if (!publicId) return

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
      invalidate: true,
    })
  } catch (error) {
    console.error('Unable to remove Cloudinary PDF:', error.message)
  }
}