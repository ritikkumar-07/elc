import assert from 'node:assert/strict'
import test from 'node:test'

import {
  publishResults,
  unpublishResults,
} from '../controllers/testController.js'
import Mark from '../models/Mark.js'
import Test from '../models/Test.js'
import User from '../models/User.js'

const adminId = '507f1f77bcf86cd799439011'
const testId = '507f1f77bcf86cd799439012'
const studentId = '507f1f77bcf86cd799439013'
const classId = '507f1f77bcf86cd799439014'

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

function mockNext() {
  const next = (error) => {
    next.called = true
    next.error = error
  }

  next.called = false
  return next
}

function makeRequest() {
  return {
    params: { id: testId },
    user: { _id: adminId, role: 'admin' },
  }
}

function makeTest(overrides = {}) {
  return {
    _id: testId,
    class: classId,
    status: 'published',
    maxMarks: 100,
    passingMarks: 33,
    resultsPublishedAt: null,
    resultsPublishedBy: null,
    ...overrides,
  }
}

function userQuery(students) {
  return {
    select() {
      return this
    },
    async lean() {
      return students
    },
  }
}

test('publish results claims the test before atomically publishing marks', async (t) => {
  const originalFindById = Test.findById
  const originalFindOneAndUpdate = Test.findOneAndUpdate
  const originalMarkFind = Mark.find
  const originalUpdateMany = Mark.updateMany
  const originalUserFind = User.find
  let claimFilter
  let claimUpdate
  let markFilter
  let markPipeline

  t.after(() => {
    Test.findById = originalFindById
    Test.findOneAndUpdate = originalFindOneAndUpdate
    Mark.find = originalMarkFind
    Mark.updateMany = originalUpdateMany
    User.find = originalUserFind
  })

  Test.findById = async () => makeTest()
  Test.findOneAndUpdate = (filter, update) => {
    claimFilter = filter
    claimUpdate = update
    return { async lean() { return makeTest({ status: 'closed' }) } }
  }
  Mark.find = async () => [
    {
      student: studentId,
      marksObtained: 80,
      maxMarks: 100,
      assessmentStatus: 'entered',
      status: 'draft',
      history: [],
    },
  ]
  Mark.updateMany = async (filter, pipeline) => {
    markFilter = filter
    markPipeline = pipeline
    return { modifiedCount: 1 }
  }
  User.find = () => userQuery([{ _id: studentId }])

  const res = mockResponse()
  const next = mockNext()

  await publishResults(makeRequest(), res, next)

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.success, true)
  assert.deepEqual(claimFilter, {
    _id: testId,
    resultsPublishedAt: null,
  })
  assert.equal(claimUpdate.$set.status, 'closed')
  assert.equal(markFilter.status.$ne, 'published')
  assert.equal(markPipeline[0].$set.status, 'published')
  assert.equal(
    markPipeline[0].$set.history.$concatArrays[1][0].action,
    'published',
  )
})

test('publish results rejects a concurrent state change without touching marks', async (t) => {
  const originalFindById = Test.findById
  const originalFindOneAndUpdate = Test.findOneAndUpdate
  const originalMarkFind = Mark.find
  const originalUpdateMany = Mark.updateMany
  const originalUserFind = User.find
  let marksUpdated = false

  t.after(() => {
    Test.findById = originalFindById
    Test.findOneAndUpdate = originalFindOneAndUpdate
    Mark.find = originalMarkFind
    Mark.updateMany = originalUpdateMany
    User.find = originalUserFind
  })

  Test.findById = async () => makeTest()
  Test.findOneAndUpdate = () => ({
    async lean() {
      return null
    },
  })
  Mark.find = async () => [
    {
      student: studentId,
      marksObtained: 80,
      maxMarks: 100,
      assessmentStatus: 'entered',
      status: 'draft',
      history: [],
    },
  ]
  Mark.updateMany = async () => {
    marksUpdated = true
  }
  User.find = () => userQuery([{ _id: studentId }])

  const res = mockResponse()
  const next = mockNext()

  await publishResults(makeRequest(), res, next)

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 409)
  assert.equal(marksUpdated, false)
})

test('unpublish results conditionally drafts published marks', async (t) => {
  const originalFindById = Test.findById
  const originalFindOneAndUpdate = Test.findOneAndUpdate
  const originalUpdateMany = Mark.updateMany
  let markPipeline

  t.after(() => {
    Test.findById = originalFindById
    Test.findOneAndUpdate = originalFindOneAndUpdate
    Mark.updateMany = originalUpdateMany
  })

  Test.findById = async () =>
    makeTest({
      status: 'closed',
      resultsPublishedAt: new Date('2026-10-01T00:00:00.000Z'),
      resultsPublishedBy: adminId,
    })
  Test.findOneAndUpdate = () => ({
    async lean() {
      return makeTest({ status: 'published' })
    },
  })
  Mark.updateMany = async (filter, pipeline) => {
    markPipeline = pipeline
    return { modifiedCount: 2 }
  }

  const res = mockResponse()
  const next = mockNext()

  await unpublishResults(makeRequest(), res, next)

  assert.equal(next.called, false)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.data.unpublished, 2)
  assert.equal(markPipeline[0].$set.status, 'draft')
  assert.equal(
    markPipeline[0].$set.history.$concatArrays[1][0].action,
    'unpublished',
  )
})

test('publish results rolls the test back when mark publication fails', async (t) => {
  const originalFindById = Test.findById
  const originalFindOneAndUpdate = Test.findOneAndUpdate
  const originalMarkFind = Mark.find
  const originalUpdateMany = Mark.updateMany
  const originalUserFind = User.find
  const originalTestUpdateOne = Test.updateOne
  let rollbackUpdate

  t.after(() => {
    Test.findById = originalFindById
    Test.findOneAndUpdate = originalFindOneAndUpdate
    Mark.find = originalMarkFind
    Mark.updateMany = originalUpdateMany
    User.find = originalUserFind
    Test.updateOne = originalTestUpdateOne
  })

  Test.findById = async () =>
    makeTest({ status: 'draft', resultsPublishedAt: null })
  Test.findOneAndUpdate = () => ({
    async lean() {
      return makeTest({ status: 'closed' })
    },
  })
  Mark.find = async () => [
    {
      student: studentId,
      marksObtained: 80,
      maxMarks: 100,
      assessmentStatus: 'entered',
      status: 'draft',
      history: [],
    },
  ]
  Mark.updateMany = async () => {
    throw new Error('write failed')
  }
  User.find = () => userQuery([{ _id: studentId }])
  Test.updateOne = async (filter, update) => {
    rollbackUpdate = update
  }

  const res = mockResponse()
  const next = mockNext()

  await publishResults(makeRequest(), res, next)

  assert.equal(next.called, true)
  assert.match(next.error.message, /write failed/)
  assert.equal(rollbackUpdate.$set.status, 'draft')
  assert.equal(rollbackUpdate.$set.resultsPublishedAt, null)
})
