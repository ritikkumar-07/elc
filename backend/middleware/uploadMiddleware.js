import crypto from 'crypto'
import path from 'path'
import multer from 'multer'

import cloudinary from '../config/cloudinary.js'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const photoExtensions = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
}
const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

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

const photoOnly = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_BYTES,
    files: 1,
  },
  fileFilter(req, file, callback) {
    const allowedExtensions = photoExtensions[file.mimetype]
    const extension = path.extname(file.originalname).toLowerCase()

    if (!allowedExtensions?.has(extension)) {
      const error = new Error('Unsupported topper photo type.')
      error.code = 'TOPPER_PHOTO_TYPE'
      return callback(error)
    }

    callback(null, true)
  },
})

export function isPdfBuffer(buffer) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 5 ||
    buffer.subarray(0, 5).toString('latin1') !== '%PDF-'
  ) {
    return false
  }

  const tail = buffer
    .subarray(Math.max(0, buffer.length - 2048))
    .toString('latin1')

  return tail.includes('%%EOF')
}

export function isImageBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) return false

  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff

  const isPng =
    buffer.length >= pngSignature.length &&
    buffer.subarray(0, pngSignature.length).equals(pngSignature)

  return isJpeg || isPng
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

export function uploadTopperPhoto(req, res, next) {
  photoOnly.single('photo')(req, res, (error) => {
    if (!error) {
      if (req.file && !isImageBuffer(req.file.buffer)) {
        return res.status(400).json({
          success: false,
          message: 'The uploaded photo is not a valid JPEG or PNG image.',
        })
      }

      return next()
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'The photo is too large. The maximum size is 5 MB.'
          : 'Upload a single JPEG or PNG photo using the photo field.'

      return res.status(400).json({
        success: false,
        message,
      })
    }

    if (error.code === 'TOPPER_PHOTO_TYPE') {
      return res.status(400).json({
        success: false,
        message: 'Only JPEG and PNG photos are supported.',
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
        type: 'authenticated',
        access_mode: 'authenticated',
        public_id: publicId,
        overwrite: false,
        format: 'pdf',
      },
      (error, result) => {
        if (error) return reject(error)

        if (
          !result?.public_id ||
          typeof result.secure_url !== 'string' ||
          !result.secure_url.startsWith('https://')
        ) {
          return reject(
            new Error('Cloudinary returned an invalid PDF asset.'),
          )
        }

        resolve(result)
      },
    )

    stream.end(file.buffer)
  })
}

export async function uploadTopperPhotoToCloudinary(file) {
  if (!file?.buffer) {
    throw new Error('Topper photo buffer is missing.')
  }

  const publicId = `elc-toppers/${crypto.randomUUID()}`

  let result

  try {
    result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: publicId,
          overwrite: false,
        },
        (error, uploaded) => {
          if (error) return reject(error)
          resolve(uploaded)
        },
      )

      stream.end(file.buffer)
    })
  } catch (error) {
    const uploadError = new Error(
      'The photo could not be uploaded. Please try again.',
    )
    uploadError.status = 502
    uploadError.cause = error
    throw uploadError
  }

  if (
    typeof result?.secure_url !== 'string' ||
    !result.secure_url.startsWith('https://')
  ) {
    const uploadError = new Error(
      'The photo could not be uploaded securely. Please try again.',
    )
    uploadError.status = 502
    throw uploadError
  }

  return result
}

export async function removeUploadedFile(
  publicId,
  resourceType = 'raw',
  deliveryType = 'upload',
) {
  if (!publicId) return

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: deliveryType,
      invalidate: true,
    })
  } catch (error) {
    console.error(
      'Unable to remove Cloudinary asset:',
      error.message,
    )
  }
}

export async function removeUploadedFileStrict(
  publicId,
  resourceType = 'raw',
  deliveryType = 'upload',
) {
  if (!publicId) return { result: 'skipped' }

  let result

  try {
    result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: deliveryType,
      invalidate: true,
    })
  } catch (error) {
    console.error(
      'Unable to remove Cloudinary asset:',
      error.message,
    )

    const cleanupError = new Error(
      'The media file could not be removed. The related record was not deleted. Please retry.',
    )
    cleanupError.status = 502
    cleanupError.safeMessage =
      'The media file could not be removed. The related record was not deleted. Please retry.'
    cleanupError.cause = error
    throw cleanupError
  }

  if (!['ok', 'not found'].includes(result?.result)) {
    const cleanupError = new Error(
      'The media file could not be removed. The related record was not deleted. Please retry.',
    )
    cleanupError.status = 502
    cleanupError.safeMessage =
      'The media file could not be removed. The related record was not deleted. Please retry.'
    throw cleanupError
  }

  return result
}
