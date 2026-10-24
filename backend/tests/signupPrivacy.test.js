import assert from 'node:assert/strict'
import test from 'node:test'

import { signup } from '../controllers/authController.js'
import User from '../models/User.js'

function makeRequest(email = 'student@example.com') {
  return {
    body: {
      name: 'Student One',
      email,
      password: 'StrongPass123!',
      role: 'student',
    },
  }
}

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('signup returns the same response for an existing email', async (t) => {
  const originalExists = User.exists
  const originalCreate = User.create
  let created = false

  t.after(() => {
    User.exists = originalExists
    User.create = originalCreate
  })

  User.exists = async () => ({ _id: 'existing' })
  User.create = async () => {
    created = true
    return {}
  }

  const res = mockResponse()
  const next = () => {}

  await signup(makeRequest(), res, next)

  assert.equal(created, false)
  assert.equal(res.statusCode, 201)
  assert.equal(res.body.success, true)
  assert.equal('user' in res.body, false)
  assert.match(res.body.message, /If the email is not already registered/)
})

test('signup creates a pending account without returning user data', async (t) => {
  const originalExists = User.exists
  const originalCreate = User.create
  let created

  t.after(() => {
    User.exists = originalExists
    User.create = originalCreate
  })

  User.exists = async () => null
  User.create = async (data) => {
    created = data
    return { _id: 'new-user', ...data }
  }

  const res = mockResponse()
  const next = () => {}

  await signup(makeRequest(), res, next)

  assert.equal(res.statusCode, 201)
  assert.equal(created.email, 'student@example.com')
  assert.equal(created.role, 'student')
  assert.equal(created.status, 'pending')
  assert.match(created.password, /^\$2[aby]\$/)
  assert.equal('user' in res.body, false)
})
