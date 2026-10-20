import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

import multer from 'multer'

const uploadDirectory = path.resolve(
  process.env.UPLOAD_DIR || 'uploads',
)

fs.mkdirSync(uploadDirectory, { recursive: true })

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadDirectory)
  },
  filename(req, file, callback) {
    callback(null, `${Date.now()}-${crypto.randomUUID()}.pdf`)
  },
})

const pdfOnly = multer({
  storage,
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

    return callback(null, true)
  },
})

export function uploadPdf(req, res, next) {
  pdfOnly.single('file')(req, res, (error) => {
    if (!error) {
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

    return next(error)
  })
}

export function uploadedFilePath(storedName) {
  return path.join(uploadDirectory, path.basename(storedName))
}

export function removeUploadedFile(storedName) {
  if (!storedName) return

  const filePath = uploadedFilePath(storedName)

  fs.promises.unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') {
      console.error('Unable to remove uploaded file:', error.message)
    }
  })
}
