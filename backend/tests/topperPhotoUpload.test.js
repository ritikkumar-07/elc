import assert from 'node:assert/strict'
import test from 'node:test'

import express from 'express'
import jwt from 'jsonwebtoken'

import cloudinary from '../config/cloudinary.js'
import Topper from '../models/Topper.js'
import User from '../models/User.js'
import {
  allowRoles,
} from '../middleware/authMiddleware.js'
import {
  isImageBuffer,
  uploadTopperPhoto,
  uploadTopperPhotoToCloudinary,
} from '../middleware/uploadMiddleware.js'
import topperRoutes, {
  createSchema,
  selectPhotoUrl,
  updateSchema,
} from '../routes/topperRoutes.js'

const jpegBytes = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
])
const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${server.address().port}`,
      })
    })

    server.on('error', reject)
  })
}

function close(server) {
  return new Promise((resolve) => server.close(resolve))
}

function photoForm(buffer, name, type) {
  const form = new FormData()
  form.append('photo', new Blob([buffer], { type }), name)
  return form
}

test('isImageBuffer accepts JPEG and PNG signatures only', () => {
  assert.equal(isImageBuffer(jpegBytes), true)
  assert.equal(isImageBuffer(pngBytes), true)
  assert.equal(isImageBuffer(Buffer.from('<html>not an image</html>')), false)
  assert.equal(isImageBuffer(Buffer.from('GIF89a')), false)
  assert.equal(isImageBuffer(Buffer.alloc(0)), false)
  assert.equal(isImageBuffer('not a buffer'), false)
})

test('topper schemas accept URL-only JSON and multipart booleans', () => {
  const createResult = createSchema.safeParse({
    name: 'A Student',
    photoUrl: 'https://example.com/student.jpg',
    className: '10',
    board: 'CBSE',
    session: '2025-26',
    percentage: '95',
    isPublished: 'false',
  })

  assert.equal(createResult.success, true)
  assert.equal(createResult.data.photoUrl, 'https://example.com/student.jpg')
  assert.equal(createResult.data.isPublished, false)

  const updateResult = updateSchema.safeParse({ isPublished: 'true' })

  assert.equal(updateResult.success, true)
  assert.equal(updateResult.data.isPublished, true)
  assert.equal(updateResult.data.photoUrl, undefined)
})

test('selectPhotoUrl gives an uploaded file precedence over a URL', () => {
  const uploaded = { secure_url: 'https://res.cloudinary.com/elc/new.jpg' }

  assert.equal(
    selectPhotoUrl(uploaded, 'https://example.com/old.jpg'),
    uploaded.secure_url,
  )
  assert.equal(
    selectPhotoUrl(null, 'https://example.com/old.jpg'),
    'https://example.com/old.jpg',
  )
  assert.equal(selectPhotoUrl(null, ''), '')
})

test('admin role gate allows administrators and rejects other roles', async () => {
  const app = express()

  app.use((req, res, next) => {
    req.user = req.headers['x-role']
      ? { role: req.headers['x-role'] }
      : undefined
    next()
  })
  app.get('/admin', allowRoles('admin'), (req, res) => {
    res.json({ success: true })
  })

  const { server, baseUrl } = await listen(app)

  try {
    const adminResponse = await fetch(`${baseUrl}/admin`, {
      headers: { 'x-role': 'admin' },
    })
    const teacherResponse = await fetch(`${baseUrl}/admin`, {
      headers: { 'x-role': 'teacher' },
    })

    assert.equal(adminResponse.status, 200)
    assert.equal(teacherResponse.status, 403)
  } finally {
    await close(server)
  }
})

test('topper upload route rejects unauthenticated requests', async () => {
  const app = express()
  app.use('/api/v1/toppers', topperRoutes)

  const { server, baseUrl } = await listen(app)

  try {
    const response = await fetch(`${baseUrl}/api/v1/toppers`, {
      method: 'POST',
      body: photoForm(jpegBytes, 'student.jpg', 'image/jpeg'),
    })
    const result = await response.json()

    assert.equal(response.status, 401)
    assert.equal(result.success, false)
  } finally {
    await close(server)
  }
})

test('photo middleware accepts JPEG/PNG and keeps JSON requests working', async () => {
  const app = express()
  app.use(express.json({ limit: '10kb' }))
  app.post('/upload', uploadTopperPhoto, (req, res) => {
    res.json({
      success: true,
      body: req.body,
      file: req.file
        ? {
            originalname: req.file.originalname,
            size: req.file.size,
          }
        : null,
    })
  })

  const { server, baseUrl } = await listen(app)

  try {
    const jpegResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: photoForm(jpegBytes, 'student.jpg', 'image/jpeg'),
    })
    const jpegResult = await jpegResponse.json()

    assert.equal(jpegResponse.status, 200)
    assert.equal(jpegResult.file.originalname, 'student.jpg')

    const pngResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: photoForm(pngBytes, 'student.png', 'image/png'),
    })

    assert.equal(pngResponse.status, 200)

    const jsonResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl: 'https://example.com/student.jpg' }),
    })
    const jsonResult = await jsonResponse.json()

    assert.equal(jsonResponse.status, 200)
    assert.equal(jsonResult.file, null)
    assert.equal(
      jsonResult.body.photoUrl,
      'https://example.com/student.jpg',
    )
  } finally {
    await close(server)
  }
})

test('photo middleware rejects invalid content, other formats, and oversized files', async () => {
  const app = express()
  app.post('/upload', uploadTopperPhoto, (req, res) => {
    res.json({ success: true })
  })

  const { server, baseUrl } = await listen(app)

  try {
    const disguisedResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: photoForm(
        Buffer.from('<html>not an image</html>'),
        'student.png',
        'image/png',
      ),
    })
    const disguisedResult = await disguisedResponse.json()

    assert.equal(disguisedResponse.status, 400)
    assert.match(disguisedResult.message, /valid JPEG or PNG/)

    const gifResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: photoForm(Buffer.from('GIF89a'), 'student.gif', 'image/gif'),
    })
    const gifResult = await gifResponse.json()

    assert.equal(gifResponse.status, 400)
    assert.match(gifResult.message, /Only JPEG and PNG/)

    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1)
    pngBytes.copy(oversized)

    const oversizedResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: photoForm(oversized, 'student.png', 'image/png'),
    })
    const oversizedResult = await oversizedResponse.json()

    assert.equal(oversizedResponse.status, 400)
    assert.match(oversizedResult.message, /5 MB/)
  } finally {
    await close(server)
  }
})

test('Cloudinary image upload rejects failures and insecure URLs', async () => {
  const originalUploadStream = cloudinary.uploader.upload_stream

  try {
    cloudinary.uploader.upload_stream = (options, callback) => {
      callback(new Error('Cloudinary unavailable'))
      return { end() {} }
    }

    await assert.rejects(
      uploadTopperPhotoToCloudinary({ buffer: jpegBytes }),
      /photo could not be uploaded/,
    )

    cloudinary.uploader.upload_stream = (options, callback) => {
      callback(null, {
        public_id: options.public_id,
        secure_url: 'http://res.cloudinary.com/elc/photo.jpg',
      })
      return { end() {} }
    }

    await assert.rejects(
      uploadTopperPhotoToCloudinary({ buffer: jpegBytes }),
      /uploaded securely/,
    )
  } finally {
    cloudinary.uploader.upload_stream = originalUploadStream
  }
})


const adminId = '507f1f77bcf86cd799439011'
const testJwtSecret = 'topper-photo-tests-secret-at-least-32-characters'

function authorizedTopperApp(token) {
  const app = express()

  app.use(express.json({ limit: '10kb' }))
  app.use((req, res, next) => {
    req.cookies = { elc_token: token }
    next()
  })
  app.use('/api/v1/toppers', topperRoutes)
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)

    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    })
  })

  return app
}

function createAdminToken() {
  return jwt.sign({ sub: adminId }, testJwtSecret, {
    algorithm: 'HS256',
  })
}

function createForm(values, photo = null) {
  const form = new FormData()

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      form.append(key, String(value))
    }
  }

  if (photo) {
    form.append('photo', new Blob([photo.buffer], { type: photo.type }), photo.name)
  }

  return form
}

test('authorized multipart request creates a topper with a secure upload URL', async () => {
  const originalSecret = process.env.JWT_SECRET
  const originalUserFindById = User.findById
  const originalTopperCreate = Topper.create
  const originalUploadStream = cloudinary.uploader.upload_stream
  let server
  let created

  process.env.JWT_SECRET = testJwtSecret

  try {
    User.findById = async () => ({
      _id: adminId,
      role: 'admin',
      status: 'active',
    })
    Topper.create = async (document) => {
      created = document
      return {
        _id: 'topper-1',
        ...document,
        toObject() {
          return { _id: 'topper-1', ...document }
        },
      }
    }
    cloudinary.uploader.upload_stream = (options, callback) => {
      callback(null, {
        public_id: options.public_id,
        secure_url:
          'https://res.cloudinary.com/elc/image/upload/topper-photo.jpg',
      })
      return { end() {} }
    }

    const app = authorizedTopperApp(createAdminToken())
    const listening = await listen(app)
    server = listening.server

    const response = await fetch(
      `${listening.baseUrl}/api/v1/toppers`,
      {
        method: 'POST',
        body: createForm(
          {
            name: 'A Student',
            className: '10',
            board: 'CBSE',
            session: '2025-26',
            percentage: 95,
            photoUrl: 'https://example.com/old.jpg',
            isPublished: false,
          },
          {
            buffer: pngBytes,
            name: 'student.png',
            type: 'image/png',
          },
        ),
      },
    )
    const result = await response.json()

    assert.equal(response.status, 201)
    assert.equal(result.success, true)
    assert.equal(
      created.photoUrl,
      'https://res.cloudinary.com/elc/image/upload/topper-photo.jpg',
    )
    assert.equal(created.marks, 95)
    assert.equal(created.totalMarks, 100)
    assert.equal('cloudinaryPublicId' in created, false)
  } finally {
    if (server) await close(server)
    User.findById = originalUserFindById
    Topper.create = originalTopperCreate
    cloudinary.uploader.upload_stream = originalUploadStream

    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET
    } else {
      process.env.JWT_SECRET = originalSecret
    }
  }
})

test('authorized edits keep, replace, and remove a topper photo', async () => {
  const originalSecret = process.env.JWT_SECRET
  const originalUserFindById = User.findById
  const originalTopperFindById = Topper.findById
  const originalUploadStream = cloudinary.uploader.upload_stream
  let server
  let saveCount = 0

  process.env.JWT_SECRET = testJwtSecret

  try {
    const topper = {
      _id: adminId,
      name: 'A Student',
      photoUrl: 'https://example.com/current.jpg',
      className: '10',
      board: 'CBSE',
      session: '2025-26',
      marks: 95,
      totalMarks: 100,
      percentage: 95,
      rank: 1,
      description: '',
      isPublished: false,
      async save() {
        saveCount += 1
      },
      toObject() {
        return { ...this }
      },
    }

    User.findById = async () => ({
      _id: adminId,
      role: 'admin',
      status: 'active',
    })
    Topper.findById = async () => topper
    cloudinary.uploader.upload_stream = (options, callback) => {
      callback(null, {
        public_id: options.public_id,
        secure_url:
          'https://res.cloudinary.com/elc/image/upload/replacement.jpg',
      })
      return { end() {} }
    }

    const app = authorizedTopperApp(createAdminToken())
    const listening = await listen(app)
    server = listening.server
    const endpoint = `${listening.baseUrl}/api/v1/toppers/${adminId}`

    const keepResponse = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: true }),
    })

    assert.equal(keepResponse.status, 200)
    assert.equal(topper.photoUrl, 'https://example.com/current.jpg')
    assert.equal(topper.isPublished, true)

    const unpublishResponse = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: false }),
    })

    assert.equal(unpublishResponse.status, 200)
    assert.equal(topper.isPublished, false)

    const replaceResponse = await fetch(endpoint, {
      method: 'PATCH',
      body: createForm(
        { name: 'Updated Student' },
        {
          buffer: jpegBytes,
          name: 'replacement.jpg',
          type: 'image/jpeg',
        },
      ),
    })

    assert.equal(replaceResponse.status, 200)
    assert.equal(topper.name, 'Updated Student')
    assert.equal(
      topper.photoUrl,
      'https://res.cloudinary.com/elc/image/upload/replacement.jpg',
    )

    const urlResponse = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoUrl: 'https://example.com/external.jpg',
      }),
    })

    assert.equal(urlResponse.status, 200)
    assert.equal(
      topper.photoUrl,
      'https://example.com/external.jpg',
    )

    const removeResponse = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl: '' }),
    })

    assert.equal(removeResponse.status, 200)
    assert.equal(topper.photoUrl, '')
    assert.equal(saveCount, 5)
  } finally {
    if (server) await close(server)
    User.findById = originalUserFindById
    Topper.findById = originalTopperFindById
    cloudinary.uploader.upload_stream = originalUploadStream

    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET
    } else {
      process.env.JWT_SECRET = originalSecret
    }
  }
})

test('public topper route reads only published records without authentication', async () => {
  const originalTopperFind = Topper.find
  let capturedFilter

  try {
    Topper.find = (filter) => {
      capturedFilter = filter

      return {
        select() {
          return this
        },
        sort() {
          return this
        },
        limit() {
          return this
        },
        async lean() {
          return [
            {
              _id: adminId,
              name: 'Published Student',
              photoUrl: '',
              className: '10',
              board: 'CBSE',
              session: '2025-26',
              marks: 95,
              totalMarks: 100,
              percentage: 95,
              rank: 1,
              description: '',
              isPublished: true,
            },
          ]
        },
      }
    }

    const app = express()
    app.use('/api/v1/toppers', topperRoutes)

    const { server, baseUrl } = await listen(app)

    try {
      const response = await fetch(`${baseUrl}/api/v1/toppers`)
      const result = await response.json()

      assert.equal(response.status, 200)
      assert.deepEqual(capturedFilter, { isPublished: true })
      assert.equal(result.count, 1)
      assert.equal(result.data[0].id, adminId)
      assert.equal(result.data[0].isPublished, true)
    } finally {
      await close(server)
    }
  } finally {
    Topper.find = originalTopperFind
  }
})

test('authorized delete removes a topper and rejects malformed IDs', async () => {
  const originalSecret = process.env.JWT_SECRET
  const originalUserFindById = User.findById
  const originalFindByIdAndDelete = Topper.findByIdAndDelete
  let deletedId = ''
  let server

  process.env.JWT_SECRET = testJwtSecret

  try {
    User.findById = async () => ({
      _id: adminId,
      role: 'admin',
      status: 'active',
    })
    Topper.findByIdAndDelete = async (id) => {
      deletedId = id
      return { _id: id }
    }

    const app = authorizedTopperApp(createAdminToken())
    const listening = await listen(app)
    server = listening.server

    const response = await fetch(
      `${listening.baseUrl}/api/v1/toppers/${adminId}`,
      { method: 'DELETE' },
    )
    const result = await response.json()

    assert.equal(response.status, 200)
    assert.equal(result.success, true)
    assert.equal(result.data.id, adminId)
    assert.equal(deletedId, adminId)

    const invalidResponse = await fetch(
      `${listening.baseUrl}/api/v1/toppers/not-a-valid-id`,
      { method: 'DELETE' },
    )
    const invalidResult = await invalidResponse.json()

    assert.equal(invalidResponse.status, 400)
    assert.equal(invalidResult.success, false)
  } finally {
    if (server) await close(server)
    User.findById = originalUserFindById
    Topper.findByIdAndDelete = originalFindByIdAndDelete

    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET
    } else {
      process.env.JWT_SECRET = originalSecret
    }
  }
})
